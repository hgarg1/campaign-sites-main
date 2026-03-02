import { cookies } from 'next/headers';
import { prisma } from '@campaignsites/database';
import { logger } from '../../../../lib/logger';
import { parseAndVerifySessionToken } from '../../../../lib/session-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('campaignsites_session')?.value;

    if (!sessionToken) {
      logger.warn('Attempt to access /api/auth/me without session token', 'auth');
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const parsedToken = parseAndVerifySessionToken(sessionToken);

    if (!parsedToken?.userId) {
      logger.warn('Attempt to access /api/auth/me with invalid session token', 'auth');
      return new Response(JSON.stringify({ error: 'Invalid session token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: parsedToken.userId },
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
        userId: parsedToken.userId,
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

    return new Response(
      JSON.stringify({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizations: user.organizations.map((om: any) => ({
          id: om.organization.id,
          name: om.organization.name,
          slug: om.organization.slug,
        })),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    logger.error('Error fetching user in /api/auth/me', 'auth', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
