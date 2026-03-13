import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { parseAndVerifySessionToken } from '@/lib/session-auth';
import { hasSystemAdminPermission } from '@/lib/rbac';
import { logSystemAdminAction } from '@/lib/audit-log';

interface RouteParams {
  params: {
    id: string;
  };
}

// POST /api/admin/users/[id]/change-email - Update user email
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const sessionToken = request.cookies.get('campaignsites_session')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsedToken = parseAndVerifySessionToken(sessionToken);
    const adminId = parsedToken?.userId;

    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = params.id;

    // Check permission for user email updates
    const hasPermission = await hasSystemAdminPermission(
      adminId,
      'system_admin_portal:users:update'
    );
    if (!hasPermission) {
      await logSystemAdminAction({
        action: 'USER_EMAIL_CHANGE_DENIED',
        resourceType: 'User',
        resourceId: userId,
        resourceName: `User ${userId}`,
        performedBy: adminId,
        status: 'failure',
        errorMessage: 'Insufficient permissions',
      });

      return NextResponse.json(
        { error: 'Forbidden: insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json() as { newEmail?: string; justification?: string };

    if (!body.newEmail || !body.newEmail.trim()) {
      return NextResponse.json(
        { error: 'newEmail is required' },
        { status: 400 }
      );
    }

    const newEmail = body.newEmail.trim().toLowerCase();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Get existing user
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if new email is same as current
    if (newEmail === existing.email) {
      return NextResponse.json(
        { error: 'New email must be different from current email' },
        { status: 400 }
      );
    }

    // Check if new email already exists
    const emailExists = await prisma.user.findUnique({
      where: { email: newEmail },
      select: { id: true },
    });

    if (emailExists) {
      return NextResponse.json(
        { error: 'Email address already in use' },
        { status: 409 }
      );
    }

    // Update email
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { email: newEmail },
      select: { id: true, email: true, name: true },
    });

    // TODO: Send verification email to new address (stub for now)
    console.log(`[STUB] Sending verification email to ${newEmail} for user ${userId}`);

    // Audit log
    await logSystemAdminAction({
      action: 'USER_EMAIL_CHANGED',
      resourceType: 'User',
      resourceId: updated.id,
      resourceName: `${updated.name} (${updated.email})`,
      performedBy: adminId,
      justification: body.justification || 'Email updated',
      status: 'success',
      changes: {
        from: { email: existing.email },
        to: { email: updated.email },
      },
    });

    return NextResponse.json(
      {
        message: 'Email updated successfully. Verification email sent.',
        data: {
          id: updated.id,
          email: updated.email,
          name: updated.name,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to change user email:', error);

    const sessionToken = request.cookies.get('campaignsites_session')?.value;
    if (sessionToken) {
      try {
        const parsedToken = parseAndVerifySessionToken(sessionToken);
        if (parsedToken?.userId) {
          await logSystemAdminAction({
            action: 'USER_EMAIL_CHANGE_ERROR',
            resourceType: 'User',
            resourceId: params.id,
            resourceName: `User ${params.id}`,
            performedBy: parsedToken.userId,
            status: 'failure',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      } catch (logError) {
        console.error('Failed to log error:', logError);
      }
    }

    return NextResponse.json(
      { error: 'Failed to change email' },
      { status: 500 }
    );
  }
}
