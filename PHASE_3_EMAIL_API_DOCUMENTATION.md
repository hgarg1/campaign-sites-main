# Phase 3 Email Components - API Documentation

## Overview
The Phase 3 email UI components expect the following REST API endpoints. This document specifies the exact request/response formats.

---

## Endpoint 1: List All Templates

### Request
```
GET /api/admin/email/templates
```

### Response (200 OK)
```json
{
  "templates": [
    {
      "key": "welcome-email",
      "name": "Welcome Email",
      "description": "Sent when user first joins",
      "category": "Welcome",
      "requiredVarsCount": 2,
      "optionalVarsCount": 1,
      "isActive": true,
      "isArchived": false
    },
    {
      "key": "password-reset",
      "name": "Password Reset",
      "description": "Sent when user requests password reset",
      "category": "Password Reset",
      "requiredVarsCount": 2,
      "optionalVarsCount": 0,
      "isActive": true,
      "isArchived": false
    }
  ]
}
```

### Response Format (Alternative: Direct Array)
```json
[
  {
    "key": "welcome-email",
    "name": "Welcome Email",
    ...
  }
]
```

### Notes
- `key`: Unique identifier for template (used in other endpoints)
- `requiredVarsCount`: Number of required variables
- `optionalVarsCount`: Number of optional variables
- `isActive`: Whether template can be used for sending
- `isArchived`: Whether template is archived (soft delete)

---

## Endpoint 2: Get Template Preview

### Request
```
POST /api/admin/email/templates/[key]/preview
Content-Type: application/json

{
  "variables": {
    "firstName": "John",
    "resetLink": "https://example.com/reset/abc123",
    "companyName": "ACME Corp"
  }
}
```

### Response (200 OK)
```json
{
  "subject": "Welcome to ACME Corp, John!",
  "html": "<html><body>...", 
  "text": "Welcome to ACME Corp, John!...",
  "metadata": {
    "name": "Welcome Email",
    "category": "Welcome",
    "description": "Sent when user first joins"
  }
}
```

### Error Response (400 Bad Request)
```json
{
  "error": true,
  "message": "Missing required variable: firstName"
}
```

### Notes
- `key`: Template key from step 1
- `variables`: Object containing template variables
- `subject`: The rendered email subject line
- `html`: Full HTML email body
- `text`: Plain text version of email
- `metadata`: Template information for display

---

## Endpoint 3: Send Test Email

### Request
```
POST /api/admin/email/templates/[key]/send-test
Content-Type: application/json

{
  "recipientEmail": "user@example.com",
  "variables": {
    "firstName": "John",
    "resetLink": "https://example.com/reset/abc123"
  }
}
```

### Response (200 OK)
```json
{
  "success": true,
  "message": "Test email sent successfully",
  "deliveryId": "msg_123abc"
}
```

### Error Response (400 Bad Request)
```json
{
  "success": false,
  "error": true,
  "message": "Failed to send email: SMTP connection failed"
}
```

### Error Response (400 - Invalid Email)
```json
{
  "error": true,
  "message": "Invalid recipient email address"
}
```

### Notes
- `recipientEmail`: Email address to send test to
- `variables`: Template variables for preview
- `success`: Boolean indicating if email was sent
- `deliveryId`: Optional tracking ID for the sent email
- Endpoint should validate recipient email format
- Should use actual email service to send

---

## Endpoint 4: Toggle Template Active Status

### Request
```
PATCH /api/admin/email/templates/[key]/toggle
Content-Type: application/json

{
  "isActive": true
}
```

### Response (200 OK)
```json
{
  "success": true,
  "template": {
    "key": "welcome-email",
    "name": "Welcome Email",
    "description": "Sent when user first joins",
    "category": "Welcome",
    "requiredVarsCount": 2,
    "optionalVarsCount": 1,
    "isActive": true,
    "isArchived": false
  }
}
```

### Error Response (404 Not Found)
```json
{
  "error": true,
  "message": "Template not found"
}
```

### Notes
- `key`: Template key to update
- `isActive`: New active status
- Should return full updated template object

---

## Endpoint 5: Archive Template

