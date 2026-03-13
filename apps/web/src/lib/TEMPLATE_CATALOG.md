# Email Template Catalog

Complete reference for all 6 pre-built email templates with usage examples, variables, and best practices.

## Quick Reference

| Template | Key | Category | Purpose | When to Use |
|----------|-----|----------|---------|------------|
| Password Reset | `password-reset` | security | Account security | User initiates password recovery |
| Welcome Email | `welcome-email` | onboarding | New user activation | After account creation |
| User Invitation | `user-invitation` | collaboration | Team collaboration | Inviting users to organization |
| Notification | `notification` | notification | Generic alerts | System updates, status changes |
| Approval Request | `approval-request` | workflow | Workflow actions | Requesting approval from user |
| System Alert | `system-alert` | system | Admin alerts | Critical system notifications |

---

## Template Details

### 1. Password Reset Template

**Key**: `password-reset`  
**Category**: `security`  
**Purpose**: Send password reset link with expiration warning

#### Variables

**Required** (must provide):
- `userName` (string) - User's display name
- `resetLink` (string) - URL to reset password page
- `expiresAt` (string) - When link expires (e.g., "2 hours", "24 hours")

**Optional** (enhance message):
- `companyName` (string) - Your company/app name
- `supportEmail` (string) - Support contact email

#### Example Usage

```typescript
await emailService.sendFromTemplate('password-reset', {
  to: 'john@example.com',
  variables: {
    userName: 'John Doe',
    resetLink: 'https://app.example.com/auth/reset/token123abc',
    expiresAt: '2 hours',
    companyName: 'Acme Corp',
    supportEmail: 'support@acme.com',
  },
});
```

#### Email Output (Text Version)

```
Reset Your Password

Hi John Doe,

We received a request to reset your password. Click the link below to create a new password:

https://app.example.com/auth/reset/token123abc

⏰ This link expires 2 hours

If you can't click the link above, copy and paste it in your browser.

Didn't request this? You can safely ignore this email. Your account is secure.

---
Need help? Contact us at support@acme.com
© Acme Corp
```

#### Design Features

