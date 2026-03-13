import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      action,
      resourceType,
      resourceId,
      resourceName,
      changes,
      justification,
      status,
      errorMessage,
    } = body;

    // Get current user
    const userId = request.headers.get('x-user-id') || 'system';

    const logEntry = {
      id: `sys-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      action,
      resourceType,
      resourceId,
      resourceName: resourceName || null,
      changes: changes || null,
      justification: justification || null,
      performedBy: userId,
      status,
      errorMessage: errorMessage || null,
    };

    // Log to console (can be collected by logging service)
    console.log('[SYSTEM_ADMIN_LOG]', JSON.stringify(logEntry, null, 2));

    return NextResponse.json(logEntry);
  } catch (error) {
    console.error('Failed to create system admin log:', error);
    return NextResponse.json(
      { error: 'Failed to create audit log' },
      { status: 500 }
    );
  }
}

