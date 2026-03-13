import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { parseAndVerifySessionToken } from '@/lib/session-auth';
import { hasSystemAdminPermission } from '@/lib/rbac';

interface SmtpSettings {
  host: string;
  port: number;
  username: string;
  password: string;
  tls: boolean;
  ssl: boolean;
  fromEmail: string;
}

// GET /api/admin/settings/email - Get SMTP settings
export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('campaignsites_session')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsedToken = parseAndVerifySessionToken(sessionToken);
    const userId = parsedToken?.userId;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    const hasPermission = await hasSystemAdminPermission(
      userId,
      'system_admin_portal:settings:read'
    );
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden: insufficient permissions' },
        { status: 403 }
      );
    }

    // Get SMTP settings from SystemConfig
    const config = await prisma.systemConfig.findUnique({
      where: { key: 'smtp_settings' },
    });

    const settings = config ? (config.value as unknown as SmtpSettings) : null;

    // Don't return password in response
    if (settings) {
      const { password, ...safeSettings } = settings;
      return NextResponse.json(safeSettings);
    }

    return NextResponse.json({
      host: '',
      port: 587,
      username: '',
      tls: true,
      ssl: false,
      fromEmail: '',
    });
  } catch (error) {
    console.error('Failed to fetch email settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email settings' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/settings/email - Update SMTP settings
export async function PATCH(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('campaignsites_session')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsedToken = parseAndVerifySessionToken(sessionToken);
    const userId = parsedToken?.userId;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    const hasPermission = await hasSystemAdminPermission(
      userId,
      'system_admin_portal:settings:write'
    );
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden: insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json() as Partial<SmtpSettings>;

    // Get current settings
    const currentConfig = await prisma.systemConfig.findUnique({
      where: { key: 'smtp_settings' },
    });

    const currentSettings: Partial<SmtpSettings> = currentConfig ? (currentConfig.value as unknown as SmtpSettings) : {};

    // Merge with new settings (preserve password if not provided)
    const updatedSettings: SmtpSettings = {
      host: body.host ?? currentSettings.host ?? '',
      port: body.port ?? currentSettings.port ?? 587,
      username: body.username ?? currentSettings.username ?? '',
      password: body.password ?? currentSettings.password ?? '',
      tls: body.tls ?? currentSettings.tls ?? true,
      ssl: body.ssl ?? currentSettings.ssl ?? false,
      fromEmail: body.fromEmail ?? currentSettings.fromEmail ?? '',
    };

    // Update or create SMTP settings
    await prisma.systemConfig.upsert({
      where: { key: 'smtp_settings' },
      create: {
        key: 'smtp_settings',
        value: updatedSettings as any,
      },
      update: {
        value: updatedSettings as any,
        updatedAt: new Date(),
      },
    });

    // Return updated settings without password
    const { password, ...safeSettings } = updatedSettings;
    return NextResponse.json(safeSettings, { status: 200 });
  } catch (error) {
    console.error('Failed to update email settings:', error);
    return NextResponse.json(
      { error: 'Failed to update email settings' },
      { status: 500 }
    );
  }
}

