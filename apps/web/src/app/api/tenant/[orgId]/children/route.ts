import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId, verifyOrgAccess, verifyOrgAdmin } from '@/app/api/tenant/auth-utils';
import { insertAncestry, getOrgDepth } from '@/lib/ancestry';
import { prisma } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { orgId: string } }) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const access = await verifyOrgAdmin(userId, params.orgId);
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const parentOrg = await prisma.organization.findUnique({
    where: { id: params.orgId },
    select: { canCreateChildren: true, maxChildDepth: true, id: true },
  });
  if (!parentOrg) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!parentOrg.canCreateChildren) {
    return NextResponse.json(
      { error: 'This organization is not permitted to create child organizations' },
      { status: 403 }
    );
  }

  // Check depth cap
  if (parentOrg.maxChildDepth !== null) {
    const currentDepth = await getOrgDepth(params.orgId);
    if (currentDepth >= parentOrg.maxChildDepth) {
      return NextResponse.json(
        { error: `Maximum hierarchy depth of ${parentOrg.maxChildDepth} reached` },
        { status: 409 }
      );
    }
  }

  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    slug?: string;
    description?: string;
  };

  if (!body.name || !body.slug) {
    return NextResponse.json({ error: 'name and slug are required' }, { status: 400 });
  }

  // Ensure slug is unique
  const existing = await prisma.organization.findUnique({ where: { slug: body.slug } });
  if (existing) return NextResponse.json({ error: 'Slug already taken' }, { status: 409 });

  // Create the child org
  const child = await prisma.organization.create({
    data: {
      name: body.name,
      slug: body.slug,
      parentId: params.orgId,
      ownStatus: 'ACTIVE',
      canCreateChildren: false,
    },
  });

  // Build ancestry (links child to all ancestors of parent + parent itself)
  await insertAncestry(child.id, params.orgId);

  // Make the creating user an OWNER of the new child org
  await prisma.organizationMember.create({
    data: { organizationId: child.id, userId, role: 'OWNER' },
  });

  return NextResponse.json(child, { status: 201 });
}

export async function GET(_req: NextRequest, { params }: { params: { orgId: string } }) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const access = await verifyOrgAccess(userId, params.orgId);
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const children = await prisma.organization.findMany({
    where: { parentId: params.orgId },
    select: {
      id: true,
      name: true,
      slug: true,
      partyAffiliation: true,
      ownStatus: true,
      canCreateChildren: true,
      setupCompletedAt: true,
      createdAt: true,
      _count: { select: { members: true, websites: true } },
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({ data: children });
}
