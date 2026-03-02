import { createHmac, timingSafeEqual } from 'node:crypto';
import { prisma } from '@campaignsites/database';

function decodeBase64Url(input: string) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, 'base64').toString('utf-8');
}

export function parseAndVerifySessionToken(token: string) {
  const secret = process.env.AUTH_SESSION_SECRET ?? 'dev-session-secret';
  const decoded = decodeBase64Url(token);
  const parts = decoded.split(':');

  if (parts.length !== 4) {
    return null;
  }

  const [userId, issuedAt, nonce, signature] = parts;
  if (!userId || !issuedAt || !nonce || !signature) {
    return null;
  }

  const payload = `${userId}:${issuedAt}:${nonce}`;
  const expectedSignature = createHmac('sha256', secret).update(payload).digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature, 'hex');
  const actualBuffer = Buffer.from(signature, 'hex');

  if (expectedBuffer.length !== actualBuffer.length || !timingSafeEqual(expectedBuffer, actualBuffer)) {
    return null;
  }

  return { userId };
}

export async function getSessionUserFromToken(sessionToken?: string) {
  if (!sessionToken) {
    return null;
  }

  const parsed = parseAndVerifySessionToken(sessionToken);
  if (!parsed?.userId) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: parsed.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });
}
