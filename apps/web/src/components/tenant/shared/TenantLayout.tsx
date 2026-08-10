'use client';

import { ReactNode, useEffect, useState } from 'react';
import { TenantNavigation } from './TenantNavigation';
import { TenantTopBar } from './TenantTopBar';
import { TenantThemeProvider } from './TenantThemeProvider';
import { ToastProvider } from '@/components/ui/toast';
import { SetupModal } from '@/components/tenant/SetupModal';

interface TenantLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  orgId: string;
}

function setupKey(orgId: string) {
  return `setup_done_${orgId}`;
}

export function TenantLayout({ children, title, subtitle, orgId }: TenantLayoutProps) {
  const [navOpen, setNavOpen] = useState(false);
  // Start as true if we already know setup is done (sessionStorage fast-path)
  const [setupDone, setSetupDone] = useState<boolean | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(setupKey(orgId)) === '1' ? true : null;
    }
    return null;
  });
  // Only OWNERs see the setup modal — non-owners can't submit it anyway
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    // Already confirmed done via sessionStorage — skip fetch
    if (setupDone === true) return;

    let active = true;
    globalThis
      .fetch(`/api/tenant/${orgId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active) return;
        const done = !!data?.setupCompletedAt;
        setSetupDone(done);
        setIsOwner(data?.userRole === 'OWNER');
        if (done) sessionStorage.setItem(setupKey(orgId), '1');
      })
      .catch(() => {
        if (active) setSetupDone(true);
      }); // fail open
    return () => {
      active = false;
    };
  }, [orgId]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSetupComplete() {
    sessionStorage.setItem(setupKey(orgId), '1');
    setSetupDone(true);
  }

  return (
    // Toasts are mounted here so tenant screens can report outcomes through the
    // same system the admin portal uses, instead of hand-rolled inline banners.
    <ToastProvider>
      {/* h-dscreen so mobile browser chrome does not clip the bottom of the shell. */}
      <div className="flex h-dscreen bg-gray-50">
        {setupDone === false && isOwner && (
          <SetupModal orgId={orgId} onComplete={handleSetupComplete} />
        )}
        <TenantThemeProvider orgId={orgId} />

        {/* Off-canvas below md. The sidebar was a fixed 264px in a flex row
            with no breakpoints, which left roughly 110px of content on a
            phone — and campaign staff vote from phones between events. */}
        <div
          className={`fixed inset-0 z-40 bg-black/40 md:hidden ${navOpen ? '' : 'hidden'}`}
          onClick={() => setNavOpen(false)}
          aria-hidden="true"
        />
        <div
          className={`fixed inset-y-0 left-0 z-40 transition-transform md:static md:translate-x-0 ${
            navOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <TenantNavigation orgId={orgId} onNavigate={() => setNavOpen(false)} />
        </div>

        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex items-center gap-2 border-b bg-white px-4 py-2 md:hidden">
            <button
              type="button"
              onClick={() => setNavOpen((v) => !v)}
              aria-expanded={navOpen}
              aria-label={navOpen ? 'Close navigation' : 'Open navigation'}
              className="rounded p-2 text-gray-600 hover:bg-gray-100"
            >
              <span aria-hidden="true">☰</span>
            </button>
            <span className="truncate text-sm font-medium text-gray-900">{title}</span>
          </div>

          <TenantTopBar title={title} subtitle={subtitle} orgId={orgId} />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
