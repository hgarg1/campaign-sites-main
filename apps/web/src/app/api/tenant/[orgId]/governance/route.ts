import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { getAuthUserId, verifyOrgAccess, verifyOrgAdmin } from '@/app/api/tenant/auth-utils';
import { createProposal } from '@/lib/governance';
import { GovernanceActionType } from '@prisma/client';

export const dynamic = 'force-dynamic';

const proposalInclude = {
  childOrg: { select: { id: true, name: true } },
  initiatorOrg: { select: { id: true, name: true } },
  votes: { select: { id: true, voterOrgId: true, decision: true, comment: true, createdAt: true } },
};

export async function GET(
  req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const access = await verifyOrgAccess(userId, params.orgId);
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { orgId } = params;
  const tab = req.nextUrl.searchParams.get('tab');

  // Summary counts (no tab param)
  if (!tab) {
    const ownedOrgs = await prisma.organizationOwnership.findMany({
      where: { parentOrgId: orgId, status: 'ACTIVE' },
      select: { childOrgId: true },
    });
    const childOrgIds = ownedOrgs.map((o) => o.childOrgId);

    const [pendingProposals, mineCount, historyCount, incomingCount] = await Promise.all([
      childOrgIds.length > 0
        ? prisma.governanceProposal.findMany({
            where: { childOrgId: { in: childOrgIds }, status: 'PENDING_VOTES' },
            include: { votes: { select: { voterOrgId: true } } },
          })
        : [],
      prisma.governanceProposal.count({ where: { initiatorOrgId: orgId } }),
      prisma.governanceProposal.count({
        where: {
          status: { in: ['APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED'] },
          OR: [
            { initiatorOrgId: orgId },
            { childOrgId: { in: childOrgIds } },
          ],
        },
      }),
      prisma.governanceProposal.count({ where: { childOrgId: orgId } }),
    ]);

    const pendingCount = pendingProposals.filter(
      (p) => !p.votes.some((v) => v.voterOrgId === orgId)
    ).length;

    return NextResponse.json({ pendingCount, mineCount, historyCount, incomingCount });
  }

  if (tab === 'children') {
    const owned = await prisma.organizationOwnership.findMany({
      where: { parentOrgId: orgId, status: 'ACTIVE' },
      include: { childOrg: { select: { id: true, name: true, slug: true } } },
    });
    return NextResponse.json(owned.map((o) => o.childOrg));
  }

  if (tab === 'pending') {
    const ownedOrgs = await prisma.organizationOwnership.findMany({
      where: { parentOrgId: orgId, status: 'ACTIVE' },
      select: { childOrgId: true },
    });
    const childOrgIds = ownedOrgs.map((o) => o.childOrgId);

    if (childOrgIds.length === 0) return NextResponse.json([]);

    const proposals = await prisma.governanceProposal.findMany({
      where: { childOrgId: { in: childOrgIds }, status: 'PENDING_VOTES' },
      include: proposalInclude,
      orderBy: { createdAt: 'desc' },
    });

    const pending = proposals.filter((p) => !p.votes.some((v) => v.voterOrgId === orgId));
    return NextResponse.json(pending);
  }

  if (tab === 'mine') {
    const proposals = await prisma.governanceProposal.findMany({
      where: { initiatorOrgId: orgId },
      include: proposalInclude,
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(proposals);
  }

  if (tab === 'history') {
    const ownedOrgs = await prisma.organizationOwnership.findMany({
      where: { parentOrgId: orgId, status: 'ACTIVE' },
      select: { childOrgId: true },
    });
    const childOrgIds = ownedOrgs.map((o) => o.childOrgId);

    const proposals = await prisma.governanceProposal.findMany({
      where: {
        status: { in: ['APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED'] },
        OR: [
          { initiatorOrgId: orgId },
          ...(childOrgIds.length > 0 ? [{ childOrgId: { in: childOrgIds } }] : []),
        ],
      },
      include: proposalInclude,
      orderBy: { resolvedAt: 'desc' },
    });
    return NextResponse.json(proposals);
  }

  if (tab === 'incoming') {
    const proposals = await prisma.governanceProposal.findMany({
      where: { childOrgId: orgId },
      include: proposalInclude,
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(proposals);
  }

  return NextResponse.json({ error: 'Invalid tab' }, { status: 400 });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const access = await verifyOrgAdmin(userId, params.orgId);
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { orgId } = params;
  const body = await req.json();
  const { childOrgId, actionType, payload, description } = body;

  if (!childOrgId || !actionType || !payload) {
    return NextResponse.json({ error: 'Missing required fields: childOrgId, actionType, payload' }, { status: 400 });
  }

  try {
    const result = await createProposal({
      childOrgId,
      initiatorOrgId: orgId,
      initiatorUserId: userId,
      actionType: actionType as GovernanceActionType,
      payload: { ...payload, description },
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create proposal';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
