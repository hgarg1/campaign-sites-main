import { NextRequest, NextResponse } from 'next/server';
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type { AuthenticationResponseJSON } from '@simplewebauthn/types';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { prisma } from '@/lib/database';
import { createSessionToken } from '@/lib/session-auth';

const CHALLENGE_TTL = 300; // seconds
const CHALLENGE_COOKIE = 'passkey_challenge_token';

function getSecret() {
  return process.env.AUTH_SESSION_SECRET ?? 'dev-session-secret';
}

/** Derive rpID and origin from the inbound request — works on localhost, Vercel, and production. */
function getRpConfig(request: NextRequest) {
  const host = request.headers.get('host') ?? 'localhost';
  const proto = request.headers.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  const rpID = host.split(':')[0];
  const origin = process.env.NEXT_PUBLIC_ORIGIN ?? `${proto}://${host}`;
  return { rpID, origin };
}

/** Encode challenge into a signed, time-stamped cookie token (no external storage needed). */
function encodeChallengeToken(challenge: string): string {
  const ts = Math.floor(Date.now() / 1000);
  const payload = `${challenge}:${ts}`;
  const sig = createHmac('sha256', getSecret()).update(payload).digest('base64url');
  return Buffer.from(`${payload}:${sig}`).toString('base64url');
}

/** Decode and verify a challenge token. Returns the challenge string or null if invalid/expired. */
function decodeChallengeToken(token: string): string | null {
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf8');
    const lastColon = raw.lastIndexOf(':');
    const secondLastColon = raw.lastIndexOf(':', lastColon - 1);
    if (lastColon < 0 || secondLastColon < 0) return null;
    const payload = raw.substring(0, lastColon);
    const sig = raw.substring(lastColon + 1);
    const ts = parseInt(raw.substring(secondLastColon + 1, lastColon), 10);
    if (isNaN(ts) || Math.floor(Date.now() / 1000) - ts > CHALLENGE_TTL) return null;
    const expectedSig = createHmac('sha256', getSecret()).update(payload).digest('base64url');
    const a = Buffer.from(sig), b = Buffer.from(expectedSig);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    return payload.substring(0, secondLastColon);
  } catch {
    return null;
  }
}

// GET — generate an authentication challenge (no userId required — discoverable creds)
export async function GET(request: NextRequest) {
  const { rpID } = getRpConfig(request);

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: 'preferred',
    allowCredentials: [], // discoverable — browser shows all matching credentials
  });

  const token = encodeChallengeToken(options.challenge);
  const res = NextResponse.json(options);
  res.cookies.set(CHALLENGE_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: CHALLENGE_TTL,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  });
  return res;
}

// POST — verify assertion and issue session
export async function POST(request: NextRequest) {
  const { rpID, origin } = getRpConfig(request);
  const token = request.cookies.get(CHALLENGE_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: 'Missing challenge — please try again' }, { status: 400 });

  const expectedChallenge = decodeChallengeToken(token);
  if (!expectedChallenge) {
    return NextResponse.json({ error: 'Challenge expired — please try again' }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as AuthenticationResponseJSON | null;
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

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

  // Issue session — same as password login, with passkeyVerified flag
  const sessionToken = createSessionToken(stored.user.id);

  const res = NextResponse.json({ success: true, redirectTo: '/admin/portal' });
  res.cookies.set('campaignsites_session', sessionToken, {
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
  res.cookies.delete(CHALLENGE_COOKIE);
  return res;
}
