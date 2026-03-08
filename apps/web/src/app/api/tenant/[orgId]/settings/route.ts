import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { isDatabaseEnabled } from '@/lib/runtime-config';
import { parseAndVerifySessionToken } from '@/lib/session-auth';
import { enforceSystemPolicy } from '@/app/api/tenant/auth-utils';

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
    const org = await prisma.organization.findUnique({
      where: { id: params.orgId },
    });

    if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const branding = org.branding as any;

    return NextResponse.json({
      name: org.name,
      slug: org.slug,
      description: (org as any).description ?? null,
      primaryColor: branding?.primaryColor ?? '#3B82F6',
      secondaryColor: branding?.secondaryColor ?? null,
      accentColor: branding?.accentColor ?? null,
      sidebarFrom: branding?.sidebarFrom ?? null,
      sidebarTo: branding?.sidebarTo ?? null,
      topbarBg: branding?.topbarBg ?? null,
      logoUrl: branding?.logoUrl ?? null,
      faviconUrl: branding?.faviconUrl ?? null,
      customDomain: org.customDomain ?? null,
      notifyOnBuildComplete: branding?.notifyOnBuildComplete ?? true,
      notifyOnBuildFailed: branding?.notifyOnBuildFailed ?? true,
      notifyOnTeamChanges: branding?.notifyOnTeamChanges ?? false,
      webhookUrl: branding?.webhookUrl ?? null,
      webhookLog: branding?.webhookLog ?? [],
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { orgId: string } }) {
  if (!isDatabaseEnabled()) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const member = await verifyOrgMember(userId, params.orgId, ['OWNER', 'ADMIN']);
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const denied = await enforceSystemPolicy(params.orgId, 'settings', 'update');
  if (denied) return denied;

  try {
    const body = await req.json();
    const {
      name,
      slug,
      description,
      primaryColor,
      secondaryColor,
      accentColor,
      sidebarFrom,
      sidebarTo,
      topbarBg,
      logoUrl,
      faviconUrl,
      customDomain,
      notifyOnBuildComplete,
      notifyOnBuildFailed,
      notifyOnTeamChanges,
      webhookUrl,
    } = body;

    // Read current branding to merge — avoids clobbering unrelated branding fields
    const currentOrg = await prisma.organization.findUnique({ where: { id: params.orgId } });
    const currentBranding = (currentOrg?.branding as any) ?? {};
    const newBranding = {
      ...currentBranding,
      ...(primaryColor !== undefined && { primaryColor }),
      ...(secondaryColor !== undefined && { secondaryColor }),
      ...(accentColor !== undefined && { accentColor }),
      ...(sidebarFrom !== undefined && { sidebarFrom }),
      ...(sidebarTo !== undefined && { sidebarTo }),
      ...(topbarBg !== undefined && { topbarBg }),
      ...(logoUrl !== undefined && { logoUrl }),
      ...(faviconUrl !== undefined && { faviconUrl }),
      ...(notifyOnBuildComplete !== undefined && { notifyOnBuildComplete }),
      ...(notifyOnBuildFailed !== undefined && { notifyOnBuildFailed }),
      ...(notifyOnTeamChanges !== undefined && { notifyOnTeamChanges }),
      ...(webhookUrl !== undefined && { webhookUrl }),
    };

    const updated = await prisma.organization.update({
      where: { id: params.orgId },
      data: {
        ...(name && { name }),
        ...(slug && { slug }),
        ...(description !== undefined && { description }),
        ...(customDomain !== undefined && { customDomain }),
        branding: newBranding,
      },
    });

    const branding = updated.branding as any;

    return NextResponse.json({
      name: updated.name,
      slug: updated.slug,
      description: (updated as any).description ?? null,
      primaryColor: branding?.primaryColor ?? '#3B82F6',
      secondaryColor: branding?.secondaryColor ?? null,
      accentColor: branding?.accentColor ?? null,
      sidebarFrom: branding?.sidebarFrom ?? null,
      sidebarTo: branding?.sidebarTo ?? null,
      topbarBg: branding?.topbarBg ?? null,
      logoUrl: branding?.logoUrl ?? null,
      faviconUrl: branding?.faviconUrl ?? null,
      customDomain: updated.customDomain ?? null,
      notifyOnBuildComplete: branding?.notifyOnBuildComplete ?? true,
      notifyOnBuildFailed: branding?.notifyOnBuildFailed ?? true,
      notifyOnTeamChanges: branding?.notifyOnTeamChanges ?? false,
      webhookUrl: branding?.webhookUrl ?? null,
      webhookLog: branding?.webhookLog ?? [],
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
