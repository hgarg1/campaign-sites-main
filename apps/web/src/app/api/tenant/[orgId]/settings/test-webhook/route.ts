import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { isDatabaseEnabled } from '@/lib/runtime-config';
import { getAuthUserId, verifyOrgAdmin } from '@/app/api/tenant/auth-utils';

export const dynamic = 'force-dynamic';

interface WebhookLogEntry {
  id: string;
  url: string;
  eventType: string;
  statusCode: number | null;
  success: boolean;
  durationMs: number;
  createdAt: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  if (!isDatabaseEnabled()) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const access = await verifyOrgAdmin(userId, params.orgId);
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json().catch(() => ({})) as { url?: string };
    let { url } = body;

    if (!url) {
      const org = await prisma.organization.findUnique({ where: { id: params.orgId } });
      url = (org?.branding as any)?.webhookUrl ?? '';
    }

    if (!url || !url.startsWith('https://')) {
      return NextResponse.json({ error: 'Webhook URL must start with https://' }, { status: 400 });
    }

    const payload = {
      event: 'test',
      orgId: params.orgId,
      timestamp: new Date().toISOString(),
      data: { message: 'This is a test webhook from CampaignSites' },
    };

    const start = Date.now();
    let statusCode: number | null = null;
    let responseBody = '';
    let success = false;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timer);
      statusCode = res.status;
      responseBody = await res.text().catch(() => '');
      success = res.ok;
    } catch (err) {
      responseBody = err instanceof Error ? err.message : 'Connection failed';
    }

    const durationMs = Date.now() - start;

    // Persist delivery log in branding.webhookLog (max 10 entries)
    const org = await prisma.organization.findUnique({ where: { id: params.orgId } });
    const branding = (org?.branding as any) ?? {};
    const existingLog: WebhookLogEntry[] = Array.isArray(branding.webhookLog) ? branding.webhookLog : [];

    const entry: WebhookLogEntry = {
      id: crypto.randomUUID(),
      url,
      eventType: 'test',
      statusCode,
      success,
      durationMs,
      createdAt: new Date().toISOString(),
    };

    const newLog = [entry, ...existingLog].slice(0, 10);

    await prisma.organization.update({
      where: { id: params.orgId },
      data: { branding: { ...branding, webhookLog: newLog } },
    });

    return NextResponse.json({ success, statusCode, responseBody, durationMs });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
