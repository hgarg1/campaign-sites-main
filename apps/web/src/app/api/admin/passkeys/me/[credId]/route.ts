/**
 * DELETE /api/admin/passkeys/me/[credId] — self-service revoke a passkey credential.
 *
 * Safety: if requirePasskey is true for this user, refuses to revoke the last active credential.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { verifySession } from '@/lib/session-auth';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { credId: string } }
) {
  try {
    const session = verifySession(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { credId } = params;

    const cred = await prisma.passkeyCredential.findFirst({
      where: { id: credId, userId: session.userId },
    });
    if (!cred) return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    if (cred.revokedAt) return NextResponse.json({ error: 'Already revoked' }, { status: 409 });

    // Safety check: prevent locking yourself out when passkey is required
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { requirePasskey: true },
    });
    if (user?.requirePasskey) {
      const activeCount = await prisma.passkeyCredential.count({
        where: { userId: session.userId, revokedAt: null },
      });
      if (activeCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot revoke your last passkey — passkey sign-in is required for your account. Register a new passkey first.' },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.passkeyCredential.update({
      where: { id: credId },
      data: { revokedAt: new Date(), revokedByUserId: session.userId },
      select: { id: true, revokedAt: true },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Failed to revoke passkey' }, { status: 500 });
  }
}


