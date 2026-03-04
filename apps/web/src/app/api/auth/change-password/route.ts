import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/database';
import { isDatabaseEnabled } from '@/lib/runtime-config';
import { parseAndVerifySessionToken } from '@/lib/session-auth';
import { hashPassword, verifyPassword } from '@/lib/password-hash';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    if (!isDatabaseEnabled()) {
      return NextResponse.json({ error: 'Password update unavailable' }, { status: 503 });
    }

    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('campaignsites_session')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const parsed = parseAndVerifySessionToken(sessionToken);
    if (!parsed?.userId) {
      return NextResponse.json({ error: 'Invalid session token' }, { status: 401 });
    }

    const body = (await request.json()) as {
      currentPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    };

    const currentPassword = body.currentPassword?.trim() ?? '';
    const newPassword = body.newPassword?.trim() ?? '';
    const confirmPassword = body.confirmPassword?.trim() ?? '';

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: 'All password fields are required' }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: 'New password and confirm password must match' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: parsed.userId },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const validCurrentPassword = await verifyPassword(currentPassword, user.passwordHash);
    if (!validCurrentPassword) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    }

    const newPasswordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: parsed.userId },
      data: { passwordHash: newPasswordHash },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
