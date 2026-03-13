/**
 * API endpoint to resolve system admin permissions
 * GET /api/admin/permissions
 * Returns the list of claims that the logged-in admin has
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { resolveSystemAdminPermissions } from '@/lib/rbac';
import { prisma } from '@/lib/database';
import { parseAndVerifySessionToken } from '@/lib/session-auth';

export const dynamic = 'force-dynamic';

async function getAuthenticatedUserId() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('campaignsites_session')?.value;

  if (!sessionToken) {
    return null;
  }

  const parsedToken = parseAndVerifySessionToken(sessionToken);
  return parsedToken?.userId ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get or create SystemAdmin record for this user
    let systemAdmin = await prisma.systemAdmin.findUnique({
      where: { userId },
    });

    if (!systemAdmin) {
      // New system admin - start with no permissions
      systemAdmin = await prisma.systemAdmin.create({
        data: {
          userId,
          email: '',
          name: 'System Admin',
          isActive: true,
        },
      });
    }

    // Resolve permissions
    const permissions = await resolveSystemAdminPermissions(systemAdmin.id);

    return NextResponse.json(permissions);
  } catch (error) {
    console.error('Permission resolution failed:', error);
    return NextResponse.json(
      { error: 'Failed to resolve permissions' },
      { status: 500 }
    );
  }
}
