# EmailService API Documentation

## Overview

`EmailService` is a robust, production-ready email sending service that handles template rendering, SMTP communication, error recovery, rate limiting, and comprehensive logging.

## Installation

```typescript
import { emailService } from '@/lib/email-service';
```

## Core Methods

### `send(options: SendEmailOptions): Promise<{ messageId: string; logId: string }>`

Send a single email using a template.

**Parameters:**
- `templateKey` (string): Unique identifier for the template (kebab-case, e.g., `password-reset`)
- `recipient` (string): Email address of the recipient
- `variables` (Record<string, any>): Template variables for rendering
- `abTestVariant` (string, optional): A/B test variant identifier

**Returns:**
- `messageId`: SMTP message ID (for tracking with email provider)
- `logId`: EmailSendLog ID (for database tracking)

**Error Handling:**
- Throws `Error` with code on validation failures
- Automatically retries up to 3 times with exponential backoff (1s, 2s, 4s)
- Non-retryable errors fail immediately
- All failures logged to database

**Example:**
```typescript
try {
  const result = await emailService.send({
    templateKey: 'password-reset',
    recipient: 'user@example.com',
    variables: {
      userName: 'John Doe',
      resetLink: 'https://example.com/reset?token=abc123',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    },
  });
  
  console.log(`Email sent: ${result.messageId}`);
} catch (error) {
  console.error(`Failed to send email: ${error.message}`);
}
```

---

### `sendTest(templateKey: string, recipientEmail: string, testVariables: Record<string, any>): Promise<{ messageId: string; logId: string }>`

Send a test email with sample data. Useful for previewing templates before sending to production.

**Parameters:**
- `templateKey` (string): Template identifier
- `recipientEmail` (string): Test recipient email
- `testVariables` (Record<string, any>): Sample variables for rendering

**Example:**
```typescript
const result = await emailService.sendTest('welcome-email', 'admin@example.com', {
  userName: 'Test User',
  activationLink: 'https://example.com/activate?token=test123',
});

console.log(`Test email sent to admin@example.com`);
```

---

### `sendBulk(templateKey: string, recipients: Array<{ email: string; variables: Record<string, any> }>, options?: { abTestVariant?: string; delayMs?: number }): Promise<BulkSendResult[]>`

Send emails to multiple recipients with progress tracking.

**Parameters:**
- `templateKey` (string): Template identifier
- `recipients` (Array): List of recipients with individual variables
- `options` (optional):
  - `abTestVariant` (string): Variant for A/B testing
  - `delayMs` (number, default: 100): Delay between sends (prevents overwhelming SMTP)

**Returns:**
Array of results, one per recipient:
```typescript
{
  email: string;
  messageId: string;
  logId: string;
  error?: string;  // Present if send failed
}
```

**Example:**
```typescript
const recipients = [
  {
    email: 'user1@example.com',
    variables: { userName: 'User 1', activationCode: 'CODE001' }
  },
  {
    email: 'user2@example.com',
    variables: { userName: 'User 2', activationCode: 'CODE002' }
  },
];

const results = await emailService.sendBulk('user-invitation', recipients, {
  delayMs: 200,  // 200ms between sends
});

// Analyze results
const successful = results.filter(r => !r.error).length;
const failed = results.filter(r => r.error).length;

console.log(`Sent: ${successful}/${results.length}`);
if (failed > 0) {
  results.filter(r => r.error).forEach(r => {
    console.error(`Failed to send to ${r.email}: ${r.error}`);
  });
}
```

---

### `preview(options: PreviewEmailOptions): Promise<{ subject: string; html: string; text?: string }>`

Render a template without sending it. Useful for previewing emails in the UI.

**Parameters:**
- `templateKey` (string): Template identifier
- `variables` (Record<string, any>): Variables for rendering

**Returns:**
- `subject` (string): Rendered subject line
- `html` (string): Rendered HTML content
- `text` (string, optional): Rendered plain text version

**Example:**
```typescript
const preview = await emailService.preview({
  templateKey: 'password-reset',
  variables: {
    userName: 'John Doe',
    resetLink: 'https://example.com/reset?token=abc123',
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
  },
});

// Display preview in iframe
document.getElementById('preview').srcDoc = preview.html;
```

---

### `getSendHistory(templateId: string, options?: { limit?: number; status?: string; since?: Date }): Promise<EmailSendLog[]>`

Retrieve send history for a template with optional filtering.

**Parameters:**
- `templateId` (string): Template ID (from database)
- `options` (optional):
  - `limit` (number, default: 100): Max records to return
  - `status` (string): Filter by status (`sent`, `failed`, `pending`, `bounced`)
  - `since` (Date): Filter records created after this date

**Example:**
```typescript
// Get last 50 successful sends
const history = await emailService.getSendHistory(templateId, {
  limit: 50,
  status: 'sent',
  since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),  // Last 7 days
});

history.forEach(log => {
  console.log(`${log.recipient} - ${log.status} at ${log.sentAt}`);
});
```

