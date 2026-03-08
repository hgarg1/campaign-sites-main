/**
 * Returns the combined effective policy restrictions for an org.
 * Tenant portal uses this on page load to disable/gray restricted actions.
 *
 * GET /api/tenant/[orgId]/effective-restrictions
 */

import { NextRequest, NextResponse } from 'next/server';
import { isDatabaseEnabled } from '@/lib/runtime-config';
import { getAuthUserId, verifyOrgAccess } from '@/app/api/tenant/auth-utils';
import { resolveEffectiveRestrictions } from '@/lib/org-policy';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { orgId: string } }) {
  if (!isDatabaseEnabled()) {
    return NextResponse.json({ rules: [], sources: [] });
  }

  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const access = await verifyOrgAccess(userId, params.orgId);
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const restrictions = await resolveEffectiveRestrictions(params.orgId);
  return NextResponse.json(restrictions);
}
