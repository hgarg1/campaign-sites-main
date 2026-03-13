/**
 * API endpoint to list all system admins
 * GET /api/admin/system-admins - Get all system admins with roles
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/database';
import { parseAndVerifySessionToken } from '@/lib/session-auth';

export const dynamic = 'force-dynamic';

async function getAuthenticatedUserId() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('campaignsites_session')?.value;
  if (!sessionToken) return null;
  const parsedToken = parseAndVerifySessionToken(sessionToken);
  return parsedToken?.userId ?? null;
}

async function checkIsGlobalAdmin(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return user?.role === 'GLOBAL_ADMIN';
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await checkIsGlobalAdmin(userId);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all system admins with roles
    const admins = await prisma.systemAdmin.findMany({
      include: {
        roleAssignments: {
          include: { role: true },
        },
      },
      orderBy: { email: 'asc' },
    });

    // Transform to cleaner format
    const formattedAdmins = admins.map((admin) => ({
      id: admin.id,
      email: admin.email,
      name: admin.name,
      isActive: admin.isActive,
      roles: admin.roleAssignments.map((ra) => ({
        id: ra.role.id,
        name: ra.role.name,
      })),
    }));

    return NextResponse.json({ admins: formattedAdmins });
  } catch (error) {
    console.error('Failed to fetch system admins:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system admins' },
      { status: 500 }
    );
  }
}
