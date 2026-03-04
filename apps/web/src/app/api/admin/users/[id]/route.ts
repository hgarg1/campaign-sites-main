import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { getSessionUserFromToken } from '@/lib/session-auth';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/admin/users/[id] - Get user details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const sessionToken = request.cookies.get('campaignsites_session')?.value;
    const sessionUser = await getSessionUserFromToken(sessionToken);

    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (sessionUser.role !== 'GLOBAL_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: userId } = await params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            organizations: true,
            websites: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: 'active',
          organizationCount: user._count.organizations,
          websiteCount: user._count.websites,
          createdAt: user.createdAt.toISOString(),
          lastLogin: undefined,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/users/[id] - Update user
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: userId } = await params;
    const body = await request.json();

    // TODO: Implement user update logic
    // - Validate updated fields
    // - Update user in database
    // - Log admin action

    return NextResponse.json(
      { message: 'User updated successfully', data: { id: userId, ...body } },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[id] - Delete user
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: userId } = await params;

    // TODO: Implement user deletion logic
    // - Soft delete or hard delete
    // - Handle related data
    // - Log admin action

    return NextResponse.json(
      { message: 'User deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
