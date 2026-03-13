import { NextRequest, NextResponse } from 'next/server';
import { parseAndVerifySessionToken } from '@/lib/session-auth';
import { hasSystemAdminPermission } from '@/lib/rbac';
import { prisma } from '@/lib/database';
import { logSystemAdminAction } from '@/lib/audit-log';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionToken = request.cookies.get('campaignsites_session')?.value;
    
    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await parseAndVerifySessionToken(sessionToken);
    
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Check permission for website write
    const hasPermission = await hasSystemAdminPermission(
      session.userId,
      'system_admin_portal:websites:write'
    );

    if (!hasPermission) {
      await logSystemAdminAction({
        action: 'WEBSITE_REBUILD_DENIED',
        resourceType: 'Website',
        resourceId: params.id,
        resourceName: `Website ${params.id}`,
        performedBy: session.userId,
        status: 'failure',
        errorMessage: 'Insufficient permissions',
      });

      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { justification } = body;

    if (!justification || typeof justification !== 'string') {
      return NextResponse.json(
        { error: 'justification is required' },
        { status: 400 }
      );
    }

    // Verify website exists
    const website = await prisma.website.findUnique({
      where: { id: params.id },
      select: { id: true, name: true },
    });

    if (!website) {
      await logSystemAdminAction({
        action: 'WEBSITE_REBUILD_FAILED',
        resourceType: 'Website',
        resourceId: params.id,
        resourceName: `Website ${params.id}`,
        performedBy: session.userId,
        justification,
        status: 'failure',
        errorMessage: 'Website not found',
      });

      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    // In a real implementation, this would trigger a rebuild
    // For now, we're just checking permissions
    
    // Log the action to audit log
    await logSystemAdminAction({
      action: 'WEBSITE_REBUILD',
      resourceType: 'Website',
      resourceId: website.id,
      resourceName: website.name || `Website ${params.id}`,
      performedBy: session.userId,
      justification,
      status: 'success',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error rebuilding website:', error);

    const sessionToken = request.cookies.get('campaignsites_session')?.value;
    if (sessionToken) {
      try {
        const session = await parseAndVerifySessionToken(sessionToken);
        if (session) {
          await logSystemAdminAction({
            action: 'WEBSITE_REBUILD_ERROR',
            resourceType: 'Website',
            resourceId: params.id,
            resourceName: `Website ${params.id}`,
            performedBy: session.userId,
            status: 'failure',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      } catch (logError) {
        console.error('Failed to log error:', logError);
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



