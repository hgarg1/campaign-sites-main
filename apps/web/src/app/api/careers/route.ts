import { NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { cacheGet, cacheSet } from '../../../lib/redis';
import { isDatabaseEnabled } from '../../../lib/runtime-config';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (!isDatabaseEnabled()) {
      return NextResponse.json([]);
    }
    // Try to get from Redis cache
    const cachedJobs = await cacheGet('careers:openings');
    if (cachedJobs) {
      return NextResponse.json(cachedJobs);
    }

    // Query from database
    const jobs = await prisma.jobOpening.findMany({
      where: {
        active: true,
      },
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        slug: true,
        title: true,
        department: true,
        location: true,
        type: true,
        description: true,
        featured: true,
        active: true,
      },
    });

    // Cache for 1 hour
    await cacheSet('careers:openings', jobs, 3600);

    return NextResponse.json(jobs);
  } catch (error) {
    console.error('Failed to fetch careers:', error);
    // Return empty array on error instead of crashing
    return NextResponse.json([], { status: 500 });
  }
}
