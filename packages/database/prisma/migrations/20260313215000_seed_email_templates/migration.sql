-- Seed 6 pre-built email templates
-- Password Reset
INSERT INTO "email_templates" (id, key, name, description, category, subject, "htmlContent", "textContent", variables, "requiredVars", "isActive", "isArchived", version, "isABTest", "createdAt", "updatedAt")
VALUES (
  'tpl_pwd_reset_001',
  'password-reset',
  'Password Reset',
  'Email template for password reset requests with expiration and security warnings',
  'security',
  'Reset your password - {{companyName}}',
  '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Reset Your Password</title></head><body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f5f5;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;"><tr><td align="center" style="padding: 40px 0;"><table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"><tr><td style="background-color: #2563eb; padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;"><h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Reset Your Password</h1></td></tr><tr><td style="padding: 40px 30px;"><p style="margin: 0 0 24px 0; color: #1f2937; font-size: 16px; line-height: 1.6;">Hi {{userName}},</p><p style="margin: 0 0 24px 0; color: #1f2937; font-size: 16px; line-height: 1.6;">We received a request to reset your password. Click the button below to create a new password:</p><div style="margin: 32px 0; text-align: center;"><a href="{{resetLink}}" style="background-color: #2563eb; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; display: inline-block;">Reset Password</a></div><div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 4px;"><p style="margin: 0; color: #92400e; font-size: 14px;"><strong>⏰ This link expires {{expiresAt}}</strong></p></div><p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">If you can''t click the button above, copy and paste this link in your browser:</p><p style="margin: 8px 0 24px 0; color: #2563eb; font-size: 14px; word-break: break-all;">{{resetLink}}</p><p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">Didn''t request this? You can safely ignore this email. Your account is secure.</p></td></tr><tr><td style="border-top: 1px solid #e5e7eb; padding: 24px 30px; text-align: center; color: #6b7280; font-size: 12px;">{{#if supportEmail}}<p style="margin: 0 0 8px 0;">Need help? <a href="mailto:{{supportEmail}}" style="color: #2563eb; text-decoration: none;">Contact Support</a></p>{{/if}}<p style="margin: 0;">© {{companyName}}. All rights reserved.</p></td></tr></table></td></tr></table></body></html>',
  E'Reset Your Password\n\nHi {{userName}},\n\nWe received a request to reset your password. Click the link below to create a new password:\n\n{{resetLink}}\n\n⏰ This link expires {{expiresAt}}\n\nIf you can\'t click the link above, copy and paste it in your browser.\n\nDidn\'t request this? You can safely ignore this email. Your account is secure.\n\n---\n{{#if supportEmail}}Need help? Contact us at {{supportEmail}}\n{{/if}}\n© {{companyName}}',
  ARRAY['userName', 'resetLink', 'expiresAt', 'companyName', 'supportEmail'],
  ARRAY['userName', 'resetLink', 'expiresAt'],
  true,
  false,
  1,
  false,
  NOW(),
  NOW()
) ON CONFLICT(key) DO NOTHING;

-- Welcome Email
INSERT INTO "email_templates" (id, key, name, description, category, subject, "htmlContent", "textContent", variables, "requiredVars", "isActive", "isArchived", version, "isABTest", "createdAt", "updatedAt")
VALUES (
  'tpl_welcome_001',
  'welcome-email',
  'Welcome Email',
  'New user welcome email with onboarding information and activation link',
  'onboarding',
  'Welcome to {{organizationName}}, {{userName}}!',
  '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Welcome</title></head><body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; background-color: #f5f5f5;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;"><tr><td align="center" style="padding: 40px 0;"><table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"><tr><td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;"><h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 600;">Welcome, {{userName}}! 👋</h1></td></tr><tr><td style="padding: 40px 30px;"><p style="margin: 0 0 24px 0; color: #1f2937; font-size: 16px;">Get started with {{organizationName}}</p><div style="background-color: #f9fafb; padding: 24px; border-radius: 6px; margin: 24px 0;"><h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 16px; font-weight: 600;">What''s Included:</h3><ul style="margin: 0; padding-left: 20px; color: #6b7280; font-size: 14px;"><li>Full access to all {{organizationName}} features</li><li>Personalized dashboard and settings</li><li>Priority support</li><li>Regular updates and new features</li></ul></div><div style="margin: 32px 0; text-align: center;"><a href="{{activationLink}}" style="background-color: #667eea; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; display: inline-block;">Activate Your Account</a></div></td></tr><tr><td style="border-top: 1px solid #e5e7eb; padding: 24px 30px; text-align: center; color: #6b7280; font-size: 12px;">{{#if supportEmail}}<p style="margin: 0 0 8px 0;">Questions? <a href="mailto:{{supportEmail}}" style="color: #667eea; text-decoration: none;">Contact support</a></p>{{/if}}<p style="margin: 0;">© {{organizationName}}</p></td></tr></table></td></tr></table></body></html>',
  E'Welcome to {{organizationName}}, {{userName}}!\n\nGet started:\n\nActivate your account: {{activationLink}}\n\nWhat''s Included:\n- Full access to all {{organizationName}} features\n- Personalized dashboard and settings\n- Priority support\n- Regular updates and new features\n\n---\n{{#if supportEmail}}Questions? Contact us at {{supportEmail}}\n{{/if}}\n© {{organizationName}}',
  ARRAY['userName', 'organizationName', 'activationLink', 'nextSteps', 'supportEmail', 'welcomeMessage'],
  ARRAY['userName', 'organizationName', 'activationLink'],
  true,
  false,
  1,
  false,
  NOW(),
  NOW()
) ON CONFLICT(key) DO NOTHING;

