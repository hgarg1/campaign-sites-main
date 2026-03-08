import { NextRequest, NextResponse } from 'next/server';
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type { AuthenticationResponseJSON } from '@simplewebauthn/types';
import { prisma } from '@/lib/database';
import { cacheGet, cacheSet, cacheDel } from '@/lib/redis';
import { createSessionToken } from '@/lib/session-auth';

const CHALLENGE_TTL = 300;

// Challenges are keyed by a random nonce stored in a short-lived cookie so
// we can support multiple concurrent passkey attempts without collisions.
const NONCE_COOKIE = 'passkey_nonce';

/** Derive rpID and origin from the inbound request — works on localhost, Vercel, and production. */
function getRpConfig(request: NextRequest) {
  const host = request.headers.get('host') ?? 'localhost';
  const proto = request.headers.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  const rpID = host.split(':')[0];
  const origin = process.env.NEXT_PUBLIC_ORIGIN ?? `${proto}://${host}`;
  return { rpID, origin };
}

function challengeKey(nonce: string) {
  return `passkey:auth-challenge:${nonce}`;
}

// GET — generate an authentication challenge (no userId required — discoverable creds)
export async function GET(request: NextRequest) {
  const { rpID } = getRpConfig(request);

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: 'preferred',
    allowCredentials: [], // discoverable — browser shows all matching credentials
  });

  const nonce = crypto.randomUUID();
  await cacheSet(challengeKey(nonce), options.challenge, CHALLENGE_TTL);

  const res = NextResponse.json(options);
  res.cookies.set(NONCE_COOKIE, nonce, {
    httpOnly: true,
    sameSite: 'strict',
    maxAge: CHALLENGE_TTL,
    path: '/',
  });
  return res;
}

// POST — verify assertion and issue session
export async function POST(request: NextRequest) {
  const { rpID, origin } = getRpConfig(request);
  const nonce = request.cookies.get(NONCE_COOKIE)?.value;
  if (!nonce) return NextResponse.json({ error: 'Missing challenge nonce' }, { status: 400 });

  const body = (await request.json().catch(() => null)) as AuthenticationResponseJSON | null;
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const expectedChallenge = await cacheGet<string>(challengeKey(nonce));
  if (!expectedChallenge) {
    return NextResponse.json({ error: 'Challenge expired — please try again' }, { status: 400 });
  }

  // Resolve credential by credentialId
  const rawId = Buffer.from(body.rawId, 'base64url');
  const stored = await prisma.passkeyCredential.findUnique({
    where: { credentialId: rawId },
    include: { user: { select: { id: true, email: true, role: true, requirePasskey: true } } },
  });
  if (!stored || stored.revokedAt) {
    return NextResponse.json({ error: 'Credential not found or revoked' }, { status: 401 });
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: Buffer.from(stored.credentialId).toString('base64url'),
        publicKey: new Uint8Array(stored.publicKey),
        counter: stored.counter,
        transports: stored.transports as AuthenticatorTransport[],
      },
      requireUserVerification: false,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Verification failed';
    return NextResponse.json({ error: msg }, { status: 401 });
  }

  if (!verification.verified) {
    return NextResponse.json({ error: 'Verification failed' }, { status: 401 });
  }

  // Update counter and lastUsedAt
  await prisma.passkeyCredential.update({
    where: { id: stored.id },
    data: { counter: verification.authenticationInfo.newCounter, lastUsedAt: new Date() },
  });

  await cacheDel(challengeKey(nonce));

  // Issue session — same as password login, with passkeyVerified flag
  const token = createSessionToken(stored.user.id);

  const res = NextResponse.json({ success: true, redirectTo: '/admin/portal' });
  res.cookies.set('campaignsites_session', token, {
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
  res.cookies.set('userRole', stored.user.role, {
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
  res.cookies.delete(NONCE_COOKIE);
  return res;
}
