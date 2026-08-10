import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { isDatabaseEnabled } from '@/lib/runtime-config';
import { parseAndVerifySessionToken } from '@/lib/session-auth';
import { verifyOrgAccess } from '@/app/api/tenant/auth-utils';
import { resolveEffectiveTheme } from '@/lib/tenant-theme-server';

export const dynamic = 'force-dynamic';

async function getAuthUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('campaignsites_session')?.value;
  if (!sessionToken) return null;
  const parsed = parseAndVerifySessionToken(sessionToken);
  return parsed?.userId ?? null;
}

export async function GET(_req: NextRequest, { params }: { params: { orgId: string } }) {
  if (!isDatabaseEnabled()) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  // Auth: direct member, inherited access from an ancestor org, or GLOBAL_ADMIN.
  // Checking direct membership alone denied ancestor admins, who can reach every
  // other endpoint for this org — see verifyOrgAccess in ../../auth-utils.
  const member = await verifyOrgAccess(userId, params.orgId);

  if (!member) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (user?.role !== 'GLOBAL_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  try {
    /*
     * Resolution lives in `resolveEffectiveTheme` so this route and the tenant
     * layout cannot drift. The layout emits the same variables during render, and
     * two implementations of "which colour is this org" would eventually disagree
     * — producing a portal that changes colour on hydration.
     */
    const theme = await resolveEffectiveTheme(params.orgId);

    // Only this route needs the attribution, so it stays here.
    const org = await prisma.organization.findUnique({
      where: { id: params.orgId },
      select: { parent: { select: { name: true } } },
    });

    return NextResponse.json({ theme, inheritedFrom: org?.parent?.name ?? null });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