-- User Invitation
INSERT INTO "email_templates" (id, key, name, description, category, subject, "htmlContent", "textContent", variables, "requiredVars", "isActive", "isArchived", version, "isABTest", "createdAt", "updatedAt")
VALUES (
  'tpl_invite_001',
  'user-invitation',
  'User Invitation',
  'Invitation email for joining an organization or system',
  'collaboration',
  '{{inviterName}} invites you to join {{organizationName}}',
  '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>You''re Invited</title></head><body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; background-color: #f5f5f5;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;"><tr><td align="center" style="padding: 40px 0;"><table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"><tr><td style="background-color: #10b981; padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;"><h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">You''re Invited! 🎉</h1></td></tr><tr><td style="padding: 40px 30px;"><p style="margin: 0 0 24px 0; color: #1f2937; font-size: 16px;"><strong>{{inviterName}}</strong> has invited you to join <strong>{{organizationName}}</strong></p><p style="margin: 24px 0; color: #1f2937; font-size: 16px;">You''ll be able to collaborate with the team and access all organization resources.</p><div style="margin: 32px 0; text-align: center;"><a href="{{joinLink}}" style="background-color: #10b981; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; display: inline-block;">Accept Invitation</a></div></td></tr><tr><td style="border-top: 1px solid #e5e7eb; padding: 24px 30px; text-align: center; color: #6b7280; font-size: 12px;">{{#if supportEmail}}<p style="margin: 0 0 8px 0;">Questions? <a href="mailto:{{supportEmail}}" style="color: #10b981; text-decoration: none;">Contact support</a></p>{{/if}}<p style="margin: 0;">© {{organizationName}}</p></td></tr></table></td></tr></table></body></html>',
  E'You''re Invited!\n\n{{inviterName}} has invited you to join {{organizationName}}\n\nYou''ll be able to collaborate with the team and access all organization resources.\n\nAccept: {{joinLink}}\n\n---\n{{#if supportEmail}}Questions? Contact us at {{supportEmail}}\n{{/if}}\n© {{organizationName}}',
  ARRAY['inviterName', 'organizationName', 'joinLink', 'expiresAt', 'message', 'supportEmail', 'role'],
  ARRAY['inviterName', 'organizationName', 'joinLink'],
  true,
  false,
  1,
  false,
  NOW(),
  NOW()
) ON CONFLICT(key) DO NOTHING;

-- Notification
INSERT INTO "email_templates" (id, key, name, description, category, subject, "htmlContent", "textContent", variables, "requiredVars", "isActive", "isArchived", version, "isABTest", "createdAt", "updatedAt")
VALUES (
  'tpl_notif_001',
  'notification',
  'Notification',
  'Generic notification template for alerts and updates with priority levels',
  'notification',
  '{{title}} - Notification',
  '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>{{title}}</title></head><body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; background-color: #f5f5f5;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;"><tr><td align="center" style="padding: 40px 0;"><table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"><tr><td style="background-color: #3b82f6; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;"><h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">{{title}}</h1></td></tr><tr><td style="padding: 30px;"><p style="margin: 0 0 24px 0; color: #1f2937; font-size: 16px;">{{message}}</p>{{#if details}}<div style="background-color: #f9fafb; padding: 16px; border-radius: 6px; margin: 24px 0;"><p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px; font-weight: 600;">Details</p><p style="margin: 0; color: #1f2937; font-size: 14px;">{{details}}</p></div>{{/if}}{{#if actionUrl}}<div style="margin: 32px 0; text-align: center;"><a href="{{actionUrl}}" style="background-color: #3b82f6; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; display: inline-block;">{{actionText}}{{#unless actionText}}View{{/unless}}</a></div>{{/if}}</td></tr></table></td></tr></table></body></html>',
  E'{{title}}\n\n{{message}}\n\n{{#if details}}Details: {{details}}\n{{/if}}{{#if actionUrl}}View: {{actionUrl}}\n{{/if}}',
  ARRAY['title', 'message', 'actionUrl', 'priority', 'actionText', 'icon', 'details', 'timestamp'],
  ARRAY['title', 'message', 'actionUrl'],
  true,
  false,
  1,
  false,
  NOW(),
  NOW()
) ON CONFLICT(key) DO NOTHING;

