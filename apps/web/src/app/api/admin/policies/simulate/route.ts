/**
 * Answers "would this organization be allowed to do this, and who decides?"
 *
 * Policy debugging was previously trial and error against live 403s. Both
 * engines already return the deciding layer and the matching rule; this simply
 * runs them and keeps the answer instead of discarding it at the boundary.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { requireAdmin } from '@/lib/require-admin';
import { checkSystemPolicy, getOrgEffectivePolicy } from '@/lib/system-policy';
import { checkOrgPolicy } from '@/lib/org-policy';
import { getEffectiveStatus } from '@/lib/ancestry';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = await requireAdmin('system_admin_portal:policies:read');
  if (!auth.ok) return auth.error;

  const { orgId, resource, action } = (await req.json().catch(() => ({}))) as {
    orgId?: string;
    resource?: string;
    action?: string;
  };

  if (!orgId || !resource || !action) {
    return NextResponse.json(
      { error: 'orgId, resource and action are all required' },
      { status: 400 }
    );
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true, ownStatus: true },
  });
  if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

  // Evaluated in the same order the request path uses, so the simulator cannot
  // disagree with what actually happens.
  const effectiveStatus = await getEffectiveStatus(orgId);
  const system = await checkSystemPolicy(orgId, resource, action);
  const parent = system.allowed
    ? await checkOrgPolicy(orgId, resource, action)
    : { allowed: true, reason: undefined, source: undefined };

  const gates = [
    {
      name: 'Organization status',
      passed: effectiveStatus === 'ACTIVE',
      detail:
        effectiveStatus === 'ACTIVE'
          ? 'Active'
          : `Effective status is ${effectiveStatus}${
              org.ownStatus === 'ACTIVE' ? ', inherited from an ancestor' : ''
            }`,
    },
    {
      name: 'Platform policy',
      passed: system.allowed,
      detail: system.allowed
        ? 'No platform policy blocks this'
        : (system.reason ?? 'Blocked by platform policy'),
      policyId: system.policyId ?? null,
      policyName: system.policyName ?? null,
    },
    {
      name: 'Parent organization policy',
      passed: parent.allowed,
      detail: !system.allowed
        ? 'Not evaluated — the platform already blocked it'
        : parent.allowed
          ? 'No parent organization blocks this'
          : (parent.reason ?? 'Blocked by a parent organization'),
      source: parent.source ?? null,
    },
  ];

  const firstFailure = gates.find((g) => !g.passed) ?? null;

  // The full rule set, so an operator can see what else is in force rather than
  // only the rule that happened to match.
  const effective = await getOrgEffectivePolicy(orgId).catch(() => ({ policies: [], merged: [] }));

  return NextResponse.json({
    organization: org,
    query: { resource, action },
    allowed: !firstFailure,
    decidedBy: firstFailure?.name ?? null,
    gates,
    effectiveRules: effective.merged ?? [],
    appliedPolicies: (effective.policies ?? []).map((p) => ({ id: p.id, name: p.name })),
  });
}
