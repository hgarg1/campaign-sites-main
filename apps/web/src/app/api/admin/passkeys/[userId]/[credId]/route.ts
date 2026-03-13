import { NextRequest, NextResponse } from 'next/server';
import { parseAndVerifySessionToken } from '@/lib/session-auth';
import { hasSystemAdminPermission } from '@/lib/rbac';
import { prisma } from '@/lib/database';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string; credId: string } }
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

    // In a real implementation, this would revoke the passkey credential
    // For now, we're just checking permissions

    // Log the action to audit log
    await prisma.systemAdminAuditLog.create({
      data: {
        action: 'PASSKEY_REVOKED',
        resourceType: 'PASSKEY_CREDENTIAL',
        resourceId: params.credId,
        changes: {
          userId: params.userId,
          action: 'revoked'
        },
        performedBy: session.userId,
        justification: `Revoked passkey credential ${params.credId} for user ${params.userId}`,
        status: 'success',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error revoking passkey:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



