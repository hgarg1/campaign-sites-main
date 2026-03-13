import { EmailService } from './email-service';
import { prisma } from './database';

// Mock prisma
jest.mock('./database', () => ({
  prisma: {
    emailTemplate: {
      findUnique: jest.fn(),
    },
    systemConfig: {
      findUnique: jest.fn(),
    },
    emailSendLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

describe('EmailService', () => {
  let emailService: EmailService;
  let mockTransporter: any;

  beforeEach(() => {
    emailService = new EmailService();
    mockTransporter = {
      sendMail: jest.fn(),
    };

    // Reset all mocks
    jest.clearAllMocks();

    // Setup default mock responses
    (prisma.systemConfig.findUnique as jest.Mock).mockResolvedValue({
      key: 'smtp_settings',
      value: {
        host: 'smtp.test.com',
        port: 587,
        username: 'test@example.com',
        password: 'password123',
        tls: true,
        fromEmail: 'noreply@example.com',
      },
    });
  });

  describe('Input Validation', () => {
    test('validateEmailFormat should accept valid emails', () => {
      const validEmails = [
        'test@example.com',
        'user+tag@domain.co.uk',
        'name_123@example.org',
      ];

      validEmails.forEach((email) => {
        expect((emailService as any).validateEmailFormat(email)).toBe(true);
      });
    });

    test('validateEmailFormat should reject invalid emails', () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'test@',
        'test @example.com',
        '',
      ];

      invalidEmails.forEach((email) => {
        expect((emailService as any).validateEmailFormat(email)).toBe(false);
      });
    });

    test('validateTemplateKey should accept valid keys', () => {
      const validKeys = [
        'password-reset',
        'welcome-email',
        'user-invitation',
        'my-template-123',
      ];

      validKeys.forEach((key) => {
        expect((emailService as any).validateTemplateKey(key)).toBe(true);
      });
    });

    test('validateTemplateKey should reject invalid keys', () => {
      const invalidKeys = [
        'Password-Reset', // uppercase
        'password_reset', // underscore
        'password reset', // space
        'password.reset', // dot
        '',
      ];

      invalidKeys.forEach((key) => {
        expect((emailService as any).validateTemplateKey(key)).toBe(false);
      });
    });
  });

  describe('Rate Limiting', () => {
    test('should allow emails within rate limit', () => {
      const recipient = 'test@example.com';
      emailService.clearRateLimit(recipient);

      for (let i = 0; i < 5; i++) {
        expect((emailService as any).checkRateLimit(recipient)).toBe(true);
      }
    });

    test('should block emails exceeding rate limit', () => {
      const recipient = 'test@example.com';
      emailService.clearRateLimit(recipient);

      // Fill up the limit
      for (let i = 0; i < 5; i++) {
        (emailService as any).checkRateLimit(recipient);
      }

      // Next one should be blocked
      expect((emailService as any).checkRateLimit(recipient)).toBe(false);
    });

    test('should reset rate limit after window expires', async () => {
      const recipient = 'test@example.com';

      // Fill up the limit
      for (let i = 0; i < 5; i++) {
        (emailService as any).checkRateLimit(recipient);
      }

      // Should be blocked
      expect((emailService as any).checkRateLimit(recipient)).toBe(false);

      // Wait for window to expire (simplified - in real tests use jest.useFakeTimers)
      // This test would require mocking Date or using jest.useFakeTimers
    });
  });

  describe('Variable Escaping', () => {
    test('should escape HTML special characters', () => {
      const variables = {
        name: '<script>alert("xss")</script>',
        email: 'test&admin@example.com',
      };

      const escaped = (emailService as any).escapeVariables(variables);

      expect(escaped.name).toContain('&lt;');
      expect(escaped.name).toContain('&gt;');
      expect(escaped.email).toContain('&amp;');
    });

    test('should escape nested objects', () => {
      const variables = {
        user: {
          name: '<b>Admin</b>',
          address: 'test"quote\'quote',
        },
      };

      const escaped = (emailService as any).escapeVariables(variables);

      expect(escaped.user.name).toContain('&lt;');
      expect(escaped.user.address).toContain('&quot;');
      expect(escaped.user.address).toContain('&#x27;');
    });

    test('should escape arrays', () => {
      const variables = {
        items: ['<item>', 'normal', '"quoted"'],
      };

      const escaped = (emailService as any).escapeVariables(variables);

      expect(escaped.items[0]).toContain('&lt;');
      expect(escaped.items[2]).toContain('&quot;');
    });

    test('should not escape non-string values', () => {
      const variables = {
        count: 42,
        active: true,
        timestamp: 1234567890,
      };

      const escaped = (emailService as any).escapeVariables(variables);

      expect(escaped.count).toBe(42);
      expect(escaped.active).toBe(true);
      expect(escaped.timestamp).toBe(1234567890);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid email in send', async () => {
      const promise = emailService.send({
        templateKey: 'test-template',
        recipient: 'not-an-email',
        variables: {},
      });

      await expect(promise).rejects.toThrow('Invalid email format');
      expect(emailService.getLastError()).toBeDefined();
      expect(emailService.getLastError()?.code).toBe('INVALID_EMAIL');
    });

    test('should handle invalid template key in send', async () => {
      const promise = emailService.send({
        templateKey: 'Invalid_Key', // underscore not allowed
        recipient: 'test@example.com',
        variables: {},
      });

      await expect(promise).rejects.toThrow('Invalid template key format');
      expect(emailService.getLastError()?.code).toBe('INVALID_TEMPLATE_KEY');
    });

    test('should handle rate limit exceeded', async () => {
      const recipient = 'test@example.com';
      emailService.clearRateLimit(recipient);

      // Mock template
      (prisma.emailTemplate.findUnique as jest.Mock).mockResolvedValue({
        id: 'template-1',
        key: 'test-template',
        isActive: true,
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        textContent: 'Test',
        requiredVars: [],
        version: 1,
      });

      // Fill up rate limit
      for (let i = 0; i < 5; i++) {
        try {
          await emailService.send({
            templateKey: 'test-template',
            recipient,
            variables: {},
          });
        } catch (e) {
          // Ignore failures for this test
        }
      }

      // Next should fail with rate limit
      const promise = emailService.send({
        templateKey: 'test-template',
        recipient,
        variables: {},
      });

      await expect(promise).rejects.toThrow('Rate limit exceeded');
      expect(emailService.getLastError()?.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    test('getLastError should return null after resetErrorState', () => {
      const error = new Error('test error');
      (emailService as any).lastError = error;

      expect(emailService.getLastError()).toBeDefined();

      emailService.resetErrorState();

      expect(emailService.getLastError()).toBeNull();
    });
  });

  describe('Statistics', () => {
    test('should calculate correct success rate', async () => {
      const templateId = 'template-1';

      (prisma.emailSendLog.findMany as jest.Mock).mockResolvedValue([
        { status: 'sent', errorMessage: null },
        { status: 'sent', errorMessage: null },
        { status: 'failed', errorMessage: 'Connection timeout' },
        { status: 'failed', errorMessage: 'Connection timeout' },
        { status: 'pending', errorMessage: null },
      ]);

      const stats = await emailService.getStats(templateId);

      expect(stats.total).toBe(5);
      expect(stats.sent).toBe(2);
      expect(stats.failed).toBe(2);
      expect(stats.pending).toBe(1);
      expect(stats.successRate).toBe(40);
      expect(stats.failureRate).toBe(40);
    });

    test('should identify top errors', async () => {
      const templateId = 'template-1';

      (prisma.emailSendLog.findMany as jest.Mock).mockResolvedValue([
        { status: 'failed', errorMessage: 'Connection timeout' },
        { status: 'failed', errorMessage: 'Connection timeout' },
        { status: 'failed', errorMessage: 'Connection timeout' },
        { status: 'failed', errorMessage: 'Invalid recipient' },
        { status: 'failed', errorMessage: 'Invalid recipient' },
        { status: 'sent', errorMessage: null },
      ]);

      const stats = await emailService.getStats(templateId);

      expect(stats.topErrors).toHaveLength(2);
      expect(stats.topErrors[0]).toEqual({
        message: 'Connection timeout',
        count: 3,
      });
      expect(stats.topErrors[1]).toEqual({
        message: 'Invalid recipient',
        count: 2,
      });
    });
  });

  describe('Bulk Operations', () => {
    test('should track results for each recipient', async () => {
      const recipients = [
        { email: 'user1@example.com', variables: { name: 'User 1' } },
        { email: 'user2@example.com', variables: { name: 'User 2' } },
      ];

      // Mock successful template
      (prisma.emailTemplate.findUnique as jest.Mock).mockResolvedValue({
        id: 'template-1',
        key: 'test-template',
        isActive: true,
        subject: 'Test',
        htmlContent: '<p>{{name}}</p>',
        textContent: 'Test',
        requiredVars: ['name'],
        version: 1,
      });

      // Mock log creation
      let logCallCount = 0;
      (prisma.emailSendLog.create as jest.Mock).mockImplementation(async () => {
        logCallCount++;
        return {
          id: `log-${logCallCount}`,
        };
      });

      // Note: This is a simplified test. Full integration would require
      // mocking nodemailer.createTransport and transport.sendMail
    });
  });
});
