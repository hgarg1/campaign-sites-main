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

export function TenantLayout({ children, title, subtitle, orgId }: TenantLayoutProps) {
  const [setupDone, setSetupDone] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    globalThis.fetch(`/api/tenant/${orgId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (active && data) {
          setSetupDone(data.setupCompletedAt !== null && data.setupCompletedAt !== undefined);
        } else if (active) {
          setSetupDone(true); // fail open
        }
      })
      .catch(() => { if (active) setSetupDone(true); });
    return () => { active = false; };
  }, [orgId]);

  return (
    <div className="flex h-screen bg-gray-50">
      {setupDone === false && (
        <SetupModal orgId={orgId} onComplete={() => setSetupDone(true)} />
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
