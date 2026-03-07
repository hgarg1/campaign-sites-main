import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId, verifyOrgOwner } from '@/app/api/tenant/auth-utils';
import { insertAncestry } from '@/lib/ancestry';
import { prisma } from '@/lib/database';

export const dynamic = 'force-dynamic';

/**
 * First-login setup endpoint.
 * Accepts { partyAffiliation } from the setup modal.
 * Looks up the MasterTenantMapping, assigns parentId, rebuilds ancestry,
 * and marks setupCompletedAt so the modal never shows again.
 *
 * Only callable by the org OWNER and only when setupCompletedAt is null.
 */
export async function PATCH(req: NextRequest, { params }: { params: { orgId: string } }) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const access = await verifyOrgOwner(userId, params.orgId);
  if (!access) return NextResponse.json({ error: 'Forbidden — OWNER required' }, { status: 403 });

  const org = await prisma.organization.findUnique({
    where: { id: params.orgId },
    select: { id: true, setupCompletedAt: true, parentId: true },
  });
  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (org.setupCompletedAt) {
    return NextResponse.json({ error: 'Setup already completed' }, { status: 409 });
  }

  const body = (await req.json().catch(() => ({}))) as { partyAffiliation?: string };
  if (!body.partyAffiliation) {
    return NextResponse.json({ error: 'partyAffiliation is required' }, { status: 400 });
  }

  // Look up master tenant for the chosen party
  const mapping = await prisma.masterTenantMapping.findUnique({
    where: { partyAffiliation: body.partyAffiliation as any },
    select: { organizationId: true },
  });

  const now = new Date();

  // If a master tenant exists for this party, assign it as parent
  let parentId: string | null = null;
  if (mapping && mapping.organizationId !== params.orgId) {
    parentId = mapping.organizationId;
    await insertAncestry(params.orgId, parentId);
  }

  const updated = await prisma.organization.update({
    where: { id: params.orgId },
    data: {
      partyAffiliation: body.partyAffiliation as any,
      setupCompletedAt: now,
      ...(parentId && { parentId }),
    },
  });

  return NextResponse.json(updated);
}
