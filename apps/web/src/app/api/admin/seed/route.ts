import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

export async function POST(request: NextRequest) {
  try {
    // Check if seeding should be allowed (dev only)
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Seeding is only available in development' },
        { status: 403 }
      );
    }

    // Create test users if they don't exist
    const testUser1 = await prisma.user.upsert({
      where: { email: 'test.user1@example.com' },
      update: {},
      create: {
        email: 'test.user1@example.com',
        passwordHash: await hashPassword('Test@1234'),
        name: 'Test User One',
        role: 'USER',
      },
    });

    const testUser2 = await prisma.user.upsert({
      where: { email: 'test.user2@example.com' },
      update: {},
      create: {
        email: 'test.user2@example.com',
        passwordHash: await hashPassword('Test@1234'),
        name: 'Test User Two',
        role: 'ADMIN',
      },
    });

    const testUser3 = await prisma.user.upsert({
      where: { email: 'test.user3@example.com' },
      update: {},
      create: {
        email: 'test.user3@example.com',
        passwordHash: await hashPassword('Test@1234'),
        name: 'Test User Three',
        role: 'USER',
      },
    });

    console.log('✓ Created test users');

    // Create test organization
    const testOrg = await prisma.organization.upsert({
      where: { slug: 'test-org-dev' },
      update: {},
      create: {
        name: 'Test Organization (Dev)',
        slug: 'test-org-dev',
        whiteLabel: false,
        customDomain: null,
      },
    });

    console.log('✓ Created test organization');

    // Add members to organization
    await prisma.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: testOrg.id,
          userId: testUser1.id,
        },
      },
      update: {},
      create: {
        organizationId: testOrg.id,
        userId: testUser1.id,
        role: 'OWNER',
      },
    });

    await prisma.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: testOrg.id,
          userId: testUser2.id,
        },
      },
      update: {},
      create: {
        organizationId: testOrg.id,
        userId: testUser2.id,
        role: 'ADMIN',
      },
    });

    console.log('✓ Added members to organization');

    // Create test website
    const testWebsite = await prisma.website.upsert({
      where: { slug: 'test-website-dev' },
      update: {},
      create: {
        name: 'Test Website (Dev)',
        slug: 'test-website-dev',
        domain: 'test-website-dev.example.com',
        status: 'PUBLISHED',
        publishedAt: new Date(),
        organizationId: testOrg.id,
        userId: testUser1.id,
      },
    });

    console.log('✓ Created test website');

    // Create test build job
    const testJob = await prisma.buildJob.upsert({
      where: { id: 'test-job-dev' },
      update: {},
      create: {
        id: 'test-job-dev',
        websiteId: testWebsite.id,
        stage: 'DEPLOYMENT',
        status: 'COMPLETED',
        startedAt: new Date(Date.now() - 300000), // 5 minutes ago
        completedAt: new Date(),
      },
    });

    console.log('✓ Created test build job');

    return NextResponse.json({
      message: 'Seeding completed successfully',
      data: {
        users: [testUser1, testUser2, testUser3],
        organization: testOrg,
        website: testWebsite,
        job: testJob,
      },
    });
  } catch (error) {
    console.error('Seeding error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
