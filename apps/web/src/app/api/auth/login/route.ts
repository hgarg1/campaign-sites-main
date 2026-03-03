import { createHmac, randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@campaignsites/database';
import { verifyPassword } from '../../../../lib/password-hash';
import { logger } from '../../../../lib/logger';
import { isDatabaseEnabled } from '../../../../lib/runtime-config';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function createSessionToken(userId: string) {
  const secret = process.env.AUTH_SESSION_SECRET ?? 'dev-session-secret';
  const issuedAt = Date.now();
  const nonce = randomBytes(8).toString('hex');
  const payload = `${userId}:${issuedAt}:${nonce}`;
  const signature = createHmac('sha256', secret).update(payload).digest('hex');
  const token = Buffer.from(`${payload}:${signature}`).toString('base64url');
  return token;
}

export async function POST(request: NextRequest) {
  try {
    if (!isDatabaseEnabled()) {
      logger.warn('Login endpoint blocked because database access is disabled in this environment', 'auth');
      return NextResponse.json({ error: 'Login is temporarily unavailable.' }, { status: 503 });
    }

    const body = (await request.json()) as { email?: string; password?: string };

    const email = body.email?.trim().toLowerCase();
    const password = body.password?.trim();

    if (!email || !password) {
      logger.warn('Login attempt with missing credentials', 'auth', {
        email: email ? '***' : 'missing',
        hasPassword: !!password,
      });
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    if (!EMAIL_REGEX.test(email)) {
      logger.warn('Login attempt with invalid email format', 'auth', {
        email: email ? email.split('@')[0] + '@***' : '***',
      });
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
      },
    });

    if (!user) {
      logger.warn('Login attempt with non-existent email', 'auth', {
        email: email.split('@')[0] + '@***',
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    const validPassword = await verifyPassword(password, user.passwordHash);

    if (!validPassword) {
      logger.warn('Login attempt with incorrect password', 'auth', {
        userId: user.id,
        email: user.email.split('@')[0] + '@***',
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    logger.info('User logged in successfully', 'auth', {
      userId: user.id,
      email: user.email.split('@')[0] + '@***',
      name: user.name,
      timestamp: new Date().toISOString(),
    });

    const response = NextResponse.json({
      success: true,
      message: 'Logged in successfully.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });

    response.cookies.set('campaignsites_session', createSessionToken(user.id), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    logger.error('Login request failed with exception', 'auth', error, {
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json({ error: 'Login failed. Please try again.' }, { status: 500 });
  }
}