---

### `getStats(templateId: string, days?: number): Promise<EmailStats>`

Get comprehensive statistics for a template.

**Parameters:**
- `templateId` (string): Template ID
- `days` (number, default: 30): Historical period to analyze

**Returns:**
```typescript
{
  total: number;           // Total emails processed
  sent: number;            // Successfully sent
  failed: number;          // Failed
  pending: number;         // Pending delivery
  bounced: number;         // Bounced
  successRate: number;     // Percentage (0-100)
  failureRate: number;     // Percentage (0-100)
  period: string;          // "30 days" etc.
  topErrors: Array<{       // Top 5 error messages
    message: string;
    count: number;
  }>;
}
```

**Example:**
```typescript
const stats = await emailService.getStats(templateId, 30);

console.log(`Success rate: ${stats.successRate}%`);
console.log(`Total sent: ${stats.sent}/${stats.total}`);

if (stats.topErrors.length > 0) {
  console.log('Top errors:');
  stats.topErrors.forEach(err => {
    console.log(`  - ${err.message} (${err.count} times)`);
  });
}
```

---

## Error Handling

### Error Codes

The EmailService returns errors with specific codes for programmatic handling:

| Code | Status | Retryable | Description |
|------|--------|-----------|-------------|
| `INVALID_EMAIL` | 400 | No | Email format validation failed |
| `INVALID_TEMPLATE_KEY` | 400 | No | Template key format invalid |
| `RATE_LIMIT_EXCEEDED` | 429 | Yes | Too many emails sent to recipient |
| `MISSING_VARIABLES` | 400 | No | Required template variables missing |
| `MISSING_CONFIG` | 500 | No | SMTP settings not configured |
| `TEMPLATE_NOT_FOUND` | 404 | No | Template doesn't exist or not active |
| `RENDERING_ERROR` | 500 | No | Handlebars template rendering failed |
| `SMTP_ERROR` | 500 | Yes | SMTP connection or send error |

### Getting Last Error

```typescript
try {
  await emailService.send(options);
} catch (error) {
  const lastError = emailService.getLastError();
  console.error(`Error code: ${lastError?.code}`);
  console.error(`Retryable: ${lastError?.retryable}`);
}

// Reset error state
emailService.resetErrorState();
```

---

## Features

### 1. Automatic Retry with Exponential Backoff

Transient failures are automatically retried up to 3 times:
- Attempt 1: Immediate
- Attempt 2: After 1 second
- Attempt 3: After 2 seconds
- Attempt 4: After 4 seconds

Non-retryable errors (validation, configuration) fail immediately.

### 2. Rate Limiting

Prevents spam by limiting emails to the same recipient:
- **Default**: 5 emails per recipient per minute
- Customizable via constructor parameters
- Returns `429 Too Many Requests` error when exceeded

### 3. XSS Prevention

All template variables are automatically HTML-escaped before rendering:
- Special characters (`<`, `>`, `&`, `"`, `'`) are converted to HTML entities
- Recursive escaping for nested objects and arrays
- Protects against injection attacks in template variables

### 4. Comprehensive Logging

Every email operation is logged with metadata:
- **Timestamp**: When the email was sent/failed
- **Status**: `sent`, `failed`, `pending`, `bounced`
- **Variables**: Actual values used (for debugging)
- **Error Message**: Failure reason if applicable
- **Message ID**: From SMTP provider (for tracking)
- **A/B Test Variant**: Which variant was sent (if applicable)

Log levels:
- `debug`: Template rendering, config retrieval (dev only)
- `info`: Email sent successfully, bulk send progress
- `warn`: Rate limit warnings, partial failures
- `error`: Critical failures, SMTP errors

### 5. Template Validation

Before sending, the service validates:
- Template exists and is active
- All required variables are provided
- Handlebars syntax is valid
- Email address format is valid

### 6. A/B Testing Support

Track which email variant was sent:

```typescript
const result = await emailService.send({
  templateKey: 'welcome-email',
  recipient: 'user@example.com',
  variables: { userName: 'John' },
  abTestVariant: 'variant_a',  // Track this variant
});

// Later, analyze stats by variant in database
```

---

## Usage Patterns

### Pattern 1: Basic Email Sending

```typescript
await emailService.send({
  templateKey: 'password-reset',
  recipient: user.email,
  variables: {
    userName: user.name,
    resetLink: `https://app.example.com/reset?token=${token}`,
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
  },
});
```

### Pattern 2: Bulk User Onboarding

```typescript
const newUsers = await db.user.findMany({ where: { onboardingEmailSent: false } });

const recipients = newUsers.map(user => ({
  email: user.email,
  variables: {
    userName: user.name,
    activationLink: `https://app.example.com/activate?id=${user.id}&token=${generateToken()}`,
  },
}));

const results = await emailService.sendBulk('welcome-email', recipients, {
  delayMs: 250,  // Space out sends
});

