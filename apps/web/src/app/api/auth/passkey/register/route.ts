import { NextRequest, NextResponse } from 'next/server';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import type { RegistrationResponseJSON } from '@simplewebauthn/types';
import { prisma } from '@/lib/database';
import { verifySession } from '@/lib/session-auth';
import { setChallenge, getChallenge, deleteChallenge } from '@/lib/webauthn-challenge';

const RP_NAME = 'CampaignSites Admin';

/** Derive rpID and origin from the inbound request — works on localhost, Vercel, and production. */
function getRpConfig(request: NextRequest) {
  const host = request.headers.get('host') ?? 'localhost';
  const proto = request.headers.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  const rpID = host.split(':')[0]; // strip port number
  const origin = process.env.NEXT_PUBLIC_ORIGIN ?? `${proto}://${host}`;
  return { rpID, origin };
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

    // Persist challenge (Redis with DB fallback)
    await setChallenge(user.id, options.challenge);

    return NextResponse.json(options);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to generate registration options';
    console.error('Passkey GET error:', err);
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
    const expectedChallenge = await getChallenge(session.userId);
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

    await deleteChallenge(session.userId);

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
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Registration failed';
    console.error('Passkey POST error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

