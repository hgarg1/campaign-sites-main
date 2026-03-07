import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { getAuthUserId, verifyOrgAdmin, verifyOrgOwner } from '@/app/api/tenant/auth-utils';
import { getSystemConfigValue } from '@/lib/governance';
import { getDescendantIds, insertAncestry, removeAncestry } from '@/lib/ancestry';
import { OwnershipStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET — list all ownerships for this org (as child)
export async function GET(_req: NextRequest, { params }: { params: { orgId: string } }) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const access = await verifyOrgAdmin(userId, params.orgId);
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const ownerships = await prisma.organizationOwnership.findMany({
    where: { childOrgId: params.orgId },
    include: {
      parentOrg: { select: { id: true, name: true, slug: true, ownStatus: true } },
    },
    orderBy: { addedAt: 'asc' },
  });

  return NextResponse.json({ data: ownerships });
}

// POST — add a new co-parent
export async function POST(req: NextRequest, { params }: { params: { orgId: string } }) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const access = await verifyOrgOwner(userId, params.orgId);
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { parentOrgId } = body as { parentOrgId?: string };

  if (!parentOrgId) {
    return NextResponse.json({ error: 'parentOrgId is required' }, { status: 400 });
  }

  // Validate parent org exists
  const parentOrg = await prisma.organization.findUnique({
    where: { id: parentOrgId },
    select: { id: true, name: true, slug: true, ownStatus: true },
  });
  if (!parentOrg) {
    return NextResponse.json({ error: 'Parent org not found' }, { status: 404 });
  }

  // Check max co-parents
  const maxCoParents = await getSystemConfigValue('maxCoParentsPerOrg', 1);
  const activeCount = await prisma.organizationOwnership.count({
    where: { childOrgId: params.orgId, status: 'ACTIVE' as OwnershipStatus },
  });
  if (activeCount >= maxCoParents) {
    return NextResponse.json(
      { error: `Already at max co-parents (${maxCoParents})` },
      { status: 409 }
    );
  }

  // Check for duplicate active ownership
  const existing = await prisma.organizationOwnership.findFirst({
    where: {
      parentOrgId,
      childOrgId: params.orgId,
      status: 'ACTIVE' as OwnershipStatus,
    },
  });
  if (existing) {
    return NextResponse.json({ error: 'This org is already a co-parent' }, { status: 409 });
  }

  // Check for cycle: new parent must not be a descendant of this org
  const descendantIds = await getDescendantIds(params.orgId);
  if (parentOrgId === params.orgId || descendantIds.includes(parentOrgId)) {
    return NextResponse.json(
      { error: 'Adding this parent would create a cycle in the org hierarchy' },
      { status: 409 }
    );
  }

  // If this org has a parentId but no ownership records yet, migrate the old parent first
  const thisOrg = await prisma.organization.findUnique({
    where: { id: params.orgId },
    select: { id: true, parentId: true },
  });

  if (thisOrg?.parentId && activeCount === 0) {
    await prisma.organizationOwnership.upsert({
      where: {
        parentOrgId_childOrgId: {
          parentOrgId: thisOrg.parentId,
          childOrgId: params.orgId,
        },
      },
      create: {
        parentOrgId: thisOrg.parentId,
        childOrgId: params.orgId,
        isPrimary: true,
        status: 'ACTIVE' as OwnershipStatus,
        addedByUserId: userId,
      },
      update: {},
    });
  }

  const isPrimary = activeCount === 0 && !thisOrg?.parentId;

  const ownership = await prisma.organizationOwnership.create({
    data: {
      parentOrgId,
      childOrgId: params.orgId,
      isPrimary,
      status: 'ACTIVE' as OwnershipStatus,
      addedByUserId: userId,
    },
    include: {
      parentOrg: { select: { id: true, name: true, slug: true, ownStatus: true } },
    },
  });

  await insertAncestry(params.orgId, parentOrgId);

  return NextResponse.json({ data: ownership }, { status: 201 });
}

// DELETE — remove a co-parent
export async function DELETE(req: NextRequest, { params }: { params: { orgId: string } }) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const access = await verifyOrgOwner(userId, params.orgId);
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { parentOrgId } = body as { parentOrgId?: string };

  if (!parentOrgId) {
    return NextResponse.json({ error: 'parentOrgId is required' }, { status: 400 });
  }

  // Find the active ownership record
  const ownership = await prisma.organizationOwnership.findFirst({
    where: {
      parentOrgId,
      childOrgId: params.orgId,
      status: 'ACTIVE' as OwnershipStatus,
    },
  });
  if (!ownership) {
    return NextResponse.json({ error: 'Active ownership not found' }, { status: 404 });
  }

  // Mark as removed
  const updated = await prisma.organizationOwnership.update({
    where: {
      parentOrgId_childOrgId: { parentOrgId, childOrgId: params.orgId },
    },
    data: {
      status: 'REMOVED' as OwnershipStatus,
      removedAt: new Date(),
      removedByUserId: userId,
    },
    include: {
      parentOrg: { select: { id: true, name: true, slug: true, ownStatus: true } },
    },
  });

  // Remaining active owners after removal
  const remainingOwners = await prisma.organizationOwnership.findMany({
    where: { childOrgId: params.orgId, status: 'ACTIVE' as OwnershipStatus },
    orderBy: { addedAt: 'asc' },
  });

  // If the removed parent matches organization.parentId, update parentId
  const thisOrg = await prisma.organization.findUnique({
    where: { id: params.orgId },
    select: { parentId: true },
  });
  if (thisOrg?.parentId === parentOrgId) {
    const nextParentId = remainingOwners[0]?.parentOrgId ?? null;
    await prisma.organization.update({
      where: { id: params.orgId },
      data: { parentId: nextParentId },
    });
  }

  // Rebuild closure table for this org from remaining active parents
  await removeAncestry(params.orgId);
  for (const owner of remainingOwners) {
    await insertAncestry(params.orgId, owner.parentOrgId);
  }

  return NextResponse.json({ data: updated });
}
