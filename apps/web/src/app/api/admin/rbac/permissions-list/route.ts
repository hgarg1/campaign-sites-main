/**
 * API endpoint to list all available system admin permissions
 * GET /api/admin/rbac/permissions-list - Returns array of all permission objects
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
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

    // Get search/filter parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase() || '';
    const category = searchParams.get('category') || '';

    // Query all available permissions
    let query: any = {};

    if (search) {
      query.OR = [
        { claim: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category) {
      query.category = category;
    }

    const permissions = await prisma.systemAdminPermission.findMany({
      where: query,
      orderBy: [{ category: 'asc' }, { claim: 'asc' }],
    });

    return NextResponse.json(permissions);
  } catch (error) {
    console.error('Permission list fetch failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch permissions' },
      { status: 500 }
    );
  }
}
