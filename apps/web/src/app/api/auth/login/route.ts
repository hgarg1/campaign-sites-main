import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { verifyPassword } from '../../../../lib/password-hash';
import { logger } from '../../../../lib/logger';
import { isDatabaseEnabled } from '../../../../lib/runtime-config';
import { createSessionToken } from '../../../../lib/session-auth';

export const dynamic = 'force-dynamic';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
        role: true,
        passwordHash: true,
        requirePasskey: true,
      },
    });

    if (!user) {
      logger.warn('Login attempt with non-existent email', 'auth', {
        email: email.split('@')[0] + '@***',
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    // Fetch passwordChangedAt separately to handle cases where schema migration hasn't run yet
    let passwordChangedAt: any = null;
    try {
      const userWithPasswordChangedAt = await prisma.user.findUnique({
        where: { email },
        select: { passwordChangedAt: true },
      });
      passwordChangedAt = userWithPasswordChangedAt?.passwordChangedAt;
    } catch {
      // Column doesn't exist in schema yet - migration not applied
      passwordChangedAt = new Date(); // Default to changed, to allow login
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
      requiresPasswordChange: passwordChangedAt === null,
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

    response.cookies.set('userRole', user.role, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    // If this admin requires a passkey but logged in with password, flag setup required
    const needsPasskey = (user as typeof user & { requirePasskey?: boolean }).requirePasskey;
    if (needsPasskey) {
      response.cookies.set('passkey_required', '1', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });
    } else {
      response.cookies.delete('passkey_required');
    }

    // If user hasn't changed their password yet, flag it
    if (passwordChangedAt === null) {
      response.cookies.set('password_change_required', '1', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });
    } else {
      response.cookies.delete('password_change_required');
    }

    return response;
  } catch (error) {
    logger.error('Login request failed with exception', 'auth', error, {
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json({ error: 'Login failed. Please try again.' }, { status: 500 });
  }
}
