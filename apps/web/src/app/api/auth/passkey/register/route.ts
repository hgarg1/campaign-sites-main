import { NextRequest, NextResponse } from 'next/server';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import type { RegistrationResponseJSON } from '@simplewebauthn/types';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { prisma } from '@/lib/database';
import { verifySession } from '@/lib/session-auth';

const RP_NAME = 'CampaignSites Admin';
const CHALLENGE_TTL = 300; // seconds
const CHALLENGE_COOKIE = 'passkey_reg_challenge_token';

function getSecret() {
  return process.env.AUTH_SESSION_SECRET ?? 'dev-session-secret';
}

/** Derive rpID and origin from the inbound request — works on localhost, Vercel, and production. */
function getRpConfig(request: NextRequest) {
  const host = request.headers.get('host') ?? 'localhost';
  const proto = request.headers.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  const rpID = host.split(':')[0]; // strip port number
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

// GET — generate a registration challenge for the current user
export async function GET(request: NextRequest) {
  const session = await verifySession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { rpID } = getRpConfig(request);

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, name: true, passkeyCredentials: { select: { credentialId: true } } },
    });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const excludeCredentials = user.passkeyCredentials.map((c) => ({
      id: Buffer.from(c.credentialId).toString('base64url'),
      type: 'public-key' as const,
    }));

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID,
      userID: new Uint8Array(Buffer.from(user.id)),
      userName: user.email,
      userDisplayName: user.name ?? user.email,
      excludeCredentials,
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
      attestationType: 'none',
    });

    // Store challenge in HMAC-signed cookie — no DB/Redis required
    const token = encodeChallengeToken(options.challenge);
    const response = NextResponse.json(options);
    response.cookies.set(CHALLENGE_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: CHALLENGE_TTL,
      path: '/',
    });
    return response;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to generate registration options';
    console.error('Passkey register GET error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST — verify attestation and save credential
export async function POST(request: NextRequest) {
  const session = await verifySession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { rpID, origin } = getRpConfig(request);

  const body = (await request.json().catch(() => null)) as {
    response: RegistrationResponseJSON;
    deviceName?: string;
  } | null;
  if (!body?.response) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  try {
    // Read challenge from HMAC-signed cookie (stateless — no DB/Redis needed)
    const token = request.cookies.get(CHALLENGE_COOKIE)?.value;
    const expectedChallenge = token ? decodeChallengeToken(token) : null;
    if (!expectedChallenge) {
      return NextResponse.json({ error: 'Challenge expired — please try again' }, { status: 400 });
    }

    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: body.response,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        requireUserVerification: false,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Verification failed';
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
    }

    const { credential } = verification.registrationInfo;

    const saved = await prisma.passkeyCredential.create({
      data: {
        userId: session.userId,
        credentialId: Buffer.from(credential.id, 'base64url'),
        publicKey: Buffer.from(credential.publicKey),
        counter: credential.counter,
        deviceName: body.deviceName ?? null,
        transports: (body.response.response.transports as string[] | undefined) ?? [],
      },
      select: { id: true, deviceName: true, createdAt: true },
    });

    // Clear the challenge cookie
    const response = NextResponse.json({ success: true, credential: saved });
    response.cookies.set(CHALLENGE_COOKIE, '', { maxAge: 0, path: '/' });
    return response;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Registration failed';
    console.error('Passkey register POST error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

