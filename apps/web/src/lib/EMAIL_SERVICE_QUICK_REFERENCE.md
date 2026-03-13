# EmailService Quick Reference

## Import
```typescript
import { emailService } from '@/lib/email-service';
```

## Quick Examples

### Send Single Email
```typescript
const result = await emailService.send({
  templateKey: 'password-reset',
  recipient: user.email,
  variables: {
    resetLink: `https://app.com/reset?token=${token}`,
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
  },
});
console.log(`Email sent: ${result.messageId}`);
```

### Send Test Email
```typescript
await emailService.sendTest('password-reset', 'admin@example.com', {
  resetLink: 'https://app.com/reset?token=test123',
  expiresAt: new Date().toISOString(),
});
```

### Send Bulk Emails
```typescript
const recipients = users.map(user => ({
  email: user.email,
  variables: {
    name: user.name,
    joinLink: `https://app.com/join?id=${user.id}&token=${token}`,
  },
}));

const results = await emailService.sendBulk('welcome-email', recipients, {
  delayMs: 200,
});

// Check results
results.forEach(r => {
  if (r.error) {
    console.error(`Failed: ${r.email} - ${r.error}`);
  } else {
    console.log(`Sent: ${r.email}`);
  }
});
```

### Preview Email (No Send)
```typescript
const { subject, html, text } = await emailService.preview({
  templateKey: 'password-reset',
  variables: {
    resetLink: 'https://app.com/reset?token=test123',
    expiresAt: new Date().toISOString(),
  },
});

// Use in iframe or email client preview
```

### Get Statistics
```typescript
const stats = await emailService.getStats(templateId, 30);

console.log(`Sent: ${stats.sent}/${stats.total}`);
console.log(`Success rate: ${stats.successRate}%`);
console.log(`Top errors:`);
stats.topErrors.forEach(e => console.log(`  - ${e.message} (${e.count}x)`));
```

### Get Send History
```typescript
// All sends for a template (last 100)
const history = await emailService.getSendHistory(templateId);

// Failed sends in last 7 days
const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
const failures = await emailService.getSendHistory(templateId, {
  status: 'failed',
  since,
  limit: 50,
});
```

### Error Handling
```typescript
try {
  await emailService.send(options);
} catch (error) {
  const emailError = emailService.getLastError();
  
  switch (emailError?.code) {
    case 'INVALID_EMAIL':
      console.error('Invalid email format');
      break;
    case 'RATE_LIMIT_EXCEEDED':
      console.error('Too many emails to this recipient');
      break;
    case 'SMTP_ERROR':
      console.error('SMTP connection failed (will retry automatically)');
      break;
    default:
      console.error(`Send failed: ${emailError?.message}`);
  }
}
```

## Common Error Codes

| Code | Meaning | Retryable | HTTP |
|------|---------|-----------|------|
| `INVALID_EMAIL` | Bad email format | ❌ | 400 |
| `INVALID_TEMPLATE_KEY` | Bad template key | ❌ | 400 |
| `RATE_LIMIT_EXCEEDED` | Too many emails | ✅ | 429 |
| `MISSING_VARIABLES` | Missing template vars | ❌ | 400 |
| `TEMPLATE_NOT_FOUND` | Template doesn't exist | ❌ | 404 |
| `MISSING_CONFIG` | SMTP not configured | ❌ | 500 |
| `SMTP_ERROR` | SMTP connection failed | ✅ | 500 |

## Rate Limits

- **Default**: 5 emails per recipient per minute
- **Window**: 60 seconds
- **Error**: `RATE_LIMIT_EXCEEDED`
- **Status**: 429 Too Many Requests

For testing, clear rate limit:
```typescript
emailService.clearRateLimit('test@example.com');
```

## Retry Behavior

Automatic retry logic:
- **Retries**: Up to 3 times
- **Backoff**: Exponential (1s, 2s, 4s delays)
- **Retryable errors**: SMTP, connection, timeouts
- **Non-retryable**: Validation, configuration, format

## Logging

Four levels (automatically logged):
- `debug` - Dev only, template rendering details
- `info` - Successful sends, bulk progress
- `warn` - Rate limits, partial failures
- `error` - Critical failures, validation errors

## Performance Tips

### For Bulk Sends
- Increase `delayMs` to prevent SMTP overload
- Default: 100ms
- For high-volume: start with 100ms, increase if needed

### For Frequently Used Templates
- Templates are auto-cached in DB connection pool
- No manual caching needed
- SMTP settings retrieved at send time (allows runtime reconfiguration)

### For Large Variable Sets
- XSS escaping is automatic but can add ~1-2ms per send
- Not a concern for typical use
- Worth the security tradeoff

## Testing

```bash
# Run test suite
cd apps/web
pnpm jest email-service.test.ts

# Run specific test
pnpm jest email-service.test.ts -t "rate limit"

# With coverage
pnpm jest email-service.test.ts --coverage
```

## Full Documentation

See: `apps/web/src/lib/EMAIL_SERVICE_API.md` for complete reference

---

**Current Status**: Phase 1 Deepening Complete ✅  
**Production Ready**: Yes  
**Last Updated**: 2026-03-13