// Mark successfully sent users
await Promise.all(
  results
    .filter(r => !r.error)
    .map(r => 
      db.user.update({
        where: { email: r.email },
        data: { onboardingEmailSent: true },
      })
    )
);
```

### Pattern 3: Admin Dashboard Notifications

```typescript
// Get template stats for display
const stats = await emailService.getStats(templateId, 7);

const dashboard = {
  template: template.name,
  sent: stats.sent,
  failed: stats.failed,
  successRate: `${stats.successRate}%`,
  topIssues: stats.topErrors.slice(0, 3),
};
```

### Pattern 4: Preview Before Sending

```typescript
// Admin wants to preview email with real user data
const preview = await emailService.preview({
  templateKey: 'user-invitation',
  variables: {
    inviterName: 'Sarah Johnson',
    organizationName: 'Acme Corp',
    joinLink: `https://app.example.com/join?org=acme&token=${token}`,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
});

// Display HTML in iframe
res.render('preview', { html: preview.html });
```

---

## Configuration

EmailService reads SMTP settings from the database:

```typescript
// Settings stored in SystemConfig table with key: 'smtp_settings'
const smtpSettings = {
  host: 'smtp.gmail.com',
  port: 587,
  username: 'noreply@example.com',
  password: 'app-specific-password',
  tls: true,
  ssl: false,
  fromEmail: 'noreply@example.com',
};

// Stored as:
await prisma.systemConfig.upsert({
  where: { key: 'smtp_settings' },
  create: { key: 'smtp_settings', value: smtpSettings },
  update: { value: smtpSettings },
});
```

### Dynamic Reconfiguration

SMTP settings are retrieved at send time, allowing live reconfiguration without server restart.

---

## Performance Considerations

### 1. Bulk Send Delays

Default 100ms delay between bulk sends. Adjust based on your SMTP provider's limits:

```typescript
// For high-volume sends with dedicated SMTP, reduce delay
await emailService.sendBulk(templateKey, recipients, { delayMs: 50 });

// For shared SMTP or rate-limited providers, increase delay
await emailService.sendBulk(templateKey, recipients, { delayMs: 500 });
```

### 2. Template Caching

Frequently accessed templates are cached in the database connection pool. No additional caching needed.

### 3. Rate Limiting

Rate limit store is in-memory. For distributed deployments, consider switching to Redis:

```typescript
// Future enhancement: Redis-backed rate limiter
// const rateLimitStore = new RedisRateLimiter();
```

---

## Testing

### Unit Testing

```typescript
import { EmailService } from '@/lib/email-service';

describe('EmailService', () => {
  let emailService: EmailService;

  beforeEach(() => {
    emailService = new EmailService();
  });

  test('should validate email formats', () => {
    const isValid = (emailService as any).validateEmailFormat('test@example.com');
    expect(isValid).toBe(true);
  });

  test('should handle rate limiting', () => {
    const recipient = 'test@example.com';
    const allowed = (emailService as any).checkRateLimit(recipient);
    expect(allowed).toBe(true);
  });
});
```

### Integration Testing

```typescript
test('should send email end-to-end', async () => {
  const result = await emailService.send({
    templateKey: 'test-template',
    recipient: 'test@example.com',
    variables: { name: 'Test' },
  });

  expect(result.messageId).toBeDefined();
  expect(result.logId).toBeDefined();

  // Verify log in database
  const log = await prisma.emailSendLog.findUnique({
    where: { id: result.logId },
  });
  expect(log?.status).toBe('sent');
});
```

---

## Troubleshooting

### Emails Not Sending

1. **Check SMTP Settings**
   ```typescript
   const config = await prisma.systemConfig.findUnique({
     where: { key: 'smtp_settings' },
   });
   console.log(config?.value);
   ```

2. **Check Last Error**
   ```typescript
   const lastError = emailService.getLastError();
   console.error(lastError?.message);
   console.error(lastError?.code);
   ```

3. **Review Logs**
   ```typescript
   const logs = await prisma.emailSendLog.findMany({
     where: { status: 'failed' },
     orderBy: { createdAt: 'desc' },
     take: 10,
   });
   logs.forEach(log => console.error(log.errorMessage));
   ```

### Rate Limit Issues

Clear rate limit for testing:
```typescript
emailService.clearRateLimit('test@example.com');
```

### Template Rendering Errors

Test rendering without sending:
```typescript
const preview = await emailService.preview({
  templateKey: 'my-template',
  variables: { name: 'Test' },
});
```

---

## Future Enhancements

- [ ] Email provider integrations (SendGrid, AWS SES)
- [ ] Webhook support for delivery tracking
- [ ] Email scheduling/delayed sends
- [ ] Redis-backed rate limiting for distributed deployments
- [ ] A/B testing analytics dashboard
- [ ] Batch processing queue with job status
- [ ] Template branching/versioning with approval workflow
- [ ] Email preference center for recipients
