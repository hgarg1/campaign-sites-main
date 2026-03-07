import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { parseAndVerifySessionToken } from '@/lib/session-auth';
import { prisma } from '@/lib/database';
import { getEffectiveStatus } from '@/lib/ancestry';

export const metadata = { title: 'Tenant Portal | CampaignSites' };

export default async function TenantPortalLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { id: string };
}) {
  // Verify session
  const cookieStore = await cookies();
  const sessionToken =
    cookieStore.get('campaignsites_session')?.value ||
    cookieStore.get('token')?.value;

  if (!sessionToken) {
    redirect('/login');
  }

  const parsed = parseAndVerifySessionToken(sessionToken);
  if (!parsed?.userId) {
    redirect('/login');
  }

  // Check org exists and user has access (direct or ancestor)
  const org = await prisma.organization.findUnique({
    where: { id: params.id },
    select: { id: true, ownStatus: true },
  }).catch(() => null);

  if (!org) {
    redirect('/tenant-chooser');
  }

  // Effective status check — redirect to suspension page if suspended/deactivated
  try {
    const effectiveStatus = await getEffectiveStatus(params.id);
    if (effectiveStatus === 'SUSPENDED' || effectiveStatus === 'DEACTIVATED') {
      redirect('/tenant/suspended');
    }
  } catch {
    // If ancestry check fails, allow through — better to show content than block
  }

  return <>{children}</>;
}
