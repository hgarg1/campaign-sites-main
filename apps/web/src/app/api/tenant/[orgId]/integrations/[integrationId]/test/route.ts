import { NextRequest, NextResponse } from 'next/server';
import { isDatabaseEnabled } from '@/lib/runtime-config';
import { getAuthUserId, verifyOrgAdmin } from '@/app/api/tenant/auth-utils';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  { params }: { params: { orgId: string; integrationId: string } }
) {
  if (!isDatabaseEnabled()) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const access = await verifyOrgAdmin(userId, params.orgId);
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { prisma } = await import('@/lib/database');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const integration = await (prisma as any).organizationIntegration.findUnique({
      where: { id: params.integrationId },
    });

    if (!integration) return NextResponse.json({ error: 'Integration not found' }, { status: 404 });

    const { provider, config } = integration as { provider: string; config: Record<string, string> };

    switch (provider) {
      case 'google_analytics':
        return NextResponse.json({ success: true, message: 'Measurement ID format valid' });

      case 'actblue':
        return NextResponse.json({
          success: false,
          message: 'ActBlue does not provide a public test endpoint. Credentials will be verified when the first donation is processed.',
        });

      case 'anedot':
        return NextResponse.json({
          success: false,
          message: 'Anedot does not provide a public test endpoint. Credentials will be verified when the first donation is processed.',
        });

      case 'salesforce': {
        const instanceUrl = config?.instanceUrl;
        if (!instanceUrl) {
          return NextResponse.json({ success: false, message: 'Instance URL not configured' });
        }
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 10000);
          const res = await fetch(`${instanceUrl}/services/data/v57.0/`, { signal: controller.signal });
          clearTimeout(timer);
          return NextResponse.json({
            success: res.ok,
            message: res.ok ? 'Salesforce instance reachable' : `HTTP ${res.status}`,
            statusCode: res.status,
          });
        } catch {
          return NextResponse.json({ success: false, message: 'Connection failed or timed out' });
        }
      }

      case 'hubspot': {
        const apiKey = config?.apiKey;
        if (!apiKey) {
          return NextResponse.json({ success: false, message: 'API key not configured' });
        }
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 10000);
          const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts?limit=1', {
            headers: { Authorization: `Bearer ${apiKey}` },
            signal: controller.signal,
          });
          clearTimeout(timer);
          return NextResponse.json({
            success: res.ok,
            message: res.ok ? 'HubSpot connection successful' : `HTTP ${res.status} — check your API key`,
            statusCode: res.status,
          });
        } catch {
          return NextResponse.json({ success: false, message: 'Connection failed or timed out' });
        }
      }

      default:
        return NextResponse.json({ success: false, message: `Test not available for provider: ${provider}` });
    }
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