-- Approval Request
INSERT INTO "email_templates" (id, key, name, description, category, subject, "htmlContent", "textContent", variables, "requiredVars", "isActive", "isArchived", version, "isABTest", "createdAt", "updatedAt")
VALUES (
  'tpl_approval_001',
  'approval-request',
  'Approval Request',
  'Approval workflow email with accept/reject options',
  'workflow',
  'Approval needed: {{requestType}} from {{requestorName}}',
  '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Approval Request</title></head><body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; background-color: #f5f5f5;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;"><tr><td align="center" style="padding: 40px 0;"><table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"><tr><td style="background-color: #8b5cf6; padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;"><h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Approval Request</h1><p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">{{requestType}}</p></td></tr><tr><td style="padding: 40px 30px;"><p style="margin: 0 0 24px 0; color: #1f2937; font-size: 16px;"><strong>{{requestorName}}</strong> has submitted a <strong>{{requestType}}</strong> requiring your approval.</p><div style="background-color: #f9fafb; padding: 24px; border-radius: 6px; margin: 24px 0;">{{#if reason}}<p style="margin: 0 0 16px 0; color: #1f2937; font-size: 14px;"><strong>Reason:</strong><br/>{{reason}}</p>{{/if}}{{#if details}}<p style="margin: 0 0 16px 0; color: #1f2937; font-size: 14px;"><strong>Details:</strong><br/>{{details}}</p>{{/if}}{{#if deadline}}<p style="margin: 0; color: #dc2626; font-size: 14px;"><strong>⏰ Deadline:</strong> {{deadline}}</p>{{/if}}</div><div style="margin: 32px 0; text-align: center;"><a href="{{approvalLink}}" style="background-color: #10b981; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; display: inline-block; margin-right: 12px;">✓ Approve</a><a href="{{rejectionLink}}" style="background-color: #ef4444; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; display: inline-block;">✗ Reject</a></div></td></tr></table></td></tr></table></body></html>',
  E'Approval Request - {{requestType}}\n\n{{requestorName}} has submitted a {{requestType}} requiring your approval.\n\n{{#if reason}}Reason: {{reason}}\n{{/if}}{{#if details}}Details: {{details}}\n{{/if}}{{#if deadline}}Deadline: {{deadline}}\n{{/if}}\nApprove: {{approvalLink}}\nReject: {{rejectionLink}}',
  ARRAY['requestorName', 'requestType', 'approvalLink', 'rejectionLink', 'details', 'deadline', 'reason'],
  ARRAY['requestorName', 'requestType', 'approvalLink', 'rejectionLink'],
  true,
  false,
  1,
  false,
  NOW(),
  NOW()
) ON CONFLICT(key) DO NOTHING;

-- System Alert
INSERT INTO "email_templates" (id, key, name, description, category, subject, "htmlContent", "textContent", variables, "requiredVars", "isActive", "isArchived", version, "isABTest", "createdAt", "updatedAt")
VALUES (
  'tpl_alert_001',
  'system-alert',
  'System Alert',
  'Critical system notification email for admins with severity levels',
  'system',
  '[{{severity}}] System Alert: {{alertType}}',
  '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>System Alert</title></head><body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; background-color: #f5f5f5;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;"><tr><td align="center" style="padding: 40px 0;"><table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"><tr><td style="background-color: #dc2626; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;"><h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">System Alert</h1><p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px; text-transform: uppercase; font-weight: 600;">{{severity}} - {{alertType}}</p></td></tr><tr><td style="padding: 30px;"><p style="margin: 0 0 24px 0; color: #1f2937; font-size: 16px;">{{alertMessage}}</p>{{#if details}}<div style="background-color: #f3f4f6; padding: 16px; border-radius: 6px; margin: 24px 0;"><p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px; font-weight: 600;">Technical Details</p><p style="margin: 0; color: #1f2937; font-size: 13px; font-family: monospace; white-space: pre-wrap;">{{details}}</p></div>{{/if}}{{#if affectedUsers}}<div style="background-color: #fef3c7; padding: 12px; border-radius: 6px; margin: 16px 0;"><p style="margin: 0; color: #92400e; font-size: 14px;"><strong>Affected Users:</strong> {{affectedUsers}}</p></div>{{/if}}</td></tr></table></td></tr></table></body></html>',
  E'System Alert [{{severity}}] - {{alertType}}\n\n{{alertMessage}}\n\n{{#if details}}Technical Details:\n{{details}}\n{{/if}}{{#if affectedUsers}}Affected Users: {{affectedUsers}}\n{{/if}}',
  ARRAY['alertType', 'alertMessage', 'severity', 'timestamp', 'actionUrl', 'details', 'affectedUsers', 'supportEmail'],
  ARRAY['alertType', 'alertMessage', 'severity'],
  true,
  false,
  1,
  false,
  NOW(),
  NOW()
) ON CONFLICT(key) DO NOTHING;
