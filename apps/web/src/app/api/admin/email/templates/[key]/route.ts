import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { parseAndVerifySessionToken } from '@/lib/session-auth';
import { hasSystemAdminPermission } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

interface TemplateDetailResponse {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  subject: string;
  htmlContent: string;
  textContent: string | null;
  requiredVars: string[];
  optionalVars: string[];
  isActive: boolean;
  version: number;
}

// GET /api/admin/email/templates/[key] - Get individual template
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

    // Fetch template by key
    const template = await prisma.emailTemplate.findUnique({
      where: { key: params.key },
      select: {
        id: true,
        key: true,
        name: true,
        description: true,
        category: true,
        subject: true,
        htmlContent: true,
        textContent: true,
        requiredVars: true,
        variables: true,
        isActive: true,
        version: true,
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Calculate optional variables
    const optionalVars = template.variables.filter(
      (v) => !template.requiredVars.includes(v)
    );

    const response: TemplateDetailResponse = {
      id: template.id,
      key: template.key,
      name: template.name,
      description: template.description,
      category: template.category,
      subject: template.subject,
      htmlContent: template.htmlContent,
      textContent: template.textContent,
      requiredVars: template.requiredVars,
      optionalVars,
      isActive: template.isActive,
      version: template.version,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error(`Failed to fetch template [${params.key}]:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    );
  }
}
