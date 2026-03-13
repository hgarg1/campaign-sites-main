import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { parseAndVerifySessionToken } from '@/lib/session-auth';
import { hasSystemAdminPermission } from '@/lib/rbac';
import nodemailer from 'nodemailer';

interface SmtpSettings {
  host: string;
  port: number;
  username: string;
  password: string;
  tls: boolean;
  ssl: boolean;
  fromEmail: string;
}

// POST /api/admin/settings/email/test - Send test email
export async function POST(request: NextRequest) {
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

    const body = await request.json() as { recipientEmail?: string };

    if (!body.recipientEmail) {
      return NextResponse.json(
        { error: 'recipientEmail is required' },
        { status: 400 }
      );
    }

    // Get SMTP settings from database
    const config = await prisma.systemConfig.findUnique({
      where: { key: 'smtp_settings' },
    });

    const smtpSettings = config ? (config.value as unknown as SmtpSettings) : null;

    // Validate SMTP settings are configured
    if (
      !smtpSettings ||
      !smtpSettings.host ||
      !smtpSettings.port ||
      !smtpSettings.username ||
      !smtpSettings.password ||
      !smtpSettings.fromEmail
    ) {
      return NextResponse.json(
        {
          error: 'SMTP settings are not fully configured. Please configure host, port, username, password, and fromEmail first.',
        },
        { status: 400 }
      );
    }

    try {
      // Create transporter with configured SMTP settings
      const transporter = nodemailer.createTransport({
        host: smtpSettings.host,
        port: smtpSettings.port,
        secure: smtpSettings.ssl || false, // true for 465, false for other ports
        requireTLS: smtpSettings.tls || false,
        auth: {
          user: smtpSettings.username,
          pass: smtpSettings.password,
        },
      });

      // Send test email
      const mailOptions = {
        from: smtpSettings.fromEmail,
        to: body.recipientEmail,
        subject: 'SMTP Configuration Test - Campaign Sites',
        html: `
          <h2>SMTP Configuration Test</h2>
          <p>This is a test email to verify your SMTP configuration is working correctly.</p>
          <p><strong>Sent from:</strong> Campaign Sites Admin Portal</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <hr />
          <p style="color: #666; font-size: 12px;">This is an automated test message. If you received this, your email configuration is working properly.</p>
        `,
        text: `SMTP Configuration Test\n\nThis is a test email to verify your SMTP configuration is working correctly.\n\nSent from: Campaign Sites Admin Portal\nTimestamp: ${new Date().toISOString()}`,
      };

      const info = await transporter.sendMail(mailOptions);

      return NextResponse.json(
        {
          success: true,
          message: 'Test email sent successfully',
          messageId: info.messageId,
          recipient: body.recipientEmail,
        },
        { status: 200 }
      );
    } catch (smtpError) {
      console.error('SMTP Error:', smtpError);
      const errorMessage =
        smtpError instanceof Error ? smtpError.message : 'Unknown SMTP error';

      return NextResponse.json(
        {
          error: 'Failed to send test email',
          details: errorMessage,
          suggestion:
            'Please verify your SMTP credentials and settings. Common issues: invalid host, wrong port, incorrect username/password, or firewall blocking.',
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Failed to process test email request:', error);
    return NextResponse.json(
      { error: 'Failed to process test email request' },
      { status: 500 }
    );
  }
}

