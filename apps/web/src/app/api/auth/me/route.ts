import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { logger } from '../../../../lib/logger';
import { isDatabaseEnabled } from '../../../../lib/runtime-config';
import { parseAndVerifySessionToken } from '../../../../lib/session-auth';

export const dynamic = 'force-dynamic';

async function getAuthenticatedUserId() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('campaignsites_session')?.value;

  if (!sessionToken) {
    return null;
  }

  const parsedToken = parseAndVerifySessionToken(sessionToken);
  return parsedToken?.userId ?? null;
}

export async function GET() {
  try {
    if (!isDatabaseEnabled()) {
      logger.warn('Session lookup blocked because database access is disabled in this environment', 'auth');
      return new Response(JSON.stringify({ error: 'Session lookup unavailable' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userId = await getAuthenticatedUserId();

    if (!userId) {
      logger.warn('Attempt to access /api/auth/me without session token', 'auth');
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organizations: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      logger.warn('User not found for valid session token', 'auth', {
        userId,
      });
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    logger.info('User session verified', 'auth', {
      userId: user.id,
      email: user.email.split('@')[0] + '@***',
      organizationCount: user.organizations.length,
    });

    const response = NextResponse.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizations: user.organizations.map((om: any) => ({
          id: om.organization.id,
          name: om.organization.name,
          slug: om.organization.slug,
        })),
      },
      { status: 200 }
    );

    response.cookies.set('userRole', user.role, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    logger.error('Error fetching user in /api/auth/me', 'auth', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function PATCH(request: Request) {
  try {
    if (!isDatabaseEnabled()) {
      return NextResponse.json({ error: 'Profile update unavailable' }, { status: 503 });
    }

    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = (await request.json()) as { name?: string | null };
    const name = typeof body.name === 'string' ? body.name.trim() : null;

    if (name && name.length > 120) {
      return NextResponse.json({ error: 'Name must be 120 characters or less' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: name && name.length > 0 ? name : null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    return NextResponse.json(updatedUser, { status: 200 });
  } catch (error) {
    logger.error('Error updating user profile in /api/auth/me', 'auth', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