### Request
```
PATCH /api/admin/email/templates/[key]/archive
Content-Type: application/json
```

### Response (200 OK)
```json
{
  "success": true,
  "template": {
    "key": "welcome-email",
    "name": "Welcome Email",
    "description": "Sent when user first joins",
    "category": "Welcome",
    "requiredVarsCount": 2,
    "optionalVarsCount": 1,
    "isActive": true,
    "isArchived": true
  }
}
```

### Error Response (404 Not Found)
```json
{
  "error": true,
  "message": "Template not found"
}
```

### Notes
- `key`: Template key to archive
- Sets `isArchived: true` on template
- Template can still be toggled/restored if needed
- Soft delete pattern

---

## Endpoint 6: Get Dashboard Statistics

### Request
```
GET /api/admin/email/stats
```

### Response (200 OK)
```json
{
  "totalTemplates": 6,
  "activeTemplates": 5,
  "recentlySentTests": 12,
  "successRate": 95,
  "recentTests": [
    {
      "id": "test_abc123",
      "templateKey": "welcome-email",
      "templateName": "Welcome Email",
      "recipientEmail": "user@example.com",
      "sentAt": "2024-03-13T10:30:00Z",
      "status": "success"
    },
    {
      "id": "test_def456",
      "templateKey": "password-reset",
      "templateName": "Password Reset",
      "recipientEmail": "admin@example.com",
      "sentAt": "2024-03-13T10:25:00Z",
      "status": "success"
    },
    {
      "id": "test_ghi789",
      "templateKey": "welcome-email",
      "templateName": "Welcome Email",
      "recipientEmail": "test@example.com",
      "sentAt": "2024-03-13T10:20:00Z",
      "status": "failed"
    }
  ]
}
```

### Notes
- `totalTemplates`: Total number of templates
- `activeTemplates`: Number of active (enabled) templates
- `recentlySentTests`: Total count of sent test emails
- `successRate`: Percentage of successful sends (0-100)
- `recentTests`: Array of 10 most recent test email sends
- `status`: Either "success" or "failed"
- `sentAt`: ISO 8601 timestamp

---

## Data Type Definitions

### Template Object
```typescript
interface Template {
  key: string;                    // Unique identifier
  name: string;                   // Display name
  description: string;            // Brief description
  category: string;               // Category (Welcome, Password Reset, etc.)
  requiredVarsCount: number;      // Count of required variables
  optionalVarsCount: number;      // Count of optional variables
  isActive: boolean;              // Whether template is enabled
  isArchived: boolean;            // Whether template is archived
}
```

### Preview Response
```typescript
interface PreviewResponse {
  subject: string;                // Email subject line
  html: string;                   // HTML email body
  text: string;                   // Plain text email body
  metadata: {
    name: string;
    category: string;
    description: string;
  };
}
```

### Test Email Record
```typescript
interface TestEmailRecord {
  id: string;                     // Unique ID
  templateKey: string;            // Template key used
  templateName: string;           // Template display name
  recipientEmail: string;         // Recipient email
  sentAt: string;                 // ISO 8601 timestamp
  status: 'success' | 'failed';   // Send status
}
```

---

## Error Handling

### General Error Format
All errors should follow this format:

```json
{
  "error": true,
  "message": "Human-readable error message",
  "code": "ERROR_CODE"
}
```

### HTTP Status Codes
- **200 OK**: Successful request
- **400 Bad Request**: Invalid input (missing required fields, invalid format)
- **404 Not Found**: Template or resource not found
- **500 Internal Server Error**: Server error

### Common Error Messages
- "Template not found" (404)
- "Invalid recipient email address" (400)
- "Missing required variable: [name]" (400)
- "SMTP connection failed" (500)
- "Failed to send email" (500)

---

## Implementation Requirements

### Email Validation
- Recipient email must be valid format
- Use standard regex or email validator library
- Return 400 error if invalid

### Variable Processing
- Replace template variables with provided values
- Return error if required variable is missing
- Optional variables can be empty

### Email Sending
- Use actual SMTP service (Nodemailer, AWS SES, Mailgun, etc.)
- Handle SMTP failures gracefully
- Return success/failure status
- Optionally track delivery ID

