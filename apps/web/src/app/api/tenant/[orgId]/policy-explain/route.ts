/**
 * What this organization is and is not allowed to do, and who decided.
 *
 * Distinct from `effective-restrictions`, which returns the machine-readable
 * rule set that the UI uses to disable controls. This one answers the human
 * question — which party imposed a restriction, and what reason they gave —
 * and is what the "what you can do" page renders.
 *
 * The policy engines already computed all of this and threw the provenance
 * away at the boundary — a tenant hit a 403 with no way to learn whether the
 * platform or a parent organization had restricted them, or why.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { getAuthUserId, verifyOrgAccess } from '@/app/api/tenant/auth-utils';
import { getOrgEffectivePolicy } from '@/lib/system-policy';
import { getEffectiveStatus } from '@/lib/ancestry';

export const dynamic = 'force-dynamic';

interface PolicyRule {
  resource: string;
  actions: string[];
  allow: boolean;
}

export async function GET(_req: NextRequest, { params }: { params: { orgId: string } }) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (!(await verifyOrgAccess(userId, params.orgId)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const [systemPolicy, inherited, effectiveStatus, org] = await Promise.all([
    getOrgEffectivePolicy(params.orgId).catch(() => ({ policies: [], merged: [] })),
    prisma.orgInheritedPolicy.findMany({
      where: { targetOrgId: params.orgId },
      include: { parentOrg: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    getEffectiveStatus(params.orgId),
    prisma.organization.findUnique({
      where: { id: params.orgId },
      select: { ownStatus: true, canCreateChildren: true, maxChildDepth: true },
    }),
  ]);

  // Grouped by who imposed it, because "you cannot do this" is only actionable
  // once you know who to ask.
  const sources = [
    {
      kind: 'PLATFORM' as const,
      label: 'Platform administrators',
      setBy: (systemPolicy.policies ?? []).map((p) => p.name).join(', ') || null,
      note: null as string | null,
      rules: ((systemPolicy.merged ?? []) as PolicyRule[]).filter((r) => !r.allow),
    },
    ...inherited.map((ip) => ({
      kind: 'PARENT' as const,
      label: ip.parentOrg.name,
      setBy: ip.parentOrg.name,
      // Exists precisely to explain the restriction, and was never displayed.
      note: ip.note,
      rules: (Array.isArray(ip.rules) ? (ip.rules as unknown as PolicyRule[]) : []).filter(
        (r) => !r.allow
      ),
    })),
  ].filter((s) => s.rules.length > 0);

  return NextResponse.json({
    sources,
    status: {
      own: org?.ownStatus ?? 'ACTIVE',
      effective: effectiveStatus,
      // An org can be ACTIVE itself yet suspended in practice by an ancestor.
      suspendedByAncestor: effectiveStatus !== 'ACTIVE' && org?.ownStatus === 'ACTIVE',
    },
    structure: {
      canCreateChildren: org?.canCreateChildren ?? false,
      maxChildDepth: org?.maxChildDepth ?? null,
    },
  });
}
