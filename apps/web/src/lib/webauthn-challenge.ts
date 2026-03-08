/**
 * WebAuthn challenge storage — tries Redis first, falls back to DB.
 * Redis is optional (REDIS_URL env var); Prisma DB is always available.
 */
import { prisma } from './database';
import { cacheGet, cacheSet, cacheDel } from './redis';

const CHALLENGE_TTL = 300; // 5 minutes

function cacheKey(userId: string) {
  return `passkey:reg-challenge:${userId}`;
}

export async function setChallenge(userId: string, challenge: string): Promise<void> {
  // Try Redis first
  try {
    await cacheSet(cacheKey(userId), challenge, CHALLENGE_TTL);
    const stored = await cacheGet<string>(cacheKey(userId));
    if (stored === challenge) return; // Redis worked
  } catch {
    // Redis unavailable — fall through to DB
  }

  // DB fallback
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL * 1000);
  await prisma.webauthnChallenge.upsert({
    where: { userId },
    create: { userId, challenge, expiresAt },
    update: { challenge, expiresAt },
  });
}

export async function getChallenge(userId: string): Promise<string | null> {
  // Try Redis first
  try {
    const cached = await cacheGet<string>(cacheKey(userId));
    if (cached) return cached;
  } catch {
    // Redis unavailable
  }

  // DB fallback
  const row = await prisma.webauthnChallenge.findUnique({ where: { userId } });
  if (!row) return null;
  if (row.expiresAt < new Date()) {
    await prisma.webauthnChallenge.delete({ where: { userId } }).catch(() => {});
    return null;
  }
  return row.challenge;
}

export async function deleteChallenge(userId: string): Promise<void> {
  await Promise.allSettled([
    cacheDel(cacheKey(userId)),
    prisma.webauthnChallenge.delete({ where: { userId } }).catch(() => {}),
  ]);
}
