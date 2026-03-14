import { NextRequest, NextResponse } from 'next/server';
import { getAdminSnapshot, getPaginatedUsers } from '@/lib/admin-live';

// GET /api/admin/users - List all users
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const forceRefresh = searchParams.get('refresh') === 'true';

    const snapshot = await getAdminSnapshot(forceRefresh);
    const result = getPaginatedUsers(snapshot, page, pageSize, {
      role,
      status,
      search,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST /api/admin/users - Create new system admin user
export async function POST(request: NextRequest) {
  try {
    const { cookies } = await import('next/headers');
    const { parseAndVerifySessionToken } = await import('@/lib/session-auth');
    const { prisma } = await import('@/lib/database');
    const { hasSystemAdminPermission } = await import('@/lib/rbac');
    const { logSystemAdminAction } = await import('@/lib/audit-log');

    // Get authenticated user
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('campaignsites_session')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsedToken = parseAndVerifySessionToken(sessionToken);
    const userId = parsedToken?.userId;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    const hasPermission = await hasSystemAdminPermission(userId, 'system_admin_portal:users:create');
    if (!hasPermission) {
      await logSystemAdminAction({
        action: 'CREATE_USER_DENIED',
        resourceType: 'User',
        resourceId: 'pending',
        resourceName: 'Create new user',
        performedBy: userId,
        status: 'failure',
        errorMessage: 'Insufficient permissions',
      });

      return NextResponse.json(
        { error: 'Insufficient permissions for system_admin_portal:users:create' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, name, role, justification } = body;

    // Validate input
    if (!email || !name || !role) {
      return NextResponse.json(
        { error: 'email, name, and role are required' },
        { status: 400 }
      );
    }

    if (!['ADMIN', 'GLOBAL_ADMIN'].includes(role)) {
      return NextResponse.json(
        { error: 'role must be ADMIN or GLOBAL_ADMIN' },
        { status: 400 }
      );
    }

    if (!justification || typeof justification !== 'string') {
      return NextResponse.json(
        { error: 'justification is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existingUser) {
      await logSystemAdminAction({
        action: 'CREATE_USER_FAILED',
        resourceType: 'User',
        resourceId: normalizedEmail,
        resourceName: `User ${normalizedEmail}`,
        performedBy: userId,
        justification,
        status: 'failure',
        errorMessage: 'Email already exists',
      });

      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Create user with temporary password
    const tempPassword = Math.random().toString(36).slice(-12);
    const { hash } = await import('bcrypt');
    const passwordHash = await hash(tempPassword, 10);

    const newUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: name.trim(),
        role: role as 'ADMIN' | 'GLOBAL_ADMIN',
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    // Auto-create SystemAdmin record for admin users
    const systemAdmin = await prisma.systemAdmin.create({
      data: {
        userId: newUser.id,
        email: newUser.email,
        name: newUser.name || newUser.email.split('@')[0], // Use email username if no name provided
        isActive: true,
      },
    });

    // Assign role based on user role
    // Both GLOBAL_ADMIN and ADMIN get Global_Admin role (all permissions)
    // They can later be restricted with permission overrides if needed
    const roleToAssign = await prisma.systemAdminRole.findFirst({
      where: {
        name: 'Global_Admin', // All admins get full admin role
      },
    });

    if (roleToAssign) {
      await prisma.systemAdminRoleAssignment.create({
        data: {
          adminId: systemAdmin.id,
          roleId: roleToAssign.id,
          assignedBy: userId,
        },
      });
    }

    // Log success
    await logSystemAdminAction({
      action: 'CREATE_USER',
      resourceType: 'User',
      resourceId: newUser.id,
      resourceName: `${newUser.name} (${newUser.email})`,
      performedBy: userId,
      justification,
      status: 'success',
      changes: {
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      },
    });

    return NextResponse.json(
      {
        message: 'User created successfully',
        data: newUser,
        tempPassword: tempPassword,
        tempPasswordNote: 'User must change this password on first login',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create user:', error);

    // Log error
    const { cookies } = await import('next/headers');
    const { parseAndVerifySessionToken } = await import('@/lib/session-auth');
    const { logSystemAdminAction } = await import('@/lib/audit-log');

    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('campaignsites_session')?.value;
    if (sessionToken) {
      try {
        const parsedToken = parseAndVerifySessionToken(sessionToken);
        if (parsedToken?.userId) {
          await logSystemAdminAction({
            action: 'CREATE_USER_ERROR',
            resourceType: 'User',
            resourceId: 'unknown',
            resourceName: 'Create user - server error',
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
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
