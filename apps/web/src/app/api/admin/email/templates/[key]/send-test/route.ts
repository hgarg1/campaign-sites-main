import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { parseAndVerifySessionToken } from '@/lib/session-auth';
import { hasSystemAdminPermission } from '@/lib/rbac';
import { emailService } from '@/lib/email-service';
import { validateTemplateVariables } from '@/lib/email-template-utils';

export const dynamic = 'force-dynamic';

interface SendTestRequest {
  to: string;
  variables: Record<string, any>;
}

interface SendTestResponse {
  success: boolean;
  messageId: string;
  message: string;
}

// Validate email format
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// POST /api/admin/email/templates/[key]/send-test - Send test email
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
      'system_admin_portal:templates:send-test'
    );
    if (!hasPermission) {
      console.error(`User ${userId} attempted to send test email without permission`);
      return NextResponse.json(
        { error: 'Forbidden: insufficient permissions' },
        { status: 403 }
      );
    }

    const body = (await request.json()) as SendTestRequest;
    const { to, variables } = body;

    // Validate recipient email
    if (!to || !validateEmail(to)) {
      return NextResponse.json(
        { error: 'Invalid recipient email address' },
        { status: 400 }
      );
    }

    // Get template to verify it exists
    const template = await prisma.emailTemplate.findUnique({
      where: { key: params.key },
      select: {
        id: true,
        key: true,
        name: true,
        requiredVars: true,
        isActive: true,
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    if (!template.isActive) {
      return NextResponse.json(
        { error: 'Template is not active' },
        { status: 400 }
      );
    }

    // Validate variables
    const validation = await validateTemplateVariables(params.key, variables || {});
    if (!validation.valid) {
      console.error(`Variable validation failed for template ${params.key}:`, validation);
      return NextResponse.json(
        {
          error: 'Invalid or missing required variables',
          missing: validation.missing,
          extra: validation.extra,
        },
        { status: 400 }
      );
    }

    // Initialize email service
    await emailService.initializeTransporter();

    // Send test email
    const result = await emailService.send({
      templateKey: params.key,
      recipient: to,
      variables: variables || {},
    });

    // Log to audit log
    try {
      await prisma.systemAdminAuditLog.create({
        data: {
          action: 'SEND_TEST_EMAIL',
          resourceType: 'EmailTemplate',
          resourceId: template.id,
          resourceName: template.name,
          changes: {
            templateKey: params.key,
            recipient: to,
          },
          performedBy: userId,
          status: 'success',
        },
      });
    } catch (auditError) {
      console.error('Failed to log test email send to audit log:', auditError);
      // Don't fail the request if audit logging fails
    }

    const response: SendTestResponse = {
      success: true,
      messageId: result.messageId,
      message: `Test email sent successfully to ${to}`,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error(`Failed to send test email for template [${params.key}]:`, error);

    // Log failure to audit log
    try {
      await prisma.systemAdminAuditLog.create({
        data: {
          action: 'SEND_TEST_EMAIL_FAILED',
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
      console.error('Failed to log test email failure to audit log:', auditError);
    }

    return NextResponse.json(
      {
        error: 'Failed to send test email',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
