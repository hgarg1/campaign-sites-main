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

// POST /api/admin/users - Create new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // TODO: Implement user creation logic
    // - Validate input
    // - Check if email already exists
    // - Create user in database
    // - Send welcome email

    return NextResponse.json(
      { message: 'User created successfully', data: { id: 'new-id', ...body } },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
