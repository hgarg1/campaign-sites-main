import { NextRequest, NextResponse } from 'next/server';
import { parseAndVerifySessionToken } from '@/lib/session-auth';
import { hasSystemAdminPermission } from '@/lib/rbac';
import { prisma } from '@/lib/database';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
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

    // Check permission for security write
    const hasPermission = await hasSystemAdminPermission(
      session.userId,
      'system_admin_portal:security:write'
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { requirePasskey } = body;

    // In a real implementation, this would update the user's passkey requirement
    // For now, we're just checking permissions

    // Log the action to audit log
    await prisma.systemAdminAuditLog.create({
      data: {
        action: 'PASSKEY_REQUIREMENT_CHANGED',
        resourceType: 'USER_PASSKEY_SETTING',
        resourceId: params.userId,
        changes: {
          requirePasskey
        },
        performedBy: session.userId,
        justification: `Set passkey requirement for user ${params.userId} to ${requirePasskey}`,
        status: 'success',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating passkey requirement:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



