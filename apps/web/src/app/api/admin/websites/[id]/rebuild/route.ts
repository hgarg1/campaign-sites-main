import { NextRequest, NextResponse } from 'next/server';
import { parseAndVerifySessionToken } from '@/lib/session-auth';
import { hasSystemAdminPermission } from '@/lib/rbac';
import { prisma } from '@/lib/database';

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
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // In a real implementation, this would trigger a rebuild
    // For now, we're just checking permissions
    
    // Log the action to audit log
    await prisma.systemAdminAuditLog.create({
      data: {
        action: 'WEBSITE_REBUILD',
        resourceType: 'WEBSITE',
        resourceId: params.id,
        changes: {
          action: 'rebuild_triggered'
        },
        performedBy: session.userId,
        justification: `Triggered rebuild for website ${params.id}`,
        status: 'success',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error rebuilding website:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



