import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { isDatabaseEnabled } from '../../../../lib/runtime-config';

export const dynamic = 'force-dynamic';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const toSafeFileName = (value: string) =>
  value
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 80);

const toOptionalString = (value: FormDataEntryValue | null) => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

async function saveUpload(file: File, prefix: string) {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error('Only PDF, DOC, and DOCX files are accepted.');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Each file must be 5MB or smaller.');
  }

  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'applications');
  await fs.mkdir(uploadsDir, { recursive: true });

  const fileExt = path.extname(file.name) || '.dat';
  const safeName = toSafeFileName(path.basename(file.name, fileExt));
  const generatedName = `${prefix}-${randomUUID()}-${safeName}${fileExt}`;
  const absolutePath = path.join(uploadsDir, generatedName);

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(absolutePath, buffer);

  return {
    fileName: file.name,
    filePath: `/uploads/applications/${generatedName}`,
    mimeType: file.type,
  };
}

export async function POST(request: NextRequest) {
  try {
    if (!isDatabaseEnabled()) {
      return NextResponse.json({ error: 'Applications are temporarily unavailable.' }, { status: 503 });
    }
    const formData = await request.formData();

    const jobSlug = toOptionalString(formData.get('jobSlug'));
    const fullName = toOptionalString(formData.get('fullName'));
    const email = toOptionalString(formData.get('email'))?.toLowerCase() ?? null;
    const phone = toOptionalString(formData.get('phone'));
    const location = toOptionalString(formData.get('location'));
    const linkedInUrl = toOptionalString(formData.get('linkedInUrl'));
    const portfolioUrl = toOptionalString(formData.get('portfolioUrl'));
    const yearsExperienceValue = toOptionalString(formData.get('yearsExperience'));
    const currentCompany = toOptionalString(formData.get('currentCompany'));
    const currentTitle = toOptionalString(formData.get('currentTitle'));
    const expectedSalary = toOptionalString(formData.get('expectedSalary'));
    const startDate = toOptionalString(formData.get('startDate'));
    const workAuthorization = toOptionalString(formData.get('workAuthorization'));
    const coverLetter = toOptionalString(formData.get('coverLetter'));
    const additionalInfo = toOptionalString(formData.get('additionalInfo'));

    const resume = formData.get('resume');
    const cv = formData.get('cv');

    if (!jobSlug || !fullName || !email || !phone) {
      return NextResponse.json(
        { error: 'Missing required applicant fields.' },
        { status: 400 }
      );
    }

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    if (!(resume instanceof File) || !(cv instanceof File)) {
      return NextResponse.json(
        { error: 'Resume and CV files are both required.' },
        { status: 400 }
      );
    }

    const job = await prisma.jobOpening.findFirst({
      where: { slug: jobSlug, active: true },
      select: { id: true },
    });

    if (!job) {
      return NextResponse.json({ error: 'This job opening is no longer available.' }, { status: 404 });
    }

    const [savedResume, savedCv] = await Promise.all([
      saveUpload(resume, 'resume'),
      saveUpload(cv, 'cv'),
    ]);

    const yearsExperience = yearsExperienceValue ? Number(yearsExperienceValue) : null;

    await prisma.jobApplication.create({
      data: {
        jobOpeningId: job.id,
        fullName,
        email,
        phone,
        location,
        linkedInUrl,
        portfolioUrl,
        yearsExperience: Number.isFinite(yearsExperience) ? yearsExperience : null,
        currentCompany,
        currentTitle,
        expectedSalary,
        startDate,
        workAuthorization,
        coverLetter,
        additionalInfo,
        resumeFileName: savedResume.fileName,
        resumeFilePath: savedResume.filePath,
        resumeMimeType: savedResume.mimeType,
        cvFileName: savedCv.fileName,
        cvFilePath: savedCv.filePath,
        cvMimeType: savedCv.mimeType,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully. Our team will review it soon.',
    });
  } catch (error) {
    console.error('Failed to submit application:', error);
    const message = error instanceof Error ? error.message : 'Failed to submit application.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
