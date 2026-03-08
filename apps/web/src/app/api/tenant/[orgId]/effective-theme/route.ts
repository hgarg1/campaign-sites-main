import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { isDatabaseEnabled } from '@/lib/runtime-config';
import { parseAndVerifySessionToken } from '@/lib/session-auth';
import { DEFAULT_THEME, PARTY_THEMES, TenantTheme, mergeTheme, themeFromBranding } from '@/lib/tenant-theme';

export const dynamic = 'force-dynamic';

async function getAuthUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('campaignsites_session')?.value;
  if (!sessionToken) return null;
  const parsed = parseAndVerifySessionToken(sessionToken);
  return parsed?.userId ?? null;
}

export async function GET(_req: NextRequest, { params }: { params: { orgId: string } }) {
  if (!isDatabaseEnabled()) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  // Auth: must be org member or GLOBAL_ADMIN
  const member = await prisma.organizationMember.findFirst({
    where: { userId, organizationId: params.orgId },
  });

  if (!member) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (user?.role !== 'GLOBAL_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  try {
    // Walk up the parentId chain collecting org data (up to 5 levels)
    type OrgRow = { id: string; name: string; partyAffiliation: string | null; branding: unknown; parentId: string | null };
    const chain: Array<{ id: string; name: string; partyAffiliation: string | null; branding: any }> = [];

    let currentId: string | null = params.orgId;
    let depth = 0;
    while (currentId && depth <= 5) {
      const orgRow: OrgRow | null = await prisma.organization.findUnique({
        where: { id: currentId },
        select: { id: true, name: true, partyAffiliation: true, branding: true, parentId: true },
      }) as OrgRow | null;
      if (!orgRow) break;
      chain.unshift({ id: orgRow.id, name: orgRow.name, partyAffiliation: orgRow.partyAffiliation, branding: orgRow.branding });
      currentId = orgRow.parentId ?? null;
      depth++;
    }

    // Find the deepest ancestor's party affiliation (the root of the chain)
    const rootParty = chain[0]?.partyAffiliation ?? null;

    // Build effective theme: DEFAULT → party theme → ancestor brandings (oldest first) → own branding
    let theme: TenantTheme = { ...DEFAULT_THEME };

    if (rootParty && PARTY_THEMES[rootParty]) {
      theme = mergeTheme(theme, PARTY_THEMES[rootParty]);
    }

    // Apply each level's branding in order (chain[0] is root/oldest, last is current org)
    for (const level of chain) {
      theme = mergeTheme(theme, themeFromBranding(level.branding as Record<string, any> | null));
    }

    // Determine if any field was inherited from a parent
    const hasParents = chain.length > 1;
    const inheritedFrom = hasParents ? (chain[chain.length - 2]?.name ?? null) : null;

    return NextResponse.json({ theme, inheritedFrom });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
