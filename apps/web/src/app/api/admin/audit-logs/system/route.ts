import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/require-admin';
import { prisma } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin('system_admin_portal:logs:read');
    if (!auth.ok) return auth.error;

    // Note: This endpoint is deprecated. Use logSystemAdminAction() utility function instead.
    // Audit logs should be created through API endpoints that use logSystemAdminAction()
    return NextResponse.json(
      {
        error:
          'This endpoint is deprecated. Use direct API endpoints that log via logSystemAdminAction().',
      },
      { status: 410 }
    );
  } catch (error) {
    console.error('Failed to validate system admin log request:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