- **Color**: Blue (#2563eb) header for trust/security
- **Warning**: Yellow alert box for expiration deadline
- **CTA Button**: Prominent "Reset Password" button
- **Fallback**: Copy-paste link provided for email clients that don't render HTML

#### Security Notes

- All variables are automatically HTML-escaped to prevent XSS
- Link should include CSRF token (handled on landing page)
- Consider rate limiting this email (5 per recipient per minute default)
- Link should expire quickly (recommend 2-4 hours max)

---

### 2. Welcome Email Template

**Key**: `welcome-email`  
**Category**: `onboarding`  
**Purpose**: Onboard new users with activation instructions

#### Variables

**Required**:
- `userName` (string) - User's first name or full name
- `organizationName` (string) - Organization/app name
- `activationLink` (string) - URL to activate account

**Optional**:
- `nextSteps` (string) - What to do after activation
- `supportEmail` (string) - Support contact
- `welcomeMessage` (string) - Custom welcome text

#### Example Usage

```typescript
await emailService.sendFromTemplate('welcome-email', {
  to: 'jane@example.com',
  variables: {
    userName: 'Jane Smith',
    organizationName: 'Tech Startup',
    activationLink: 'https://app.example.com/onboard/activate?token=xyz789',
    nextSteps: 'Complete your profile to get started',
    supportEmail: 'onboarding@techstartup.com',
  },
});
```

#### Design Features

- **Header**: Purple gradient (from #667eea to #764ba2) for modern feel
- **Feature List**: Highlights what's included
- **Activation CTA**: Clear "Activate Your Account" button
- **Tone**: Celebratory and welcoming

#### Best Practices

- Send immediately after signup (before email confirmation if verification is asynchronous)
- Personalize with user's actual name
- Keep feature list concise (3-4 key features max)
- Link to help docs in support email
- Follow up with profile completion reminder if activation link not clicked within 24h

---

### 3. User Invitation Template

**Key**: `user-invitation`  
**Category**: `collaboration`  
**Purpose**: Invite user to join organization or team

#### Variables

**Required**:
- `inviterName` (string) - Name of person sending invite
- `organizationName` (string) - Organization being invited to
- `joinLink` (string) - Unique invite acceptance link

**Optional**:
- `expiresAt` (string) - When invite expires
- `message` (string) - Personal message from inviter
- `supportEmail` (string) - Support contact
- `role` (string) - Role being assigned

#### Example Usage

```typescript
await emailService.sendFromTemplate('user-invitation', {
  to: 'teammate@example.com',
  variables: {
    inviterName: 'Alice Johnson',
    organizationName: 'Design Team',
    joinLink: 'https://app.example.com/invites/accept/inv123',
    expiresAt: '7 days',
    message: 'Looking forward to working with you!',
    role: 'Product Designer',
    supportEmail: 'support@designteam.com',
  },
});
```

#### Design Features

- **Color**: Green (#10b981) header for positive/collaborative tone
- **Celebratory**: "🎉 You're Invited!" for excitement
- **Clear CTA**: "Accept Invitation" button
- **Expiration**: Shows when invite expires

#### Use Cases

- Invite new team members to organization
- Add collaborators to specific projects
- Grant access to shared resources
- Escalate user to team member or admin

---

### 4. Notification Template

**Key**: `notification`  
**Category**: `notification`  
**Purpose**: Generic notification for any system event

#### Variables

**Required**:
- `title` (string) - Notification headline
- `message` (string) - Notification body text

**Optional**:
- `actionUrl` (string) - Link for user to take action
- `actionText` (string) - Button text (default: "View")
- `priority` (string) - "high", "medium", "low"
- `details` (string) - Additional information
- `icon` (string) - Icon identifier
- `timestamp` (string) - When event occurred

#### Example Usage

```typescript
await emailService.sendFromTemplate('notification', {
  to: 'user@example.com',
  variables: {
    title: 'Report Complete',
    message: 'Your monthly report has been generated and is ready for download.',
    actionUrl: 'https://app.example.com/reports/monthly/2026-03',
    actionText: 'Download Report',
    details: 'Report includes: Sales, Expenses, Headcount',
    timestamp: '2026-03-13T21:15:47Z',
  },
});
```

#### Design Features

- **Flexible**: Works for any notification type
- **Action-oriented**: Optional button for user action
- **Minimal**: Clean design that doesn't distract
- **Priority Support**: Can be styled differently for urgent notifications

#### Use Cases

- Task assignment notifications
- Report generation alerts
- Status change notifications
- Batch operation completion
- System maintenance notices

---

### 5. Approval Request Template

**Key**: `approval-request`  
**Category**: `workflow`  
**Purpose**: Request approval from specific user

#### Variables

**Required**:
- `requestorName` (string) - Who is requesting approval
- `requestType` (string) - What type of request (e.g., "Budget Increase")
- `approvalLink` (string) - URL to approve request
- `rejectionLink` (string) - URL to reject request

**Optional**:
- `details` (string) - Request details
- `deadline` (string) - When decision is needed by
- `reason` (string) - Why approval is needed

#### Example Usage

```typescript
await emailService.sendFromTemplate('approval-request', {
  to: 'manager@example.com',
  variables: {
    requestorName: 'Bob Wilson',
    requestType: 'Budget Increase',
    approvalLink: 'https://app.example.com/approvals/req456/approve?token=abc123',
    rejectionLink: 'https://app.example.com/approvals/req456/reject?token=abc123',
    details: 'Requesting $50K additional budget for Q2 marketing campaign',
    deadline: '2026-03-20',
    reason: 'Campaign expanded scope requires additional resources',
  },
});
```

#### Design Features

- **Action Buttons**: Dual "Approve" (green) and "Reject" (red) buttons
- **Color**: Purple (#8b5cf6) header for workflow/process
- **Details Section**: Shows request information
- **Deadline Highlight**: Red text for urgency
- **Symmetry**: Equal visual weight for approve/reject

#### Best Practices

- Links should expire after decision is made
- Include deadline in headline if urgent
- Keep request details concise (under 200 chars)
- Consider including timeline of approval chain
- Send reminders if not approved within 2-3 days

---

### 6. System Alert Template

**Key**: `system-alert`  
**Category**: `system`  
**Purpose**: Critical system notifications for admins

#### Variables

**Required**:
- `alertType` (string) - Type of alert (e.g., "Database Connection")
- `alertMessage` (string) - Alert details
- `severity` (string) - "CRITICAL", "WARNING", "INFO"

**Optional**:
- `details` (string) - Technical details for troubleshooting
- `affectedUsers` (string) - How many users affected
- `actionUrl` (string) - Link to monitoring/dashboard
- `supportEmail` (string) - Support contact
- `timestamp` (string) - When alert was triggered

#### Example Usage

```typescript
await emailService.sendFromTemplate('system-alert', {
  to: 'admin@example.com',
  variables: {
    alertType: 'Database Connection Pool',
    alertMessage: 'Connection pool exhausted - database may be unavailable',
    severity: 'CRITICAL',
    details: 'Active connections: 100/100, Pending: 45',
    affectedUsers: '2,450 users',
    actionUrl: 'https://monitoring.example.com/dashboard/db-status',
    timestamp: '2026-03-13T21:15:47Z',
  },
});
```

#### Design Features

- **Color**: Red (#dc2626) for urgency
- **Severity Badge**: [CRITICAL], [WARNING], [INFO]
- **Technical Details**: Code block for debugging info
- **Impact**: Shows affected users count
- **Dashboard Link**: Direct action to monitoring/resolution

#### Severity Levels

- **CRITICAL** (Red) - Service down, data loss risk, immediate action required
- **WARNING** (Orange) - Degraded performance, potential issues
- **INFO** (Blue) - Informational, awareness only

#### Best Practices

- Reserve for truly critical issues (don't spam admins)
- Include steps to resolve if possible
- Update admins when issue is resolved
- Consider escalation rules (SMS for CRITICAL?)

---

## Template Usage Patterns

### 1. Authentication Flows

```typescript
// User forgets password
await emailService.sendFromTemplate('password-reset', {
  to: user.email,
  variables: {
    userName: user.name,
    resetLink: generateResetLink(user.id),
    expiresAt: '2 hours',
    companyName: 'My App',
  },
});

// User signs up
await emailService.sendFromTemplate('welcome-email', {
  to: user.email,
  variables: {
    userName: user.name,
    organizationName: org.name,
    activationLink: generateActivationLink(user.id),
  },
});
```

### 2. Collaboration & Team Management

```typescript
// Invite user to organization
await emailService.sendFromTemplate('user-invitation', {
  to: inviteeEmail,
  variables: {
    inviterName: currentUser.name,
    organizationName: org.name,
    joinLink: generateInviteLink(org.id, inviteeEmail),
    expiresAt: '7 days',
    message: `Hi! I'd like you to join our team.`,
    role: 'Team Member',
  },
});
```

### 3. Workflow & Approvals

```typescript
// Request approval
await emailService.sendFromTemplate('approval-request', {
  to: approver.email,
  variables: {
    requestorName: requester.name,
    requestType: 'Budget Increase',
    approvalLink: generateApprovalLink(request.id, 'approve'),
    rejectionLink: generateApprovalLink(request.id, 'reject'),
    details: request.summary,
    deadline: request.deadline,
  },
});
```

### 4. Notifications & Alerts

```typescript
// Generic notification
await emailService.sendFromTemplate('notification', {
  to: user.email,
  variables: {
    title: 'Report Ready',
    message: 'Your monthly analytics report is ready.',
    actionUrl: generateReportLink(report.id),
    actionText: 'View Report',
  },
});

// System alert
await emailService.sendFromTemplate('system-alert', {
  to: 'ops@company.com',
  variables: {
    alertType: 'API Rate Limit',
    alertMessage: 'Rate limiter activated - requests being throttled',
    severity: 'WARNING',
    affectedUsers: Math.floor(throttledRequests).toString(),
  },
});
```

---

## Error Handling

### Missing Required Variables

```typescript
// ❌ WILL FAIL - Missing required variables
await emailService.sendFromTemplate('password-reset', {
  to: 'user@example.com',
  variables: {
    userName: 'John', // Missing resetLink and expiresAt
  },
});

// Result: EmailError with code 'VALIDATION_ERROR'
// Message: "Missing required variables: resetLink, expiresAt"
```

### Template Not Found

```typescript
// ❌ WILL FAIL - Template doesn't exist
await emailService.sendFromTemplate('non-existent-template', {
  to: 'user@example.com',
  variables: {},
});

// Result: EmailError with code 'TEMPLATE_NOT_FOUND'
// Message: "Template 'non-existent-template' not found"
```

### Invalid Email Address

```typescript
// ❌ WILL FAIL - Invalid email
await emailService.sendFromTemplate('welcome-email', {
  to: 'not-an-email',
  variables: { /* ... */ },
});

// Result: EmailError with code 'INVALID_EMAIL'
// Message: "Invalid email address: not-an-email"
```

### Rate Limited

```typescript
// ❌ MAY FAIL - Too many emails to same recipient
for (let i = 0; i < 10; i++) {
  await emailService.sendFromTemplate('notification', {
    to: 'user@example.com', // Same recipient
    variables: { /* ... */ },
  });
}

// Result: EmailError with code 'RATE_LIMIT_EXCEEDED'
// Message: "Too many emails to user@example.com (limit: 5 per minute)"
// Retry: Automatic (3 attempts with exponential backoff)
```

---

## Best Practices

### ✅ DO

- **Validate variables** before sending
- **Use required variables** consistently
- **Include support contact** in optional fields
- **Test templates** with your data before production
- **Monitor delivery** via audit logs
- **Use rate limiting** to prevent spam
- **Escape user input** automatically (handled by EmailService)
- **Keep templates active** until archival needed

### ❌ DON'T

- **Send without required variables** (use try/catch)
- **Hardcode personal data** in templates
- **Override XSS protection** (let EmailService handle escaping)
- **Ignore rate limiting** warnings
- **Delete templates** (archive instead)
- **Send duplicate emails** (check logs first)
- **Modify template HTML** directly (use admin UI in Phase 3+)
- **Use templates for marketing** (not designed for bulk campaigns)

---

## Template Extensibility

### Adding Custom Variables

Provide additional variables beyond required/optional set:

```typescript
// ✅ Custom variables are supported
await emailService.sendFromTemplate('welcome-email', {
  to: 'user@example.com',
  variables: {
    userName: 'Jane',
    organizationName: 'Acme',
    activationLink: 'https://activate.com',
    customField: 'Custom Value', // Extra variable
    anotherCustom: 'Another Value', // Won't cause error
  },
});
// Unrendered custom variables are silently ignored
```

### Using Handlebars Conditionals

Templates support Handlebars syntax for advanced logic:

```typescript
// Template supports:
// {{#if supportEmail}}Contact: {{supportEmail}}{{/if}}
// {{#unless shipped}}Order processing...{{/unless}}
// {{#each items}} - {{this}} {{/each}}

await emailService.sendFromTemplate('notification', {
  to: 'user@example.com',
  variables: {
    title: 'Important Update',
    message: 'Your order is being processed',
    supportEmail: 'support@company.com', // Will render conditional
  },
});
```

---

## Monitoring & Metrics

### Track Template Sends

```typescript
// EmailService automatically logs:
// - Template used
// - Recipient email
// - Success/failure status
// - Errors (if any)
// - Retry attempts

const stats = emailService.getStats();
console.log(`Password Reset Emails Sent: ${stats.successCount}`);
console.log(`Failed Sends: ${stats.errorCounts['SMTP_ERROR']}`);
```

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Template not found" | Verify template key is correct |
| "Missing required variables" | Check template documentation |
| "Rate limit exceeded" | Wait 60 seconds or use different recipient |
| "Invalid email" | Validate email format before sending |
| "SMTP error" | Check SMTP credentials in env vars |
| "No support contact" | Add supportEmail to optional variables |

---

## Next Steps

- **Phase 3**: Admin UI for template preview & editing
- **Phase 4**: API endpoints for dynamic template creation
- **Phase 5**: A/B testing variants
- **Phase 6**: Email provider integrations (SendGrid, AWS SES)
