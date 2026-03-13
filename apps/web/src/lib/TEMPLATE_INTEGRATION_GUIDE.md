# Email Template Integration Guide

Complete guide for integrating email templates into your application. Learn when to send each template type and implement common use cases.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Authentication Flows](#authentication-flows)
3. [User Management](#user-management)
4. [Team Collaboration](#team-collaboration)
5. [Workflow & Approvals](#workflow--approvals)
6. [Notifications](#notifications)
7. [System Administration](#system-administration)
8. [Error Handling](#error-handling)
9. [Testing Templates](#testing-templates)
10. [Common Patterns](#common-patterns)

---

## Quick Start

### Installation

EmailService is already configured in your app. Import it:

```typescript
import { EmailService } from '@/lib/email-service';

const emailService = new EmailService();
```

### Send Your First Email

```typescript
// Send a welcome email
await emailService.sendFromTemplate('welcome-email', {
  to: 'user@example.com',
  variables: {
    userName: 'Jane Smith',
    organizationName: 'Acme Corp',
    activationLink: 'https://app.example.com/onboard/token123',
  },
});

console.log('Email sent successfully!');
```

### Error Handling

```typescript
try {
  await emailService.sendFromTemplate('welcome-email', {
    to: 'user@example.com',
    variables: {
      userName: 'Jane',
      organizationName: 'Acme',
      activationLink: 'https://activate.com',
    },
  });
} catch (error) {
  console.error('Failed to send email:', error);
  // Errors automatically logged and retried (3 times)
}
```

---

## Authentication Flows

### 1. Password Reset Request

When user clicks "Forgot Password":

```typescript
// In your password reset request handler
export async function POST(request: NextRequest) {
  const { email } = await request.json();

  // Validate email exists
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    );
  }

  // Generate secure reset token
  const resetToken = generateSecureToken();
  const resetLink = `${BASE_URL}/auth/reset-password?token=${resetToken}`;

  // Store token with expiration
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token: resetToken,
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
    },
  });

  // Send reset email
  try {
    await emailService.sendFromTemplate('password-reset', {
      to: email,
      variables: {
        userName: user.name || user.email,
        resetLink,
        expiresAt: '2 hours',
        companyName: 'Your App Name',
        supportEmail: 'support@yourapp.com',
      },
    });

    return NextResponse.json({
      message: 'Password reset email sent',
      success: true,
    });
  } catch (error) {
    logger.error('Failed to send password reset email', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
```

### 2. New User Registration

When user creates account:

```typescript
// In your signup handler
export async function POST(request: NextRequest) {
  const { email, password, name } = await request.json();

  // Validate and create user
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      name,
    },
  });

  // Generate activation token
  const activationToken = generateSecureToken();
  const activationLink = `${BASE_URL}/auth/activate?token=${activationToken}`;

  // Store activation token
  await prisma.activationToken.create({
    data: {
      userId: user.id,
      token: activationToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    },
  });

  // Send welcome email
  try {
    await emailService.sendFromTemplate('welcome-email', {
      to: email,
      variables: {
        userName: name || email.split('@')[0],
        organizationName: 'Your App',
        activationLink,
        supportEmail: 'support@yourapp.com',
      },
    });
  } catch (error) {
    logger.error('Failed to send welcome email', error);
    // Don't fail signup if email fails
  }

  return NextResponse.json({
    message: 'Account created. Check email to activate.',
    userId: user.id,
  });
}
```

### 3. Password Changed Confirmation

Send notification when password is successfully changed:

```typescript
// In your change password handler
export async function POST(request: NextRequest) {
  const { userId, newPassword } = await request.json();

  // Validate and update password
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: await hashPassword(newPassword),
    },
  });

  // Get user email
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  // Send confirmation as notification
  try {
    await emailService.sendFromTemplate('notification', {
      to: user!.email,
      variables: {
        title: 'Password Changed',
        message: 'Your password was successfully updated.',
        details: `Changed on ${new Date().toLocaleDateString()}`,
        actionUrl: `${BASE_URL}/settings/security`,
        actionText: 'View Security Settings',
      },
    });
  } catch (error) {
    logger.warn('Failed to send password change notification', error);
  }

  return NextResponse.json({ success: true });
}
```

---

## User Management

### 1. Invite User to Organization

When admin invites someone to organization:

```typescript
// In your team invitation handler
export async function POST(request: NextRequest) {
  const { organizationId, inviteeEmail, invitedByUserId, role } =
    await request.json();

  // Verify permissions
  const requester = await prisma.user.findUnique({
    where: { id: invitedByUserId },
  });

  if (!hasPermission(requester, 'invite_users')) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 403 }
    );
  }

  // Create invite
  const invite = await prisma.organizationInvite.create({
    data: {
      organizationId,
      email: inviteeEmail,
      invitedByUserId,
      role,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  // Get org and inviter info
  const [org, inviter] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
    }),
    prisma.user.findUnique({
      where: { id: invitedByUserId },
    }),
  ]);

  // Send invitation email
  try {
    await emailService.sendFromTemplate('user-invitation', {
      to: inviteeEmail,
      variables: {
        inviterName: inviter!.name || 'A team member',
        organizationName: org!.name,
        joinLink: `${BASE_URL}/join?invite=${invite.id}`,
        expiresAt: '7 days',
        role: role || 'Team Member',
        message: `Join us on ${org!.name}!`,
        supportEmail: 'support@yourapp.com',
      },
    });

    return NextResponse.json({
      success: true,
      inviteId: invite.id,
    });
  } catch (error) {
    logger.error('Failed to send invitation email', error);
    return NextResponse.json(
      { error: 'Failed to send invitation' },
      { status: 500 }
    );
  }
}
```

### 2. Account Suspension Notification

Notify user when account is suspended:

```typescript
// In your account suspension handler
export async function POST(request: NextRequest) {
  const { userId, reason } = await request.json();

  // Verify permissions
  if (!hasSystemAdminPermission(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 403 }
    );
  }

  // Suspend account
  await prisma.user.update({
    where: { id: userId },
    data: { suspended: true, suspendedAt: new Date() },
  });

  // Get user
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  // Send notification
  try {
    await emailService.sendFromTemplate('notification', {
      to: user!.email,
      variables: {
        title: 'Account Suspended',
        message: 'Your account has been temporarily suspended.',
        details: reason || 'No reason provided',
        actionUrl: `${BASE_URL}/support/contact`,
        actionText: 'Contact Support',
      },
    });
  } catch (error) {
    logger.error('Failed to send suspension notification', error);
  }

  return NextResponse.json({ success: true });
}
```

---

## Team Collaboration

### 1. Team Member Added

Notify user when added to team:

```typescript
// In your add team member handler
export async function POST(request: NextRequest) {
  const { teamId, userId, addedByUserId } = await request.json();

  // Add user to team
  const teamMember = await prisma.teamMember.create({
    data: {
      teamId,
      userId,
      addedByUserId,
    },
  });

  // Get details
  const [user, team, addedBy] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.team.findUnique({ where: { id: teamId } }),
    prisma.user.findUnique({ where: { id: addedByUserId } }),
  ]);

  // Send notification
  try {
    await emailService.sendFromTemplate('notification', {
      to: user!.email,
      variables: {
        title: `Added to ${team!.name}`,
        message: `${addedBy!.name} added you to the team.`,
        actionUrl: `${BASE_URL}/teams/${team!.id}`,
        actionText: 'View Team',
      },
    });
  } catch (error) {
    logger.warn('Failed to send team member notification', error);
  }

  return NextResponse.json({ success: true, teamMember });
}
```

---

## Workflow & Approvals

### 1. Approval Request Workflow

When action requires approval:

```typescript
// In your approval request creation
export async function POST(request: NextRequest) {
  const { title, description, requestedBy, approverIds } =
    await request.json();

  // Create approval request
  const approvalRequest = await prisma.approvalRequest.create({
    data: {
      title,
      description,
      requestedBy,
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
    },
  });

  // Notify approvers
  const approvers = await prisma.user.findMany({
    where: { id: { in: approverIds } },
  });

  const requester = await prisma.user.findUnique({
    where: { id: requestedBy },
  });

  for (const approver of approvers) {
    try {
      await emailService.sendFromTemplate('approval-request', {
        to: approver.email,
        variables: {
          requestorName: requester!.name,
          requestType: title,
          approvalLink: `${BASE_URL}/approvals/${approvalRequest.id}/approve?token=${generateToken()}`,
          rejectionLink: `${BASE_URL}/approvals/${approvalRequest.id}/reject?token=${generateToken()}`,
          details: description,
          deadline: '3 days',
          reason: `Requested on ${new Date().toLocaleDateString()}`,
        },
      });
    } catch (error) {
      logger.error(
        `Failed to send approval email to ${approver.email}`,
        error
      );
    }
  }

  return NextResponse.json({
    success: true,
    requestId: approvalRequest.id,
  });
}
```

### 2. Approval Decision Notification

Notify requester of approval decision:

```typescript
// In your approval decision handler
export async function POST(request: NextRequest) {
  const { approvalRequestId, decision, decidedBy } = await request.json();

  // Update request
  const approvalRequest = await prisma.approvalRequest.update({
    where: { id: approvalRequestId },
    data: {
      status: decision === 'APPROVED' ? 'APPROVED' : 'REJECTED',
      decidedBy,
      decidedAt: new Date(),
    },
  });

  // Get requester
  const requester = await prisma.user.findUnique({
    where: { id: approvalRequest.requestedBy },
  });

  // Get approver
  const approver = await prisma.user.findUnique({
    where: { id: decidedBy },
  });

  // Send notification
  try {
    await emailService.sendFromTemplate('notification', {
      to: requester!.email,
      variables: {
        title:
          decision === 'APPROVED'
            ? `Approved: ${approvalRequest.title}`
            : `Rejected: ${approvalRequest.title}`,
        message: `${approver!.name} ${decision === 'APPROVED' ? 'approved' : 'rejected'} your request.`,
        actionUrl: `${BASE_URL}/approvals/${approvalRequestId}`,
        actionText: 'View Details',
      },
    });
  } catch (error) {
    logger.warn('Failed to send approval decision notification', error);
  }

  return NextResponse.json({ success: true });
}
```

---

## Notifications

### 1. Report Ready Notification

Notify user when async operation completes:

```typescript
// In your report generation completion handler
export async function notifyReportReady(userId: string, reportId: string) {
  const [user, report] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.report.findUnique({ where: { id: reportId } }),
  ]);

  try {
    await emailService.sendFromTemplate('notification', {
      to: user!.email,
      variables: {
        title: 'Report Ready',
        message: `Your ${report!.type} report is ready for download.`,
        actionUrl: `${BASE_URL}/reports/${reportId}`,
        actionText: 'Download',
        details: `Generated: ${report!.createdAt.toLocaleDateString()}`,
      },
    });
  } catch (error) {
    logger.error('Failed to send report notification', error);
  }
}
```

### 2. Account Activity Alert

Notify user of unusual account activity:

```typescript
// In your security monitoring handler
export async function notifyUnusualActivity(
  userId: string,
  activityType: string,
  location: string
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  try {
    await emailService.sendFromTemplate('notification', {
      to: user!.email,
      variables: {
        title: 'Unusual Account Activity',
        message: `We detected ${activityType} from ${location}.`,
        details: `If this was you, no action needed. Otherwise, secure your account.`,
        actionUrl: `${BASE_URL}/settings/security`,
        actionText: 'Review Security',
      },
    });
  } catch (error) {
    logger.error('Failed to send activity alert', error);
  }
}
```

---

## System Administration

### 1. System Alert for Critical Issue

Notify admins of critical system issues:

```typescript
// In your monitoring/alerting system
export async function alertAdmins(
  alertType: string,
  severity: 'CRITICAL' | 'WARNING' | 'INFO',
  details: string
) {
  // Get all admin email addresses
  const admins = await prisma.user.findMany({
    where: {
      role: 'SYSTEM_ADMIN',
    },
  });

  for (const admin of admins) {
    try {
      await emailService.sendFromTemplate('system-alert', {
        to: admin.email,
        variables: {
          alertType,
          alertMessage: `${severity} level alert: ${alertType}`,
          severity,
          details,
          affectedUsers: await getAffectedUserCount(), // Helper function
          actionUrl: `${BASE_URL}/admin/monitoring/alerts`,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error(
        `Failed to send system alert to ${admin.email}`,
        error
      );
    }
  }
}
```

---

## Error Handling

### Complete Error Handling Pattern

```typescript
import { EmailError } from '@/lib/email-service';

export async function sendEmailWithErrorHandling(
  templateKey: string,
  to: string,
  variables: Record<string, any>
) {
  try {
    // Send email
    const result = await emailService.sendFromTemplate(templateKey, {
      to,
      variables,
    });

    logger.info(`Email sent: ${templateKey} to ${to}`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    if (error instanceof EmailError) {
      // Handle specific email errors
      switch (error.code) {
        case 'INVALID_EMAIL':
          logger.warn(`Invalid email: ${to}`);
          return { success: false, error: 'Invalid email address' };

        case 'TEMPLATE_NOT_FOUND':
          logger.error(`Template not found: ${templateKey}`);
          return { success: false, error: 'Template not found' };

        case 'VALIDATION_ERROR':
          logger.warn(`Validation error for ${templateKey}:`, error.message);
          return { success: false, error: error.message };

        case 'RATE_LIMIT_EXCEEDED':
          logger.info(`Rate limited for ${to}`);
          // Will auto-retry, but let caller know
          return { success: false, error: 'Too many emails, please wait' };

        case 'SMTP_ERROR':
          logger.error(`SMTP error for ${templateKey}:`, error.message);
          // Will auto-retry
          return { success: false, error: 'Email service temporarily unavailable' };

        default:
          logger.error(`Unknown email error:`, error);
          return { success: false, error: 'Failed to send email' };
      }
    }

    // Unknown error
    logger.error('Unexpected error sending email:', error);
    return { success: false, error: 'Unexpected error' };
  }
}
```

### Handle Missing Variables

```typescript
function validateVariables(
  templateKey: string,
  variables: Record<string, any>,
  requiredVars: string[]
): { valid: boolean; missing?: string[] } {
  const missing = requiredVars.filter((v) => !(v in variables));

  if (missing.length > 0) {
    logger.error(
      `Missing variables for ${templateKey}:`,
      missing
    );
    return { valid: false, missing };
  }

  return { valid: true };
}

// Usage
const validation = validateVariables('password-reset', variables, [
  'userName',
  'resetLink',
  'expiresAt',
]);

if (!validation.valid) {
  throw new Error(`Missing: ${validation.missing?.join(', ')}`);
}
```

---

## Testing Templates

### Unit Test Example

```typescript
describe('Email Template Integration', () => {
  it('should send password reset email', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
    };

    const result = await emailService.sendFromTemplate(
      'password-reset',
      {
        to: mockUser.email,
        variables: {
          userName: mockUser.name,
          resetLink: 'https://reset.com/token123',
          expiresAt: '2 hours',
          companyName: 'Test Company',
        },
      }
    );

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
  });

  it('should validate required variables', async () => {
    expect(async () => {
      await emailService.sendFromTemplate('password-reset', {
        to: 'test@example.com',
        variables: {
          userName: 'Test', // Missing resetLink and expiresAt
        },
      });
    }).rejects.toThrow('VALIDATION_ERROR');
  });
});
```

### Integration Test Example

```typescript
describe('Email Workflows', () => {
  it('should send welcome email to new user', async () => {
    // Create user
    const user = await prisma.user.create({
      data: {
        email: 'newuser@example.com',
        name: 'New User',
        passwordHash: 'hashed',
      },
    });

    // Simulate signup
    const result = await sendWelcomeEmail(user.id);

    expect(result.success).toBe(true);
    
    // Verify email was sent
    const emailLog = await prisma.emailLog.findFirst({
      where: {
        to: user.email,
        templateKey: 'welcome-email',
      },
    });

    expect(emailLog).toBeDefined();
  });
});
```

---

## Common Patterns

### Pattern 1: Conditional Notifications

```typescript
// Send different emails based on context
export async function notifyUserOfStatusChange(
  userId: string,
  oldStatus: string,
  newStatus: string
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  const statusMessages: Record<string, string> = {
    APPROVED: 'Your request has been approved!',
    REJECTED: 'Your request has been rejected.',
    PENDING_REVIEW: 'Your request is under review.',
  };

  try {
    await emailService.sendFromTemplate('notification', {
      to: user!.email,
      variables: {
        title: `Status: ${newStatus}`,
        message: statusMessages[newStatus],
        actionUrl: `${BASE_URL}/requests/${userId}`,
        actionText: 'View Request',
      },
    });
  } catch (error) {
    logger.error('Failed to send status notification', error);
  }
}
```

### Pattern 2: Batch Notifications

```typescript
// Send same email to multiple recipients
export async function notifyUsersOfMaintenance(
  userIds: string[],
  maintenanceTime: Date
) {
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
  });

  const results = await Promise.allSettled(
    users.map((user) =>
      emailService.sendFromTemplate('system-alert', {
        to: user.email,
        variables: {
          alertType: 'Scheduled Maintenance',
          alertMessage: `System maintenance scheduled for ${maintenanceTime.toLocaleString()}`,
          severity: 'INFO',
          affectedUsers: users.length.toString(),
        },
      })
    )
  );

  const successful = results.filter(
    (r) => r.status === 'fulfilled'
  ).length;
  const failed = results.filter(
    (r) => r.status === 'rejected'
  ).length;

  logger.info(
    `Maintenance notifications: ${successful} sent, ${failed} failed`
  );

  return { successful, failed };
}
```

### Pattern 3: Deferred Email Sending

```typescript
// Queue emails for later sending (e.g., digest)
export async function queueEmailForLater(
  templateKey: string,
  to: string,
  variables: Record<string, any>,
  sendAt: Date
) {
  await prisma.emailQueue.create({
    data: {
      templateKey,
      to,
      variables: JSON.stringify(variables),
      sendAt,
      status: 'QUEUED',
    },
  });

  logger.info(`Queued email: ${templateKey} to ${to} for ${sendAt}`);
}

// In a scheduled job, send queued emails
export async function sendQueuedEmails() {
  const queued = await prisma.emailQueue.findMany({
    where: {
      status: 'QUEUED',
      sendAt: { lte: new Date() },
    },
  });

  for (const email of queued) {
    try {
      await emailService.sendFromTemplate(email.templateKey, {
        to: email.to,
        variables: JSON.parse(email.variables),
      });

      await prisma.emailQueue.update({
        where: { id: email.id },
        data: { status: 'SENT', sentAt: new Date() },
      });
    } catch (error) {
      logger.error(`Failed to send queued email: ${email.id}`, error);
      await prisma.emailQueue.update({
        where: { id: email.id },
        data: {
          status: 'FAILED',
          failureReason: error instanceof Error ? error.message : 'Unknown',
        },
      });
    }
  }
}
```

---

## Monitoring & Debugging

### Check Email Delivery Status

```typescript
// Get delivery statistics
const stats = emailService.getStats();

console.log({
  totalSent: stats.totalAttempts,
  successful: stats.successCount,
  failed: stats.totalAttempts - stats.successCount,
  lastError: emailService.getLastError(),
});
```

### Review Email Logs

```typescript
// Query email delivery logs
const emailLogs = await prisma.emailLog.findMany({
  where: {
    templateKey: 'password-reset',
    createdAt: {
      gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
    },
  },
  orderBy: { createdAt: 'desc' },
});

emailLogs.forEach((log) => {
  console.log(`${log.to}: ${log.status} (${log.templateKey})`);
});
```

---

## See Also

- [TEMPLATE_CATALOG.md](./TEMPLATE_CATALOG.md) - Complete template reference
- [EMAIL_SERVICE_API.md](./EMAIL_SERVICE_API.md) - EmailService API docs
- [EMAIL_SERVICE_QUICK_REFERENCE.md](./EMAIL_SERVICE_QUICK_REFERENCE.md) - Quick start
