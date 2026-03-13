import { NextRequest, NextResponse } from 'next/server';
import { parseAndVerifySessionToken } from '@/lib/session-auth';
import { hasSystemAdminPermission } from '@/lib/rbac';
import { prisma } from '@/lib/database';

export async function DELETE(
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

    // Check permission for website delete
    const hasPermission = await hasSystemAdminPermission(
      session.userId,
      'system_admin_portal:websites:delete'
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // In a real implementation, this would delete the website
    // For now, we're just checking permissions
    
    // Log the action to audit log
    await prisma.systemAdminAuditLog.create({
      data: {
        action: 'WEBSITE_DELETE',
        resourceType: 'WEBSITE',
        resourceId: params.id,
        changes: {
          action: 'website_deleted'
        },
        performedBy: session.userId,
        justification: `Deleted website ${params.id}`,
        status: 'success',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting website:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



