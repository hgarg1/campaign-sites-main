import { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSessionUserFromToken } from '@/lib/session-auth';

export const metadata = {
  title: 'Admin Portal | CampaignSites',
  description: 'System administration dashboard for CampaignSites',
};

// Every admin page is gated on a verified session, so none of this tree may be
// statically rendered.
export const dynamic = 'force-dynamic';

/**
 * Server-side authorization boundary for the admin portal.
 *
 * Middleware also redirects unauthenticated requests, but it runs on the edge
 * runtime where the node:crypto HMAC that signs session tokens is unavailable —
 * so it can only inspect cookies, never verify them. This layout is a server
 * component with database access, which makes it the first point where the
 * session is actually proven. API routes verify independently via requireAdmin.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const user = await getSessionUserFromToken(cookieStore.get('campaignsites_session')?.value);

  if (!user || user.role !== 'GLOBAL_ADMIN') {
    redirect('/login');
  }

  return children;
}
