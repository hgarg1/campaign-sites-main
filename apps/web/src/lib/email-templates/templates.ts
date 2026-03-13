/**
 * Email Template Definitions
 *
 * 6 pre-built, production-ready email templates with:
 * - Beautiful, responsive HTML design
 * - Inline CSS for email client compatibility
 * - Plain text fallback versions
 * - Full variable support with Handlebars
 */

export interface TemplateDefinition {
  key: string;
  name: string;
  category: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: string[];
  requiredVars: string[];
}

// Template 1: Password Reset
export const passwordResetTemplate: TemplateDefinition = {
  key: 'password-reset',
  name: 'Password Reset',
  category: 'security',
  subject: 'Reset your password - {{companyName}}',
  htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #2563eb; padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Reset Your Password</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 24px 0; color: #1f2937; font-size: 16px; line-height: 1.6;">
                Hi {{userName}},
              </p>
              
              <p style="margin: 0 0 24px 0; color: #1f2937; font-size: 16px; line-height: 1.6;">
                We received a request to reset your password. Click the button below to create a new password:
              </p>
              
              <!-- CTA Button -->
              <div style="margin: 32px 0; text-align: center;">
                <a href="{{resetLink}}" style="background-color: #2563eb; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; display: inline-block;">
                  Reset Password
                </a>
              </div>
              
              <!-- Warning -->
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 4px;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                  <strong>⏰ This link expires {{expiresAt}}</strong>
                </p>
              </div>
              
              <!-- Alternative Link -->
              <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                If you can't click the button above, copy and paste this link in your browser:
              </p>
              <p style="margin: 8px 0 24px 0; color: #2563eb; font-size: 14px; word-break: break-all;">
                {{resetLink}}
              </p>
              
              <!-- Security Note -->
              <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Didn't request this? You can safely ignore this email. Your account is secure.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="border-top: 1px solid #e5e7eb; padding: 24px 30px; text-align: center; color: #6b7280; font-size: 12px;">
              {{#if supportEmail}}
                <p style="margin: 0 0 8px 0;">
                  Need help? <a href="mailto:{{supportEmail}}" style="color: #2563eb; text-decoration: none;">Contact Support</a>
                </p>
              {{/if}}
              <p style="margin: 0;">
                © {{companyName}}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  textContent: `Reset Your Password

Hi {{userName}},

We received a request to reset your password. Click the link below to create a new password:

{{resetLink}}

⏰ This link expires {{expiresAt}}

If you can't click the link above, copy and paste it in your browser.

Didn't request this? You can safely ignore this email. Your account is secure.

---
{{#if supportEmail}}
Need help? Contact us at {{supportEmail}}
{{/if}}
© {{companyName}}`,
  variables: ['userName', 'resetLink', 'expiresAt', 'companyName', 'supportEmail'],
  requiredVars: ['userName', 'resetLink', 'expiresAt'],
};

// Template 2: Welcome Email  
export const welcomeEmailTemplate: TemplateDefinition = {
  key: 'welcome-email',
  name: 'Welcome Email',
  category: 'onboarding',
  subject: 'Welcome to {{organizationName}}, {{userName}}!',
  htmlContent: `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Welcome</title></head><body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;"><tr><td align="center" style="padding: 40px 0;"><table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"><tr><td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;"><h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 600;">Welcome, {{userName}}! 👋</h1></td></tr><tr><td style="padding: 40px 30px;"><p style="margin: 0 0 24px 0; color: #1f2937; font-size: 16px;">Get started with {{organizationName}}</p><div style="margin: 32px 0;">{{#each nextSteps}}<div style="display: flex; margin-bottom: 16px;"><div style="color: #667eea; font-weight: 600; margin-right: 12px;">✓</div><div style="color: #1f2937; font-size: 16px;">{{this}}</div></div>{{/each}}</div><div style="margin: 32px 0; text-align: center;"><a href="{{activationLink}}" style="background-color: #667eea; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; display: inline-block;">Activate Your Account</a></div><div style="background-color: #f9fafb; padding: 24px; border-radius: 6px; margin: 24px 0;"><h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 16px; font-weight: 600;">What's Included:</h3><ul style="margin: 0; padding-left: 20px; color: #6b7280; font-size: 14px;"><li>Full access to all {{organizationName}} features</li><li>Personalized dashboard and settings</li><li>Priority support</li><li>Regular updates and new features</li></ul></div>{{#if welcomeMessage}}<p style="margin: 24px 0; color: #1f2937; font-size: 16px;">{{welcomeMessage}}</p>{{/if}}</td></tr><tr><td style="border-top: 1px solid #e5e7eb; padding: 24px 30px; text-align: center; color: #6b7280; font-size: 12px;">{{#if supportEmail}}<p style="margin: 0 0 8px 0;">Questions? <a href="mailto:{{supportEmail}}" style="color: #667eea; text-decoration: none;">Contact support</a></p>{{/if}}<p style="margin: 0;">© {{organizationName}}</p></td></tr></table></td></tr></table></body></html>`,
  textContent: `Welcome to {{organizationName}}, {{userName}}!\n\nGet started:\n{{#each nextSteps}}✓ {{this}}\n{{/each}}\nActivate: {{activationLink}}\n\n{{#if welcomeMessage}}{{welcomeMessage}}\n{{/if}}---\n{{#if supportEmail}}Contact: {{supportEmail}}\n{{/if}}© {{organizationName}}`,
  variables: ['userName', 'organizationName', 'activationLink', 'nextSteps', 'supportEmail', 'welcomeMessage'],
  requiredVars: ['userName', 'organizationName', 'activationLink'],
};

// Template 3: User Invitation
export const userInvitationTemplate: TemplateDefinition = {
  key: 'user-invitation',
  name: 'User Invitation',
  category: 'collaboration',
  subject: '{{inviterName}} invites you to join {{organizationName}}',
  htmlContent: `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>You're Invited</title></head><body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;"><tr><td align="center" style="padding: 40px 0;"><table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"><tr><td style="background-color: #10b981; padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;"><h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">You're Invited! 🎉</h1></td></tr><tr><td style="padding: 40px 30px;"><p style="margin: 0 0 24px 0; color: #1f2937; font-size: 16px;"><strong>{{inviterName}}</strong> has invited you to join <strong>{{organizationName}}</strong></p>{{#if message}}<div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; margin: 24px 0; border-radius: 4px;"><p style="margin: 0; color: #065f46; font-size: 14px;">{{message}}</p></div>{{/if}}<p style="margin: 24px 0; color: #1f2937; font-size: 16px;">You'll be able to collaborate with the team.</p><div style="margin: 32px 0; text-align: center;"><a href="{{joinLink}}" style="background-color: #10b981; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; display: inline-block;">Accept Invitation</a></div></td></tr><tr><td style="border-top: 1px solid #e5e7eb; padding: 24px 30px; text-align: center; color: #6b7280; font-size: 12px;">{{#if supportEmail}}<p style="margin: 0 0 8px 0;">Questions? <a href="mailto:{{supportEmail}}" style="color: #10b981; text-decoration: none;">Contact support</a></p>{{/if}}<p style="margin: 0;">© {{organizationName}}</p></td></tr></table></td></tr></table></body></html>`,
  textContent: `You're Invited!\n\n{{inviterName}} has invited you to join {{organizationName}}\n\n{{#if message}}"{{message}}"\n{{/if}}\nAccept: {{joinLink}}\n\n{{#if expiresAt}}Expires: {{expiresAt}}\n{{/if}}---\n{{#if supportEmail}}Contact: {{supportEmail}}\n{{/if}}© {{organizationName}}`,
  variables: ['inviterName', 'organizationName', 'joinLink', 'expiresAt', 'message', 'supportEmail', 'role'],
  requiredVars: ['inviterName', 'organizationName', 'joinLink'],
};

// Template 4: Notification
export const notificationTemplate: TemplateDefinition = {
  key: 'notification',
  name: 'Notification',
  category: 'notification',
  subject: '{{title}} - Notification',
  htmlContent: `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>{{title}}</title></head><body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;"><tr><td align="center" style="padding: 40px 0;"><table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"><tr><td style="{{#if priority}}{{#eq priority 'high'}}background-color: #ef4444;{{/eq}}{{#eq priority 'medium'}}background-color: #f59e0b;{{/eq}}{{#eq priority 'low'}}background-color: #3b82f6;{{/eq}}{{else}}background-color: #3b82f6;{{/if}} padding: 30px; text-align: center; border-radius: 8px 8px 0 0;"><h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">{{#if icon}}{{icon}} {{/if}}{{title}}</h1></td></tr><tr><td style="padding: 30px;"><p style="margin: 0 0 24px 0; color: #1f2937; font-size: 16px;">{{message}}</p>{{#if details}}<div style="background-color: #f9fafb; padding: 16px; border-radius: 6px; margin: 24px 0;"><p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px; font-weight: 600;">Details</p><p style="margin: 0; color: #1f2937; font-size: 14px;">{{details}}</p></div>{{/if}}{{#if actionUrl}}<div style="margin: 32px 0; text-align: center;"><a href="{{actionUrl}}" style="background-color: {{#if priority}}{{#eq priority 'high'}}#ef4444;{{/eq}}{{#eq priority 'medium'}}#f59e0b;{{/eq}}{{#eq priority 'low'}}#3b82f6;{{/eq}}{{else}}#3b82f6;{{/if}} color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; display: inline-block;">{{actionText}}{{#unless actionText}}View{{/unless}}</a></div>{{/if}}</td></tr></table></td></tr></table></body></html>`,
  textContent: `{{#if icon}}{{icon}} {{/if}}{{title}}\n\n{{message}}\n\n{{#if details}}Details: {{details}}\n{{/if}}{{#if actionUrl}}View: {{actionUrl}}\n{{/if}}`,
  variables: ['title', 'message', 'actionUrl', 'priority', 'actionText', 'icon', 'details', 'timestamp'],
  requiredVars: ['title', 'message', 'actionUrl'],
};

// Template 5: Approval Request
export const approvalRequestTemplate: TemplateDefinition = {
  key: 'approval-request',
  name: 'Approval Request',
  category: 'workflow',
  subject: 'Approval needed: {{requestType}} from {{requestorName}}',
  htmlContent: `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Approval Request</title></head><body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;"><tr><td align="center" style="padding: 40px 0;"><table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"><tr><td style="background-color: #8b5cf6; padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;"><h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Approval Request</h1><p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">{{requestType}}</p></td></tr><tr><td style="padding: 40px 30px;"><p style="margin: 0 0 24px 0; color: #1f2937; font-size: 16px;"><strong>{{requestorName}}</strong> has submitted a <strong>{{requestType}}</strong> requiring your approval.</p><div style="background-color: #f9fafb; padding: 24px; border-radius: 6px; margin: 24px 0;">{{#if reason}}<p style="margin: 0 0 16px 0; color: #1f2937; font-size: 14px;"><strong>Reason:</strong><br>{{reason}}</p>{{/if}}{{#if details}}<p style="margin: 0 0 16px 0; color: #1f2937; font-size: 14px;"><strong>Details:</strong><br>{{details}}</p>{{/if}}{{#if deadline}}<p style="margin: 0; color: #dc2626; font-size: 14px;"><strong>⏰ Deadline:</strong> {{deadline}}</p>{{/if}}</div><div style="margin: 32px 0; text-align: center;"><a href="{{approvalLink}}" style="background-color: #10b981; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; display: inline-block; margin-right: 12px;">✓ Approve</a><a href="{{rejectionLink}}" style="background-color: #ef4444; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; display: inline-block;">✗ Reject</a></div></td></tr></table></td></tr></table></body></html>`,
  textContent: `Approval Request - {{requestType}}\n\n{{requestorName}} has submitted a {{requestType}} requiring your approval.\n\n{{#if reason}}Reason: {{reason}}\n{{/if}}{{#if details}}Details: {{details}}\n{{/if}}{{#if deadline}}Deadline: {{deadline}}\n{{/if}}\nApprove: {{approvalLink}}\nReject: {{rejectionLink}}`,
  variables: ['requestorName', 'requestType', 'approvalLink', 'rejectionLink', 'details', 'deadline', 'reason'],
  requiredVars: ['requestorName', 'requestType', 'approvalLink', 'rejectionLink'],
};

// Template 6: System Alert
export const systemAlertTemplate: TemplateDefinition = {
  key: 'system-alert',
  name: 'System Alert',
  category: 'system',
  subject: '[{{severity}}] System Alert: {{alertType}}',
  htmlContent: `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>System Alert</title></head><body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;"><tr><td align="center" style="padding: 40px 0;"><table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"><tr><td style="{{#eq severity 'critical'}}background-color: #dc2626;{{/eq}}{{#eq severity 'warning'}}background-color: #f59e0b;{{/eq}}{{#unless severity}}background-color: #3b82f6;{{/unless}} padding: 30px; text-align: center; border-radius: 8px 8px 0 0;"><h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">System Alert</h1><p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px; text-transform: uppercase; font-weight: 600;">{{severity}} - {{alertType}}</p></td></tr><tr><td style="padding: 30px;"><p style="margin: 0 0 24px 0; color: #1f2937; font-size: 16px;">{{alertMessage}}</p>{{#if details}}<div style="background-color: #f3f4f6; padding: 16px; border-radius: 6px; margin: 24px 0;"><p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px; font-weight: 600;">Technical Details</p><p style="margin: 0; color: #1f2937; font-size: 13px; font-family: monospace; white-space: pre-wrap;">{{details}}</p></div>{{/if}}{{#if affectedUsers}}<div style="background-color: #fef3c7; padding: 12px; border-radius: 6px; margin: 16px 0;"><p style="margin: 0; color: #92400e; font-size: 14px;"><strong>Affected Users:</strong> {{affectedUsers}}</p></div>{{/if}}</td></tr></table></td></tr></table></body></html>`,
  textContent: `System Alert [{{severity}}] - {{alertType}}\n\n{{alertMessage}}\n\n{{#if details}}Technical Details:\n{{details}}\n{{/if}}{{#if affectedUsers}}Affected Users: {{affectedUsers}}\n{{/if}}`,
  variables: ['alertType', 'alertMessage', 'severity', 'timestamp', 'actionUrl', 'details', 'affectedUsers', 'supportEmail'],
  requiredVars: ['alertType', 'alertMessage', 'severity'],
};

// Export all templates
export const ALL_TEMPLATES: TemplateDefinition[] = [
  passwordResetTemplate,
  welcomeEmailTemplate,
  userInvitationTemplate,
  notificationTemplate,
  approvalRequestTemplate,
  systemAlertTemplate,
];

export const TEMPLATES_BY_KEY: Record<string, TemplateDefinition> = {
  'password-reset': passwordResetTemplate,
  'welcome-email': welcomeEmailTemplate,
  'user-invitation': userInvitationTemplate,
  'notification': notificationTemplate,
  'approval-request': approvalRequestTemplate,
  'system-alert': systemAlertTemplate,
};
