/**
 * Who can act on this organization, and where that authority comes from.
 *
 * The inverse of `verifyAncestorAccess`. Implicit inheritance is the most
 * powerful rule in the model and the least visible one: a user with ADMIN or
 * OWNER in any ancestor org has that authority over every descendant, with no
 * membership row in the descendant to show for it. Until now nobody could
 * answer "why does this person have access?" without reading source.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { requireAdmin } from '@/lib/require-admin';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { orgId: string } }) {
  const auth = await requireAdmin('system_admin_portal:organizations:read');
  if (!auth.ok) return auth.error;

  const org = await prisma.organization.findUnique({
    where: { id: params.orgId },
    select: { id: true, name: true },
  });
  if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

  const ancestors = await prisma.organizationAncestry.findMany({
    where: { descendantId: params.orgId, depth: { gt: 0 } },
    select: { ancestorId: true, depth: true },
    orderBy: { depth: 'asc' },
  });
  const depthByOrg = new Map(ancestors.map((a) => [a.ancestorId, a.depth]));

  const members = await prisma.organizationMember.findMany({
    where: { organizationId: { in: [params.orgId, ...ancestors.map((a) => a.ancestorId)] } },
    include: {
      user: { select: { id: true, name: true, email: true, suspendedAt: true, deletedAt: true } },
      organization: { select: { id: true, name: true } },
    },
  });

  // MEMBER does not inherit downward — only ADMIN and OWNER do. A MEMBER of an
  // ancestor has no authority here, and saying so is as useful as listing those
  // who do.
  const entries = members
    .filter((m) => {
      const isDirect = m.organizationId === params.orgId;
      return isDirect || m.role === 'ADMIN' || m.role === 'OWNER';
    })
    .map((m) => {
      const isDirect = m.organizationId === params.orgId;
      return {
        userId: m.userId,
        name: m.user.name,
        email: m.user.email,
        active: !m.user.suspendedAt && !m.user.deletedAt,
        role: m.role,
        source: isDirect ? ('DIRECT' as const) : ('INHERITED' as const),
        viaOrgId: m.organization.id,
        viaOrgName: m.organization.name,
        depth: isDirect ? 0 : (depthByOrg.get(m.organizationId) ?? 0),
      };
    })
    // Direct membership first, then nearest ancestor.
    .sort((a, b) => a.depth - b.depth || a.email.localeCompare(b.email));

  return NextResponse.json({
    organization: org,
    total: entries.length,
    direct: entries.filter((e) => e.source === 'DIRECT').length,
    inherited: entries.filter((e) => e.source === 'INHERITED').length,
    entries,
  });
}
