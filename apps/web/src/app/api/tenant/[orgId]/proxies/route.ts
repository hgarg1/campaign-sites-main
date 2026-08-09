/**
 * Voting proxies held on behalf of this organization.
 *
 * GET    — list live and historic proxies
 * POST   — grant a proxy to one named user
 * DELETE — revoke a proxy (prospective only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { GovernanceActionType } from '@prisma/client';
import {
  getAuthUserId,
  verifyOrgAdmin,
  verifyOrgOwner,
  writeAuditLog,
} from '@/app/api/tenant/auth-utils';
import { grantProxy, revokeProxy } from '@/lib/governance-proxy';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { orgId: string } }) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (!(await verifyOrgAdmin(userId, params.orgId)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const proxies = await prisma.governanceProxy.findMany({
    where: { principalOrgId: params.orgId },
    orderBy: [{ revokedAt: 'asc' }, { grantedAt: 'desc' }],
    include: {
      proxyUser: { select: { id: true, name: true, email: true } },
    },
  });

  const now = new Date();
  return NextResponse.json({
    data: proxies.map((p) => ({
      ...p,
      live: !p.revokedAt && p.expiresAt > now,
    })),
  });
}

export async function POST(req: NextRequest, { params }: { params: { orgId: string } }) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  // OWNER, not ADMIN: handing the organization's vote to someone is an
  // ownership decision, not day-to-day administration.
  if (!(await verifyOrgOwner(userId, params.orgId)))
    return NextResponse.json(
      { error: 'Only an owner may delegate this organization’s vote' },
      { status: 403 }
    );

  const body = await req.json().catch(() => ({}));
  const { proxyUserId, expiresAt, scopeChildOrgId, scopeActionType, exclusive, note } = body as {
    proxyUserId?: string;
    expiresAt?: string;
    scopeChildOrgId?: string | null;
    scopeActionType?: GovernanceActionType | null;
    exclusive?: boolean;
    note?: string;
  };

  if (!proxyUserId || !expiresAt) {
    return NextResponse.json({ error: 'proxyUserId and expiresAt are required' }, { status: 400 });
  }

  const expiry = new Date(expiresAt);
  if (Number.isNaN(expiry.getTime())) {
    return NextResponse.json({ error: 'expiresAt is not a valid date' }, { status: 400 });
  }

  try {
    const proxy = await grantProxy({
      principalOrgId: params.orgId,
      proxyUserId,
      grantedByUserId: userId,
      expiresAt: expiry,
      scopeChildOrgId: scopeChildOrgId ?? null,
      scopeActionType: scopeActionType ?? null,
      exclusive: exclusive ?? false,
      note,
    });

    await writeAuditLog({
      orgId: params.orgId,
      actorUserId: userId,
      action: 'governance.proxy_grant',
      targetUserId: proxyUserId,
      extra: {
        proxyId: proxy.id,
        scopeChildOrgId: scopeChildOrgId ?? null,
        scopeActionType: scopeActionType ?? null,
        exclusive: exclusive ?? false,
        expiresAt: expiry.toISOString(),
      },
    });

    return NextResponse.json(proxy, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to grant proxy';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { orgId: string } }) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (!(await verifyOrgOwner(userId, params.orgId)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const proxyId = req.nextUrl.searchParams.get('proxyId');
  if (!proxyId) {
    return NextResponse.json({ error: 'proxyId query parameter is required' }, { status: 400 });
  }

  // Scope the revoke to this org so one org cannot revoke another's proxy.
  const proxy = await prisma.governanceProxy.findFirst({
    where: { id: proxyId, principalOrgId: params.orgId },
  });
  if (!proxy) return NextResponse.json({ error: 'Proxy not found' }, { status: 404 });

  const { count } = await revokeProxy(proxyId, userId);
  if (count === 0) {
    return NextResponse.json({ error: 'That proxy is already revoked' }, { status: 409 });
  }

  await writeAuditLog({
    orgId: params.orgId,
    actorUserId: userId,
    action: 'governance.proxy_revoke',
    targetUserId: proxy.proxyUserId,
    extra: { proxyId },
  });

  return NextResponse.json({ success: true });
}
