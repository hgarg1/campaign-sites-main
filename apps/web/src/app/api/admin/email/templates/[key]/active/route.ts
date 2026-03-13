import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { parseAndVerifySessionToken } from '@/lib/session-auth';
import { hasSystemAdminPermission } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

interface SetActiveRequest {
  isActive: boolean;
}

interface SetActiveResponse {
  id: string;
  key: string;
  name: string;
  isActive: boolean;
  message: string;
}

// POST /api/admin/email/templates/[key]/active - Enable/disable template
export async function POST(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
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
      'system_admin_portal:templates:write'
    );
    if (!hasPermission) {
      console.error(
        `User ${userId} attempted to modify template status without permission`
      );
      return NextResponse.json(
        { error: 'Forbidden: insufficient permissions' },
        { status: 403 }
      );
    }

    const body = (await request.json()) as SetActiveRequest;
    const { isActive } = body;

    // Validate input
    if (typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'isActive must be a boolean' },
        { status: 400 }
      );
    }

    // Get current template
    const currentTemplate = await prisma.emailTemplate.findUnique({
      where: { key: params.key },
      select: {
        id: true,
        key: true,
        name: true,
        isActive: true,
      },
    });

    if (!currentTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Update template status
    const updatedTemplate = await prisma.emailTemplate.update({
      where: { key: params.key },
      data: {
        isActive,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        key: true,
        name: true,
        isActive: true,
      },
    });

    // Log action to audit log
    try {
      await prisma.systemAdminAuditLog.create({
        data: {
          action: isActive ? 'ENABLE_EMAIL_TEMPLATE' : 'DISABLE_EMAIL_TEMPLATE',
          resourceType: 'EmailTemplate',
          resourceId: updatedTemplate.id,
          resourceName: updatedTemplate.name,
          changes: {
            isActive,
            previousIsActive: currentTemplate.isActive,
          },
          performedBy: userId,
          status: 'success',
        },
      });
    } catch (auditError) {
      console.error('Failed to log template status change to audit log:', auditError);
      // Don't fail the request if audit logging fails
    }

    const response: SetActiveResponse = {
      id: updatedTemplate.id,
      key: updatedTemplate.key,
      name: updatedTemplate.name,
      isActive: updatedTemplate.isActive,
      message: `Template ${isActive ? 'enabled' : 'disabled'} successfully`,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error(
      `Failed to update template [${params.key}] status:`,
      error
    );

    // Log failure to audit log
    try {
      await prisma.systemAdminAuditLog.create({
        data: {
          action: 'UPDATE_TEMPLATE_STATUS_FAILED',
          resourceType: 'EmailTemplate',
          resourceId: params.key,
          resourceName: params.key,
          performedBy: parseAndVerifySessionToken(
            request.cookies.get('campaignsites_session')?.value || ''
          )?.userId || 'unknown',
          status: 'failure',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    } catch (auditError) {
      console.error('Failed to log template status update failure to audit log:', auditError);
    }

    return NextResponse.json(
      {
        error: 'Failed to update template status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
