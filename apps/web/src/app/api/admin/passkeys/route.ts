/**
 * Admin passkey management API.
 *
 * GET  /api/admin/passkeys               — list all admin users with their passkey summary
 * GET  /api/admin/passkeys/[userId]      — list credentials for one user
 * PATCH /api/admin/passkeys/[userId]     — toggle requirePasskey (GLOBAL_ADMIN only)
 * DELETE /api/admin/passkeys/[userId]/[credId] — revoke a credential (GLOBAL_ADMIN only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { verifySession } from '@/lib/session-auth';

async function requireGlobalAdmin(request: NextRequest) {
  const session = verifySession(request);
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, role: true },
  });
  return user?.role === 'GLOBAL_ADMIN' ? user : null;
}

export async function GET(request: NextRequest, { params }: { params: { slug?: string[] } }) {
  try {
    const admin = await requireGlobalAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const slug = params.slug ?? [];
    const [userId] = slug;

    if (userId) {
      const credentials = await prisma.passkeyCredential.findMany({
        where: { userId },
        select: {
          id: true,
          deviceName: true,
          transports: true,
          createdAt: true,
          lastUsedAt: true,
          revokedAt: true,
          revokedByUserId: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json({ data: credentials });
    }

    const users = await prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'GLOBAL_ADMIN'] },
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        requirePasskey: true,
        passkeyCredentials: {
          where: { revokedAt: null },
          select: { id: true, deviceName: true, lastUsedAt: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      data: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        requirePasskey: u.requirePasskey,
        passkeyCount: u.passkeyCredentials.length,
        lastUsedAt: u.passkeyCredentials[0]?.lastUsedAt ?? null,
      })),
    });
  } catch {
    return NextResponse.json({ error: 'Failed to load admin users' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { slug?: string[] } }) {
  try {
    const admin = await requireGlobalAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const slug = params.slug ?? [];
    const [userId] = slug;
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    const body = (await request.json().catch(() => ({}))) as { requirePasskey?: boolean };
    if (typeof body.requirePasskey !== 'boolean') {
      return NextResponse.json({ error: 'requirePasskey (boolean) required' }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (target.role === 'GLOBAL_ADMIN' && userId !== admin.id) {
      return NextResponse.json({ error: 'Cannot modify another GLOBAL_ADMIN' }, { status: 403 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { requirePasskey: body.requirePasskey },
      select: { id: true, email: true, requirePasskey: true },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Failed to update passkey requirement' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { slug?: string[] } }) {
  try {
    const admin = await requireGlobalAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const slug = params.slug ?? [];
    const [userId, credId] = slug;
    if (!userId || !credId) {
      return NextResponse.json({ error: 'userId and credId required in path' }, { status: 400 });
    }

    const cred = await prisma.passkeyCredential.findFirst({ where: { id: credId, userId } });
    if (!cred) return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    if (cred.revokedAt) return NextResponse.json({ error: 'Already revoked' }, { status: 409 });

    const updated = await prisma.passkeyCredential.update({
      where: { id: credId },
      data: { revokedAt: new Date(), revokedByUserId: admin.id },
      select: { id: true, revokedAt: true },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Failed to revoke passkey' }, { status: 500 });
  }
}


