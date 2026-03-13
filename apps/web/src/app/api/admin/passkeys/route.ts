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
import { parseAndVerifySessionToken } from '@/lib/session-auth';
import { hasSystemAdminPermission } from '@/lib/rbac';
import { logSystemAdminAction } from '@/lib/audit-log';

async function getAdminSession(request: NextRequest) {
  const sessionToken = request.cookies.get('campaignsites_session')?.value;
  if (!sessionToken) return null;

  const session = parseAndVerifySessionToken(sessionToken);
  if (!session?.userId) return null;

  return session;
}

export async function GET(request: NextRequest, { params }: { params: { slug?: string[] } }) {
  try {
    const session = await getAdminSession(request);
    if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const hasPermission = await hasSystemAdminPermission(
      session.userId,
      'system_admin_portal:security:read'
    );
    if (!hasPermission) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

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
    const session = await getAdminSession(request);
    if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const hasPermission = await hasSystemAdminPermission(
      session.userId,
      'system_admin_portal:security:write'
    );
    if (!hasPermission) {
      await logSystemAdminAction({
        action: 'PASSKEY_REQUIREMENT_DENIED',
        resourceType: 'User',
        resourceId: params.slug?.[0] || 'unknown',
        resourceName: `User ${params.slug?.[0]}`,
        performedBy: session.userId,
        status: 'failure',
        errorMessage: 'Insufficient permissions',
      });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const slug = params.slug ?? [];
    const [userId] = slug;
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    const body = (await request.json().catch(() => ({}))) as { 
      requirePasskey?: boolean;
      justification?: string;
    };
    if (typeof body.requirePasskey !== 'boolean') {
      return NextResponse.json({ error: 'requirePasskey (boolean) required' }, { status: 400 });
    }

    if (!body.justification || typeof body.justification !== 'string') {
      return NextResponse.json({ error: 'justification is required' }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ 
      where: { id: userId }, 
      select: { id: true, role: true, email: true, name: true } 
    });
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Prevent modifying another GLOBAL_ADMIN unless you're that admin
    if (target.role === 'GLOBAL_ADMIN' && userId !== session.userId) {
      await logSystemAdminAction({
        action: 'PASSKEY_REQUIREMENT_DENIED',
        resourceType: 'User',
        resourceId: userId,
        resourceName: `${target.name} (${target.email})`,
        performedBy: session.userId,
        justification: body.justification,
        status: 'failure',
        errorMessage: 'Cannot modify another GLOBAL_ADMIN',
      });
      return NextResponse.json({ error: 'Cannot modify another GLOBAL_ADMIN' }, { status: 403 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { requirePasskey: body.requirePasskey },
      select: { id: true, email: true, requirePasskey: true },
    });

    await logSystemAdminAction({
      action: 'PASSKEY_REQUIREMENT_CHANGED',
      resourceType: 'User',
      resourceId: updated.id,
      resourceName: `${target.name} (${target.email})`,
      performedBy: session.userId,
      justification: body.justification,
      status: 'success',
      changes: {
        from: { requirePasskey: !body.requirePasskey },
        to: { requirePasskey: body.requirePasskey },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update passkey requirement:', error);
    return NextResponse.json({ error: 'Failed to update passkey requirement' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { slug?: string[] } }) {
  try {
    const session = await getAdminSession(request);
    if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const hasPermission = await hasSystemAdminPermission(
      session.userId,
      'system_admin_portal:security:write'
    );
    if (!hasPermission) {
      await logSystemAdminAction({
        action: 'PASSKEY_REVOKE_DENIED',
        resourceType: 'PasskeyCredential',
        resourceId: params.slug?.[1] || 'unknown',
        resourceName: `Credential ${params.slug?.[1]}`,
        performedBy: session.userId,
        status: 'failure',
        errorMessage: 'Insufficient permissions',
      });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const slug = params.slug ?? [];
    const [userId, credId] = slug;
    if (!userId || !credId) {
      return NextResponse.json({ error: 'userId and credId required in path' }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as { justification?: string };

    if (!body.justification || typeof body.justification !== 'string') {
      return NextResponse.json({ error: 'justification is required' }, { status: 400 });
    }

    const cred = await prisma.passkeyCredential.findFirst({ 
      where: { id: credId, userId },
      select: { id: true, revokedAt: true, deviceName: true },
    });
    if (!cred) return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    if (cred.revokedAt) return NextResponse.json({ error: 'Already revoked' }, { status: 409 });

    const updated = await prisma.passkeyCredential.update({
      where: { id: credId },
      data: { revokedAt: new Date(), revokedByUserId: session.userId },
      select: { id: true, revokedAt: true },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    await logSystemAdminAction({
      action: 'PASSKEY_REVOKED',
      resourceType: 'PasskeyCredential',
      resourceId: updated.id,
      resourceName: `${cred.deviceName || 'Passkey'} for ${user?.name || user?.email}`,
      performedBy: session.userId,
      justification: body.justification,
      status: 'success',
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to revoke passkey:', error);
    return NextResponse.json({ error: 'Failed to revoke passkey' }, { status: 500 });
  }
}


