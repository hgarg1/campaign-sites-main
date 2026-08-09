import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/require-admin';
import { prisma } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: { orgId: string } }) {
  try {
    const auth = await requireAdmin('system_admin_portal:logs:read');
    if (!auth.ok) return auth.error;

    // Note: This endpoint is deprecated. Use direct organization API endpoints that log via appropriate mechanisms.
    // Audit logs should be created through API endpoints that properly validate user permissions.
    return NextResponse.json(
      {
        error:
          'This endpoint is deprecated. Organization audit logs should be created through proper API endpoints.',
      },
      { status: 410 }
    );
  } catch (error) {
    console.error('Failed to validate organization audit log request:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
