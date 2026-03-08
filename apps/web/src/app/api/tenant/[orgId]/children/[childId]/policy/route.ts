/**
 * Parent org policy management for a specific child org.
 * Only the parent org (direct or via ancestry) can set/get/delete policies on a child.
 *
 * GET    /api/tenant/[orgId]/children/[childId]/policy — get current policy
 * PUT    /api/tenant/[orgId]/children/[childId]/policy — set/update policy
 * DELETE /api/tenant/[orgId]/children/[childId]/policy — remove policy
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { isDatabaseEnabled } from '@/lib/runtime-config';
import { getAuthUserId, verifyOrgAdmin } from '@/app/api/tenant/auth-utils';
import { isAncestor } from '@/lib/ancestry';
import { invalidateOrgPolicyCache } from '@/lib/org-policy';

export const dynamic = 'force-dynamic';

type Params = { orgId: string; childId: string };

async function verifyParentAccess(actingOrgId: string, childId: string, userId: string) {
  // User must be ADMIN in the acting org
  const access = await verifyOrgAdmin(userId, actingOrgId);
  if (!access) return null;

  // The acting org must be an ancestor of the child
  const ancestorCheck = await isAncestor(actingOrgId, childId);
  if (!ancestorCheck) return null;

  return access;
}

export async function GET(req: NextRequest, { params }: { params: Params }) {
  if (!isDatabaseEnabled()) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const access = await verifyParentAccess(params.orgId, params.childId, userId);
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const policy = await prisma.orgInheritedPolicy.findUnique({
    where: { parentOrgId_targetOrgId: { parentOrgId: params.orgId, targetOrgId: params.childId } },
  });

  return NextResponse.json({ policy: policy ?? null });
}

export async function PUT(req: NextRequest, { params }: { params: Params }) {
  if (!isDatabaseEnabled()) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const access = await verifyParentAccess(params.orgId, params.childId, userId);
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({})) as { rules?: unknown[]; note?: string };
  if (!Array.isArray(body.rules)) {
    return NextResponse.json({ error: 'rules must be an array' }, { status: 400 });
  }

  const policy = await prisma.orgInheritedPolicy.upsert({
    where: { parentOrgId_targetOrgId: { parentOrgId: params.orgId, targetOrgId: params.childId } },
    create: {
      parentOrgId: params.orgId,
      targetOrgId: params.childId,
      rules: body.rules as never,
      note: body.note ?? null,
      createdByUserId: userId,
    },
    update: {
      rules: body.rules as never,
      note: body.note ?? null,
    },
  });

  await invalidateOrgPolicyCache(params.childId);

  return NextResponse.json({ policy });
}

export async function DELETE(req: NextRequest, { params }: { params: Params }) {
  if (!isDatabaseEnabled()) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const access = await verifyParentAccess(params.orgId, params.childId, userId);
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await prisma.orgInheritedPolicy.deleteMany({
    where: { parentOrgId: params.orgId, targetOrgId: params.childId },
  });

  await invalidateOrgPolicyCache(params.childId);

  return new NextResponse(null, { status: 204 });
}
