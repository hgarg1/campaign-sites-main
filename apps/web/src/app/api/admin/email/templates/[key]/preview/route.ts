import { NextRequest, NextResponse } from 'next/server';
import { parseAndVerifySessionToken } from '@/lib/session-auth';
import { hasSystemAdminPermission } from '@/lib/rbac';
import { renderTemplate } from '@/lib/email-template-utils';

export const dynamic = 'force-dynamic';

interface PreviewResponse {
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: Record<string, any>;
}

// Mock data for template previews
function getMockVariables(requiredVars: string[], optionalVars: string[]): Record<string, any> {
  const mockValues: Record<string, string | number | boolean> = {
    // Common variables
    userName: 'John Doe',
    userEmail: 'john.doe@example.com',
    organizationName: 'Acme Corporation',
    organizationUrl: 'https://example.com',
    activationLink: 'https://example.com/activate/abc123',
    resetLink: 'https://example.com/reset-password/abc123',
    verificationCode: '123456',
    subject: 'Welcome to Our Platform',
    message: 'This is a test message',
    companyName: 'Acme Corp',
    supportEmail: 'support@example.com',
    supportLink: 'https://support.example.com',
    actionUrl: 'https://example.com/action',
    actionText: 'Click Here',
    year: new Date().getFullYear(),
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString(),
  };

  const result: Record<string, any> = {};

  // Add all required variables
  for (const varName of requiredVars) {
    result[varName] = mockValues[varName] ?? `[${varName}]`;
  }

  // Add all optional variables
  for (const varName of optionalVars) {
    result[varName] = mockValues[varName] ?? `[${varName}]`;
  }

  return result;
}

// GET /api/admin/email/templates/[key]/preview - Get template preview
export async function GET(
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
      'system_admin_portal:templates:read'
    );
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden: insufficient permissions' },
        { status: 403 }
      );
    }

    // Render template with mock data
    const rendered = await renderTemplate(params.key, {}, { strict: false });

    const response: PreviewResponse = {
      subject: rendered.subject,
      htmlContent: rendered.htmlContent,
      textContent: rendered.textContent,
      variables: rendered.variables,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error(`Failed to preview template [${params.key}]:`, error);
    return NextResponse.json(
      {
        error: 'Failed to preview template',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
