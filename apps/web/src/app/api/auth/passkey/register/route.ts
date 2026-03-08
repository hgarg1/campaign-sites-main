import { NextRequest, NextResponse } from 'next/server';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import type { RegistrationResponseJSON } from '@simplewebauthn/types';
import { prisma } from '@/lib/database';
import { verifySession } from '@/lib/session-auth';
import { cacheGet, cacheSet, cacheDel } from '@/lib/redis';

const RP_NAME = 'CampaignSites Admin';
const RP_ID = process.env.NEXT_PUBLIC_DOMAIN ?? 'localhost';
const ORIGIN = process.env.NEXT_PUBLIC_ORIGIN ?? `https://${RP_ID}`;
const CHALLENGE_TTL = 300; // 5 minutes

function challengeKey(userId: string) {
  return `passkey:reg-challenge:${userId}`;
}

// GET — generate a registration challenge for the current user
export async function GET(request: NextRequest) {
  const session = await verifySession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
    rpID: RP_ID,
    userID: Buffer.from(user.id),
    userName: user.email,
    userDisplayName: user.name ?? user.email,
    excludeCredentials,
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
    attestationType: 'none',
  });

  // Persist challenge for verification step
  await cacheSet(challengeKey(user.id), options.challenge, CHALLENGE_TTL);

  return NextResponse.json(options);
}

// POST — verify attestation and save credential
export async function POST(request: NextRequest) {
  const session = await verifySession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await request.json().catch(() => null)) as {
    response: RegistrationResponseJSON;
    deviceName?: string;
  } | null;
  if (!body?.response) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const expectedChallenge = await cacheGet<string>(challengeKey(session.userId));
  if (!expectedChallenge) {
    return NextResponse.json({ error: 'Challenge expired — please try again' }, { status: 400 });
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: body.response,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: false,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Verification failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
  }

  await cacheDel(challengeKey(session.userId));

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

  return NextResponse.json({ success: true, credential: saved });
}
