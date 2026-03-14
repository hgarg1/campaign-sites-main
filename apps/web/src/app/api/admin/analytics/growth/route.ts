import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/database';
import { parseAndVerifySessionToken } from '@/lib/session-auth';
import { hasSystemAdminPermission } from '@/lib/rbac';
import { logSystemAdminAction } from '@/lib/audit-log';

export const dynamic = 'force-dynamic';

async function getAuthenticatedUserId() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('campaignsites_session')?.value;
  if (!sessionToken) return null;
  const parsedToken = parseAndVerifySessionToken(sessionToken);
  return parsedToken?.userId ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasPermission = await hasSystemAdminPermission(
      userId,
      'system_admin_portal:analytics:view'
    );
    if (!hasPermission) {
      await logSystemAdminAction({
        action: 'VIEW_GROWTH_STATS_DENIED',
        resourceType: 'Analytics',
        resourceId: 'growth',
        resourceName: 'View Growth Stats',
        performedBy: userId,
        status: 'failure',
        errorMessage: 'Insufficient permissions',
      });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get current counts
    const [totalUsers, totalOrganizations, totalWebsites] = await Promise.all([
      prisma.user.count(),
      prisma.organization.count(),
      prisma.website.count({
        where: { status: 'PUBLISHED' },
      }),
    ]);

    // Get counts from 30 days ago for growth calculation
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [usersFromPastMonth, orgsFromPastMonth, websitesFromPastMonth] = await Promise.all([
      prisma.user.count({
        where: { createdAt: { lt: thirtyDaysAgo } },
      }),
      prisma.organization.count({
        where: { createdAt: { lt: thirtyDaysAgo } },
      }),
      prisma.website.count({
        where: {
          status: 'PUBLISHED',
          createdAt: { lt: thirtyDaysAgo },
        },
      }),
    ]);

    // Calculate growth percentages
    const usersGrowth =
      usersFromPastMonth > 0 ? ((totalUsers - usersFromPastMonth) / usersFromPastMonth) * 100 : 0;
    const organizationsGrowth =
      orgsFromPastMonth > 0
        ? ((totalOrganizations - orgsFromPastMonth) / orgsFromPastMonth) * 100
        : 0;
    const websitesGrowth =
      websitesFromPastMonth > 0
        ? ((totalWebsites - websitesFromPastMonth) / websitesFromPastMonth) * 100
        : 0;

    // Get daily metrics for the last 30 days
    const metrics: Array<{ date: string; users: number; organizations: number; websites: number }> =
      [];

    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const [dayUsers, dayOrgs, dayWebsites] = await Promise.all([
        prisma.user.count({
          where: {
            createdAt: { gte: date, lt: nextDate },
          },
        }),
        prisma.organization.count({
          where: {
            createdAt: { gte: date, lt: nextDate },
          },
        }),
        prisma.website.count({
          where: {
            status: 'PUBLISHED',
            createdAt: { gte: date, lt: nextDate },
          },
        }),
      ]);

      metrics.push({
        date: date.toISOString().split('T')[0],
        users: dayUsers,
        organizations: dayOrgs,
        websites: dayWebsites,
      });
    }

    await logSystemAdminAction({
      action: 'VIEW_GROWTH_STATS',
      resourceType: 'Analytics',
      resourceId: 'growth',
      resourceName: 'View Growth Stats',
      performedBy: userId,
      status: 'success',
    });

    return NextResponse.json(
      {
        usersGrowth: Math.round(usersGrowth * 10) / 10,
        organizationsGrowth: Math.round(organizationsGrowth * 10) / 10,
        websitesGrowth: Math.round(websitesGrowth * 10) / 10,
        metrics,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching growth stats:', error);
    const userId = await getAuthenticatedUserId();
    if (userId) {
      await logSystemAdminAction({
        action: 'VIEW_GROWTH_STATS_ERROR',
        resourceType: 'Analytics',
        resourceId: 'growth',
        performedBy: userId,
        status: 'failure',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    return NextResponse.json({ error: 'Failed to fetch growth stats' }, { status: 500 });
  }
}
