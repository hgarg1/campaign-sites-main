import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/admin/users/[id]/activity - Get user activity history
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = params.id;
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '50';

    // TODO: Implement activity fetch logic
    // - Query ServerLog or custom UserActivity table
    // - Filter by userId
    // - Return sorted by timestamp descending

    const mockActivities = [
      {
        id: '1',
        type: 'login',
        title: 'User logged in',
        timestamp: '2024-02-28T14:22:00Z',
      },
      {
        id: '2',
        type: 'website_created',
        title: 'Website created',
        description: 'Progressive Campaign Website',
        timestamp: '2024-02-20T16:30:00Z',
      },
    ];

    return NextResponse.json(
      { data: mockActivities, limit: parseInt(limit) },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch user activity' },
      { status: 500 }
    );
  }
}
