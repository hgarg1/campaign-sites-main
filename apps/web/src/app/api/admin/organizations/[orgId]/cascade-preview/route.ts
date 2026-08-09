/**
 * What a suspend, deactivate or reactivate would actually touch.
 *
 * Status cascades reach every descendant, and were confirmed blind — an
 * operator saw "Are you sure?" with no indication that it would take 40 other
 * organizations down with it.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { requireAdmin } from '@/lib/require-admin';
import { getDescendantIds } from '@/lib/ancestry';

export const dynamic = 'force-dynamic';

type Action = 'SUSPEND' | 'DEACTIVATE' | 'REACTIVATE';

export async function GET(req: NextRequest, { params }: { params: { orgId: string } }) {
  const auth = await requireAdmin('system_admin_portal:organizations:read');
  if (!auth.ok) return auth.error;

  const action = (req.nextUrl.searchParams.get('action') ?? 'SUSPEND') as Action;

  const org = await prisma.organization.findUnique({
    where: { id: params.orgId },
    select: { id: true, name: true, ownStatus: true },
  });
  if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

  const descendantIds = await getDescendantIds(params.orgId);
  const descendants = await prisma.organization.findMany({
    where: { id: { in: descendantIds } },
    select: { id: true, name: true, ownStatus: true, suspendedByOrgId: true },
    orderBy: { name: 'asc' },
  });

  // Mirrors the engine's own where-clauses, so the preview cannot promise
  // something different from what executes.
  const affected =
    action === 'SUSPEND'
      ? descendants.filter((d) => d.ownStatus === 'ACTIVE')
      : action === 'DEACTIVATE'
        ? descendants.filter((d) => d.ownStatus !== 'DEACTIVATED')
        : descendants.filter((d) => d.suspendedByOrgId === params.orgId);

  const untouched = descendants.filter((d) => !affected.some((a) => a.id === d.id));

  return NextResponse.json({
    organization: org,
    action,
    descendantCount: descendants.length,
    affected: affected.map((d) => ({ id: d.id, name: d.name, status: d.ownStatus })),
    // Named explicitly, because "why did that one not change?" is the next
    // question an operator asks.
    untouched: untouched.map((d) => ({
      id: d.id,
      name: d.name,
      status: d.ownStatus,
      reason:
        action === 'REACTIVATE'
          ? 'Suspended by a different organization, so this cannot restore it'
          : `Already ${d.ownStatus.toLowerCase()}`,
    })),
  });
}
