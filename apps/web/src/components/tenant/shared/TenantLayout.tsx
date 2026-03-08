'use client';

import { ReactNode, useEffect, useState } from 'react';
import { TenantNavigation } from './TenantNavigation';
import { TenantTopBar } from './TenantTopBar';
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
  // Start as true if we already know setup is done (sessionStorage fast-path)
  const [setupDone, setSetupDone] = useState<boolean | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(setupKey(orgId)) === '1' ? true : null;
    }
    return null;
  });

  useEffect(() => {
    // Already confirmed done via sessionStorage — skip fetch
    if (setupDone === true) return;

    let active = true;
    globalThis.fetch(`/api/tenant/${orgId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!active) return;
        const done = !!(data?.setupCompletedAt);
        setSetupDone(done);
        if (done) sessionStorage.setItem(setupKey(orgId), '1');
      })
      .catch(() => { if (active) setSetupDone(true); }); // fail open
    return () => { active = false; };
  }, [orgId]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSetupComplete() {
    sessionStorage.setItem(setupKey(orgId), '1');
    setSetupDone(true);
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {setupDone === false && (
        <SetupModal orgId={orgId} onComplete={handleSetupComplete} />
      )}
      <TenantNavigation orgId={orgId} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TenantTopBar title={title} subtitle={subtitle} orgId={orgId} />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-6 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
