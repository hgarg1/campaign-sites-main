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

    // For first-time change, currentPassword is not required. For subsequent changes, it is.
    const newPasswordOnly = !currentPassword;

    if (!newPassword || !confirmPassword) {
      return NextResponse.json({ error: 'New password and confirm password are required' }, { status: 400 });
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

    // Fetch passwordChangedAt separately to handle cases where schema migration hasn't run yet
    let passwordChangedAt: any = null;
    try {
      const userWithPasswordChangedAt = await prisma.user.findUnique({
        where: { id: parsed.userId },
        select: { passwordChangedAt: true },
      });
      passwordChangedAt = userWithPasswordChangedAt?.passwordChangedAt;
    } catch {
      // Column doesn't exist in schema yet - migration not applied
      passwordChangedAt = new Date(); // Default to changed, to allow password change
    }

    // If user has already changed password, they must provide current password
    if (passwordChangedAt !== null && newPasswordOnly) {
      return NextResponse.json({ error: 'Current password is required' }, { status: 400 });
    }

    // If changing password after first login, verify current password
    if (passwordChangedAt !== null) {
      const validCurrentPassword = await verifyPassword(currentPassword, user.passwordHash);
      if (!validCurrentPassword) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
      }
    }

    const newPasswordHash = await hashPassword(newPassword);

    // Try to update with passwordChangedAt, fallback to just passwordHash if column doesn't exist
    try {
      await prisma.user.update({
        where: { id: parsed.userId },
        data: {
          passwordHash: newPasswordHash,
          passwordChangedAt: new Date(),
        },
      });
    } catch {
      // Column might not exist yet - fallback to just updating password
      await prisma.user.update({
        where: { id: parsed.userId },
        data: {
          passwordHash: newPasswordHash,
        },
      });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
