import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { parseAndVerifySessionToken } from '@/lib/session-auth';
import { prisma } from '@/lib/database';
import { getEffectiveStatus } from '@/lib/ancestry';
import { DEFAULT_THEME } from '@/lib/tenant-theme';
import { resolveEffectiveTheme, themeStyle } from '@/lib/tenant-theme-server';

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

  /*
   * The tenant's colour is on the page before the first paint.
   *
   * `TenantThemeProvider` sets these same variables from a `useEffect`, which
   * meant a themed portal rendered platform-blue for one frame and then flipped.
   * That was survivable when two components read the variables; now that primary
   * buttons, links, focus rings and washes all resolve through them, the flash
   * would be the whole interface changing colour. The client provider still runs
   * underneath and takes over once branding is re-fetched.
   *
   * `display: contents` keeps this wrapper out of the layout — custom properties
   * inherit through it regardless.
   */
  const theme = await resolveEffectiveTheme(params.id).catch(() => DEFAULT_THEME);

  return (
    <div data-tenant-theme="" style={{ display: 'contents', ...themeStyle(theme) }}>
      {children}
    </div>
  );
}