### Template Rendering
- Use template engine (Handlebars, EJS, Nunjucks, etc.)
- Support both HTML and plain text rendering
- Validate HTML output before returning

### Statistics Tracking
- Track sent test emails (in memory or database)
- Calculate success rate as percentage
- Return 10 most recent test sends
- Timestamp format: ISO 8601

---

## Testing the Endpoints

### Using cURL

List templates:
```bash
curl -X GET http://localhost:3000/api/admin/email/templates
```

Get preview:
```bash
curl -X POST http://localhost:3000/api/admin/email/templates/welcome-email/preview \
  -H "Content-Type: application/json" \
  -d '{"variables": {"firstName": "John"}}'
```

Send test:
```bash
curl -X POST http://localhost:3000/api/admin/email/templates/welcome-email/send-test \
  -H "Content-Type: application/json" \
  -d '{"recipientEmail": "test@example.com", "variables": {"firstName": "John"}}'
```

Toggle active:
```bash
curl -X PATCH http://localhost:3000/api/admin/email/templates/welcome-email/toggle \
  -H "Content-Type: application/json" \
  -d '{"isActive": true}'
```

Archive:
```bash
curl -X PATCH http://localhost:3000/api/admin/email/templates/welcome-email/archive
```

Get stats:
```bash
curl -X GET http://localhost:3000/api/admin/email/stats
```

---

## Sample Implementation (Node.js/Express)

```typescript
// GET /api/admin/email/templates
app.get('/api/admin/email/templates', async (req, res) => {
  try {
    const templates = await db.templates.findAll({ where: { isDeleted: false } });
    res.json({ templates });
  } catch (error) {
    res.status(500).json({ error: true, message: 'Failed to fetch templates' });
  }
});

// POST /api/admin/email/templates/:key/preview
app.post('/api/admin/email/templates/:key/preview', async (req, res) => {
  try {
    const template = await db.templates.findOne({ where: { key: req.params.key } });
    if (!template) return res.status(404).json({ error: true, message: 'Template not found' });

    const { variables } = req.body;
    const subject = Handlebars.compile(template.subjectTemplate)(variables);
    const html = Handlebars.compile(template.htmlTemplate)(variables);
    const text = Handlebars.compile(template.textTemplate)(variables);

    res.json({
      subject,
      html,
      text,
      metadata: {
        name: template.name,
        category: template.category,
        description: template.description,
      },
    });
  } catch (error) {
    res.status(400).json({ error: true, message: error.message });
  }
});

// POST /api/admin/email/templates/:key/send-test
app.post('/api/admin/email/templates/:key/send-test', async (req, res) => {
  try {
    const { recipientEmail, variables } = req.body;

    // Validate email
    if (!isValidEmail(recipientEmail)) {
      return res.status(400).json({ error: true, message: 'Invalid email' });
    }

    const template = await db.templates.findOne({ where: { key: req.params.key } });
    const subject = Handlebars.compile(template.subjectTemplate)(variables);
    const html = Handlebars.compile(template.htmlTemplate)(variables);

    // Send email
    const result = await emailService.send({
      to: recipientEmail,
      subject,
      html,
    });

    res.json({ success: true, deliveryId: result.id });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
```

---

## Notes for Backend Developers

1. **Variable Names**: The frontend auto-detects field types from variable names:
   - Contains "email" → email type
   - Contains "date" → date type
   - Contains "number" or "count" → number type
   - Contains "url" or "link" → url type
   - Contains "is" or "has" → boolean type
   - Otherwise → string type

2. **Category Colors**: For consistent UI, use these categories:
   - Password Reset
   - Welcome
   - Verification
   - Notification
   - Confirmation
   - Alert
   - Information

3. **Caching**: Consider caching template list if it doesn't change frequently

4. **Validation**: Always validate variables on the backend before rendering

5. **Security**: Sanitize template variables to prevent XSS attacks

6. **Logging**: Log all test email sends for auditing

---

**API Version**: 1.0  
**Last Updated**: Phase 3 Email Management System  
**Status**: Ready for Implementation
