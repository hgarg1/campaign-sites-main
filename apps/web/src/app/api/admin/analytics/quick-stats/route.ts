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
        action: 'VIEW_QUICK_STATS_DENIED',
        resourceType: 'Analytics',
        resourceId: 'quick-stats',
        resourceName: 'View Quick Stats',
        performedBy: userId,
        status: 'failure',
        errorMessage: 'Insufficient permissions',
      });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all jobs
    const totalJobs = await prisma.buildJob.count();

    // Get successful jobs
    const successfulJobs = await prisma.buildJob.count({
      where: { status: 'COMPLETED' },
    });

    // Calculate success rate
    const successRate =
      totalJobs > 0 ? Math.round((successfulJobs / totalJobs) * 1000) / 10 : 0;

    // Get average build time for completed jobs (in seconds)
    const completedJobs = await prisma.buildJob.findMany({
      where: {
        status: 'COMPLETED',
        startedAt: { not: null },
        completedAt: { not: null },
      },
      select: {
        startedAt: true,
        completedAt: true,
      },
    });

    let avgBuildTimeSec = 0;
    if (completedJobs.length > 0) {
      const totalBuildTime = completedJobs.reduce((sum, job) => {
        if (job.startedAt && job.completedAt) {
          const buildTimeMs = job.completedAt.getTime() - job.startedAt.getTime();
          return sum + buildTimeMs;
        }
        return sum;
      }, 0);

      avgBuildTimeSec = Math.round((totalBuildTime / completedJobs.length / 1000) * 10) / 10;
    }

    // Get pending and in-progress jobs count
    const pendingJobs = await prisma.buildJob.count({
      where: {
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
    });

    await logSystemAdminAction({
      action: 'VIEW_QUICK_STATS',
      resourceType: 'Analytics',
      resourceId: 'quick-stats',
      resourceName: 'View Quick Stats',
      performedBy: userId,
      status: 'success',
    });

    return NextResponse.json(
      {
        successRate,
        avgBuildTimeSec,
        pendingJobs,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching quick stats:', error);
    const userId = await getAuthenticatedUserId();
    if (userId) {
      await logSystemAdminAction({
        action: 'VIEW_QUICK_STATS_ERROR',
        resourceType: 'Analytics',
        resourceId: 'quick-stats',
        performedBy: userId,
        status: 'failure',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    return NextResponse.json({ error: 'Failed to fetch quick stats' }, { status: 500 });
  }
}
