import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { hashPassword, verifyPassword } from '../../../../lib/password-hash';
import { parsePasswordPolicy, validatePasswordAgainstPolicy } from '../../../../lib/password-policy';
import { isDatabaseEnabled } from '../../../../lib/runtime-config';

export const dynamic = 'force-dynamic';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_FILE_SIZE = 8 * 1024 * 1024;

const ALLOWED_FILES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
]);

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 48);
}

function toOptionalString(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toStringArray(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function toBoolean(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

function getConfiguredPasswordPolicy() {
  return parsePasswordPolicy(process.env.PASSWORD_POLICY_JSON ?? process.env.NEXT_PUBLIC_PASSWORD_POLICY_JSON ?? null);
}

async function saveUpload(file: File, prefix: string) {
  if (!ALLOWED_FILES.has(file.type)) {
    throw new Error('Unsupported file format uploaded.');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Uploaded file is too large. Max size is 8MB.');
  }

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'intake');
  await fs.mkdir(uploadDir, { recursive: true });

  const extension = path.extname(file.name) || '.dat';
  const safeBase = path
    .basename(file.name, extension)
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 72);

  const generatedName = `${prefix}-${randomUUID()}-${safeBase}${extension}`;
  const absolutePath = path.join(uploadDir, generatedName);

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(absolutePath, buffer);

  return {
    fileName: file.name,
    filePath: `/uploads/intake/${generatedName}`,
    mimeType: file.type,
  };
}

export async function POST(request: NextRequest) {
  try {
    if (!isDatabaseEnabled()) {
      return NextResponse.json({ error: 'Onboarding is temporarily unavailable.' }, { status: 503 });
    }

    const formData = await request.formData();

    const fullName = toOptionalString(formData.get('fullName'));
    const email = toOptionalString(formData.get('email'))?.toLowerCase() ?? null;
    const password = toOptionalString(formData.get('password'));
    const confirmPassword = toOptionalString(formData.get('confirmPassword'));
    const existingUserMode = toBoolean(formData.get('existingUser'));

    const campaignName = toOptionalString(formData.get('campaignName'));
    const officeSought = toOptionalString(formData.get('officeSought'));
    const electionDate = toOptionalString(formData.get('electionDate'));
    const timeline = toOptionalString(formData.get('timeline'));
    const teamSize = toOptionalString(formData.get('teamSize'));
    const budgetRange = toOptionalString(formData.get('budgetRange'));

    const donationPlatform = toOptionalString(formData.get('donationPlatform'));
    const crmPlatform = toOptionalString(formData.get('crmPlatform'));
    const emailPlatform = toOptionalString(formData.get('emailPlatform'));
    const goals = toStringArray(formData.get('goals'));

    const privacyContact = toOptionalString(formData.get('privacyContact'));
    const incidentContact = toOptionalString(formData.get('incidentContact'));
    const dataResidency = toOptionalString(formData.get('dataResidency'));
    const teamInvites = toStringArray(formData.get('teamInvites'));
    const notes = toOptionalString(formData.get('notes'));

    const agreeToTerms = toOptionalString(formData.get('agreeToTerms'));

    const brandLogo = formData.get('brandLogo');
    const campaignBrief = formData.get('campaignBrief');
    const complianceFile = formData.get('complianceFile');

    if (!email || !password || !campaignName || !officeSought || !timeline || !teamSize || !budgetRange) {
      return NextResponse.json({ error: 'Please complete all required fields.' }, { status: 400 });
    }

    if (!existingUserMode && !fullName) {
      return NextResponse.json({ error: 'Full name is required for new account creation.' }, { status: 400 });
    }

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    if (!existingUserMode && password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match.' }, { status: 400 });
    }

    const passwordPolicy = getConfiguredPasswordPolicy();
    const passwordValidation = validatePasswordAgainstPolicy(password, passwordPolicy);

    if (!existingUserMode && !passwordValidation.valid) {
      return NextResponse.json({ error: 'Password does not meet current security requirements.' }, { status: 400 });
    }

    if (!agreeToTerms) {
      return NextResponse.json({ error: 'You must accept the terms to continue.' }, { status: 400 });
    }

    if (!(campaignBrief instanceof File)) {
      return NextResponse.json({ error: 'Campaign brief upload is required.' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        passwordHash: true,
        organizations: {
          select: {
            organization: {
              select: {
                id: true,
              },
            },
          },
          orderBy: {
            id: 'asc',
          },
          take: 1,
        },
      },
    });

    if (!existingUserMode && existingUser) {
      return NextResponse.json({ error: 'An account with this email already exists. Please use existing user login mode.' }, { status: 409 });
    }

    const [savedBrief, savedLogo, savedCompliance] = await Promise.all([
      saveUpload(campaignBrief, 'campaign-brief'),
      brandLogo instanceof File ? saveUpload(brandLogo, 'brand-logo') : Promise.resolve(null),
      complianceFile instanceof File ? saveUpload(complianceFile, 'compliance') : Promise.resolve(null),
    ]);

    const baseSlug = toSlug(campaignName) || 'campaign';
    const orgSlug = `${baseSlug}-${randomUUID().slice(0, 6)}`;

    await prisma.$transaction(async (tx: any) => {
      let userId = existingUser?.id;
      let organizationId = existingUser?.organizations[0]?.organization.id;

      if (existingUserMode) {
        if (!existingUser) {
          throw new Error('No account found for this email. Please create a new account.');
        }

        const validPassword = await verifyPassword(password, existingUser.passwordHash);

        if (!validPassword) {
          throw new Error('Invalid login credentials for existing account.');
        }
      } else {
        const passwordHash = await hashPassword(password);

        const user = await tx.user.create({
          data: {
            email,
            passwordHash,
            name: fullName,
          },
        });

        userId = user.id;
      }

      if (!organizationId) {
        const organization = await tx.organization.create({
          data: {
            name: campaignName,
            slug: orgSlug,
            whiteLabel: false,
          },
        });

        organizationId = organization.id;

        if (userId) {
          await tx.organizationMember.create({
            data: {
              organizationId,
              userId,
              role: 'OWNER',
            },
          });
        }
      }

      if (!userId || !organizationId) {
        throw new Error('Could not initialize account context for intake submission.');
      }

      await tx.getStartedIntake.create({
        data: {
          userId,
          organizationId,
          campaignName,
          officeSought,
          electionDate,
          timeline,
          teamSize,
          budgetRange,
          donationPlatform,
          crmPlatform,
          emailPlatform,
          goals,
          privacyContact,
          incidentContact,
          dataResidency,
          teamInvites,
          notes,
          brandLogoFileName: savedLogo?.fileName,
          brandLogoFilePath: savedLogo?.filePath,
          brandLogoMimeType: savedLogo?.mimeType,
          campaignBriefFileName: savedBrief.fileName,
          campaignBriefFilePath: savedBrief.filePath,
          campaignBriefMimeType: savedBrief.mimeType,
          complianceFileName: savedCompliance?.fileName,
          complianceFilePath: savedCompliance?.filePath,
          complianceMimeType: savedCompliance?.mimeType,
          status: 'submitted',
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: existingUserMode
        ? 'You are logged in and your intake has been submitted successfully.'
        : 'Your account and intake have been created successfully.',
      nextStep: 'Check your email for onboarding instructions.',
    });
  } catch (error) {
    console.error('Failed to submit get-started intake:', error);
    const message = error instanceof Error ? error.message : 'Failed to submit intake.';

    if (message.includes('Invalid login credentials')) {
      return NextResponse.json({ error: message }, { status: 401 });
    }

    if (message.includes('No account found for this email')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    if (message.includes('Could not initialize account context')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
