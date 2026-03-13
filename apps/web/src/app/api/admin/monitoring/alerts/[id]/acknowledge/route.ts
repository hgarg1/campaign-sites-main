import { NextRequest, NextResponse } from 'next/server';
import { parseAndVerifySessionToken } from '@/lib/session-auth';
import { hasSystemAdminPermission } from '@/lib/rbac';
import { prisma } from '@/lib/database';

export async function PATCH(
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

    // Check permission for monitoring write
    const hasPermission = await hasSystemAdminPermission(
      session.userId,
      'system_admin_portal:monitoring:write'
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { justification } = body;

    if (!justification) {
      return NextResponse.json(
        { error: 'Justification is required' },
        { status: 400 }
      );
    }

    // Log the action to audit log
    await prisma.systemAdminAuditLog.create({
      data: {
        action: 'ALERT_ACKNOWLEDGE',
        resourceType: 'ALERT',
        resourceId: params.id,
        changes: {
          status: 'ACKNOWLEDGED'
        },
        performedBy: session.userId,
        justification,
        status: 'success',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



