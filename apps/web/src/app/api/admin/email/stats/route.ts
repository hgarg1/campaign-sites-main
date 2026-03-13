import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { parseAndVerifySessionToken } from '@/lib/session-auth';
import { hasSystemAdminPermission } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

interface StatsResponse {
  totalTemplates: number;
  activeTemplates: number;
  recentlySentTests: number;
}

// GET /api/admin/email/stats - Get email statistics
export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('campaignsites_session')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsedToken = parseAndVerifySessionToken(sessionToken);
    const userId = parsedToken?.userId;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    const hasPermission = await hasSystemAdminPermission(
      userId,
      'system_admin_portal:templates:read'
    );
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden: insufficient permissions' },
        { status: 403 }
      );
    }

    // Get total templates
    const totalTemplates = await prisma.emailTemplate.count();

    // Get active templates
    const activeTemplates = await prisma.emailTemplate.count({
      where: {
        isActive: true,
      },
    });

    // Get recent emails sent (last 7 days) - using EmailSendLog for now
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    let recentlySentTests = 0;
    try {
      recentlySentTests = await prisma.emailSendLog.count({
        where: {
          createdAt: {
            gte: sevenDaysAgo,
          },
        },
      });
    } catch {
      // If EmailSendLog query fails, default to 0
      recentlySentTests = 0;
    }

    const stats: StatsResponse = {
      totalTemplates,
      activeTemplates,
      recentlySentTests,
    };

    return NextResponse.json(stats, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch email stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email statistics' },
      { status: 500 }
    );
  }
}
