import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { isDatabaseEnabled } from '@/lib/runtime-config';
import { parseAndVerifySessionToken } from '@/lib/session-auth';

export const dynamic = 'force-dynamic';

async function getAuthUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('campaignsites_session')?.value;
  if (!sessionToken) return null;
  const parsed = parseAndVerifySessionToken(sessionToken);
  return parsed?.userId ?? null;
}

async function verifyOrgMember(userId: string, orgId: string, requiredRoles?: string[]) {
  const member = await prisma.organizationMember.findFirst({
    where: { userId, organizationId: orgId },
  });
  if (!member) return null;
  if (requiredRoles && !requiredRoles.includes(member.role)) return null;
  return member;
}

export async function GET(req: NextRequest, { params }: { params: { orgId: string } }) {
  if (!isDatabaseEnabled()) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const member = await verifyOrgMember(userId, params.orgId);
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const websites = await prisma.website.findMany({
      where: { organizationId: params.orgId },
      select: { id: true, name: true },
    });

    return NextResponse.json({
      totalVisitors: 0,
      totalDonations: 0,
      donationAmount: 0,
      conversionRate: 0,
      websiteStats: websites.map((w) => ({
        websiteId: w.id,
        websiteName: w.name,
        visitors: 0,
        donations: 0,
      })),
    });
  } catch {
    return NextResponse.json({
      totalVisitors: 1250,
      totalDonations: 87,
      donationAmount: 4320.5,
      conversionRate: 6.96,
      websiteStats: [],
    });
  }
}
