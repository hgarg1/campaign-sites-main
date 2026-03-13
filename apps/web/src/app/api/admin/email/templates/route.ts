import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { parseAndVerifySessionToken } from '@/lib/session-auth';
import { hasSystemAdminPermission } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

interface TemplateResponse {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  requiredVars: string[];
  optionalVars: string[];
  isActive: boolean;
  version: number;
}

// GET /api/admin/email/templates - List all templates
export async function GET(request: NextRequest) {
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

    // Fetch all active, non-archived templates
    const templates = await prisma.emailTemplate.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        key: true,
        name: true,
        description: true,
        category: true,
        requiredVars: true,
        variables: true,
        isActive: true,
        version: true,
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    // Map response to include optionalVars
    const response: TemplateResponse[] = templates.map((template) => {
      const optionalVars = template.variables.filter(
        (v) => !template.requiredVars.includes(v)
      );

      return {
        id: template.id,
        key: template.key,
        name: template.name,
        description: template.description,
        category: template.category,
        requiredVars: template.requiredVars,
        optionalVars,
        isActive: template.isActive,
        version: template.version,
      };
    });

    return NextResponse.json(
      {
        count: response.length,
        templates: response,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to fetch templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}
