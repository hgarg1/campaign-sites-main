import { prisma } from './database';
import nodemailer from 'nodemailer';
import Handlebars from 'handlebars';

interface SendEmailOptions {
  templateKey: string;
  recipient: string;
  variables: Record<string, any>;
  abTestVariant?: string;
}

interface PreviewEmailOptions {
  templateKey: string;
  variables: Record<string, any>;
}

interface EmailError extends Error {
  code?: string;
  statusCode?: number;
  retryable?: boolean;
}

// Rate limiting store (in-memory, can be replaced with Redis for distributed deployments)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private lastError: EmailError | null = null;
  private sendAttempts = 0;
  private readonly MAX_RETRIES = 3;
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private readonly RATE_LIMIT_MAX_PER_RECIPIENT = 5; // Max 5 emails per recipient per minute

  /**
   * Initialize the SMTP transporter from SystemConfig settings
   */
  async initializeTransporter(): Promise<void> {
    try {
      const smtpConfig = await prisma.systemConfig.findUnique({
        where: { key: 'smtp_settings' },
      });

      if (!smtpConfig) {
        throw new Error('SMTP settings not configured in SystemConfig');
      }

      const settings = smtpConfig.value as unknown as {
        host: string;
        port: number;
        username: string;
        password: string;
        tls?: boolean;
        ssl?: boolean;
        fromEmail: string;
      };

      if (!settings.host || !settings.port || !settings.username || !settings.password) {
        throw new Error('SMTP settings are incomplete');
      }

      this.transporter = nodemailer.createTransport({
        host: settings.host,
        port: settings.port,
        secure: settings.ssl || false, // true for 465, false for other ports
        requireTLS: settings.tls || false,
        auth: {
          user: settings.username,
          pass: settings.password,
        },
      });
    } catch (error) {
      console.error('Failed to initialize email transporter:', error);
      throw error;
    }
  }

  /**
   * Get transporter, initializing if necessary
   */
  async getTransporter(): Promise<nodemailer.Transporter> {
    if (!this.transporter) {
      await this.initializeTransporter();
    }
    return this.transporter!;
  }

  /**
   * Get email template by key
   */
  async getTemplate(templateKey: string) {
    const template = await prisma.emailTemplate.findUnique({
      where: { key: templateKey },
    });

    if (!template) {
      throw new Error(`Email template not found: ${templateKey}`);
    }

    if (!template.isActive) {
      throw new Error(`Email template is not active: ${templateKey}`);
    }

    return template;
  }

  /**
   * Render template HTML and subject with variables
   */
  renderTemplate(content: string, variables: Record<string, any>): string {
    try {
      // Escape special characters to prevent injection
      const safeVariables = this.escapeVariables(variables);
      const compiled = Handlebars.compile(content);
      return compiled(safeVariables);
    } catch (error) {
      console.error('Failed to render template:', error);
      throw new Error(`Template rendering failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Escape variables to prevent XSS/injection
   */
  private escapeVariables(variables: Record<string, any>): Record<string, any> {
    const escaped: Record<string, any> = {};

    for (const [key, value] of Object.entries(variables)) {
      if (typeof value === 'string') {
        // Escape HTML special characters
        escaped[key] = value
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;');
      } else if (Array.isArray(value)) {
        escaped[key] = value.map((v) =>
          typeof v === 'string'
            ? v
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#x27;')
            : v
        );
      } else if (typeof value === 'object' && value !== null) {
        escaped[key] = this.escapeVariables(value);
      } else {
        escaped[key] = value;
      }
    }

    return escaped;
  }

  /**
   * Validate email address format
   */
  private validateEmailFormat(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate template key format
   */
  private validateTemplateKey(key: string): boolean {
    // Template keys should be kebab-case
    return /^[a-z0-9-]+$/.test(key);
  }

  /**
   * Check rate limiting for a recipient
   */
  private checkRateLimit(recipient: string): boolean {
    const key = `email:${recipient}`;
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetAt) {
      // Create new entry
      rateLimitStore.set(key, {
        count: 1,
        resetAt: now + this.RATE_LIMIT_WINDOW,
      });
      return true;
    }

    if (entry.count >= this.RATE_LIMIT_MAX_PER_RECIPIENT) {
      return false;
    }

    entry.count++;
    return true;
  }

  /**
   * Clear rate limit for a recipient (useful for testing)
   */
  clearRateLimit(recipient: string): void {
    rateLimitStore.delete(`email:${recipient}`);
  }

  /**
   * Log email operation with level
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    if (level === 'error') {
      console.error(logMessage, data);
    } else if (level === 'warn') {
      console.warn(logMessage, data);
    } else if (level === 'info') {
      console.log(logMessage, data);
    } else {
      // Only log debug in development
      if (process.env.NODE_ENV === 'development') {
        console.log(logMessage, data);
      }
    }
  }

  /**
   * Get last error (for diagnostics)
   */
  getLastError(): EmailError | null {
    return this.lastError;
  }

  /**
   * Reset error state
   */
  resetErrorState(): void {
    this.lastError = null;
    this.sendAttempts = 0;
  }

  /**
   * Preview email rendering without sending
   */
  async preview(options: PreviewEmailOptions) {
    const template = await this.getTemplate(options.templateKey);

    return {
      subject: this.renderTemplate(template.subject, options.variables),
      html: this.renderTemplate(template.htmlContent, options.variables),
      text: template.textContent ? this.renderTemplate(template.textContent, options.variables) : undefined,
    };
  }

  /**
   * Send email using template with validation and error handling
   */
  async send(options: SendEmailOptions): Promise<{ messageId: string; logId: string }> {
    this.resetErrorState();

    try {
      // Input validation
      if (!this.validateEmailFormat(options.recipient)) {
        const error: EmailError = new Error(`Invalid email format: ${options.recipient}`);
        error.code = 'INVALID_EMAIL';
        error.statusCode = 400;
        error.retryable = false;
        this.lastError = error;
        this.log('error', 'Invalid email format', { recipient: options.recipient });
        throw error;
      }

      if (!this.validateTemplateKey(options.templateKey)) {
        const error: EmailError = new Error(`Invalid template key format: ${options.templateKey}`);
        error.code = 'INVALID_TEMPLATE_KEY';
        error.statusCode = 400;
        error.retryable = false;
        this.lastError = error;
        this.log('error', 'Invalid template key', { templateKey: options.templateKey });
        throw error;
      }

      // Rate limiting check
      if (!this.checkRateLimit(options.recipient)) {
        const error: EmailError = new Error(
          `Rate limit exceeded for recipient: ${options.recipient} (max ${this.RATE_LIMIT_MAX_PER_RECIPIENT} emails per minute)`
        );
        error.code = 'RATE_LIMIT_EXCEEDED';
        error.statusCode = 429;
        error.retryable = true;
        this.lastError = error;
        this.log('warn', 'Rate limit exceeded', { recipient: options.recipient });
        throw error;
      }

      this.log('info', 'Starting email send', {
        templateKey: options.templateKey,
        recipient: options.recipient,
      });

      return await this.sendWithRetry(options);
    } catch (error) {
      const emailError = error as EmailError;
      this.lastError = emailError;
      this.log('error', `Failed to send email: ${emailError.message}`, {
        code: emailError.code,
        retryable: emailError.retryable,
        templateKey: options.templateKey,
        recipient: options.recipient,
      });
      throw error;
    }
  }

  /**
   * Send email with automatic retry logic and exponential backoff
   */
  private async sendWithRetry(
    options: SendEmailOptions,
    attempt: number = 1
  ): Promise<{ messageId: string; logId: string }> {
    try {
      const template = await this.getTemplate(options.templateKey);

      // Validate required variables
      const missingVars = template.requiredVars.filter((v) => !(v in options.variables));
      if (missingVars.length > 0) {
        const error: EmailError = new Error(`Missing required variables: ${missingVars.join(', ')}`);
        error.code = 'MISSING_VARIABLES';
        error.statusCode = 400;
        error.retryable = false;
        throw error;
      }

      // Render template
      const subject = this.renderTemplate(template.subject, options.variables);
      const html = this.renderTemplate(template.htmlContent, options.variables);
      const text = template.textContent
        ? this.renderTemplate(template.textContent, options.variables)
        : undefined;

      // Get SMTP config for fromEmail
      const smtpConfig = await prisma.systemConfig.findUnique({
        where: { key: 'smtp_settings' },
      });

      const fromEmail = (smtpConfig?.value as unknown as { fromEmail: string })?.fromEmail;

      if (!fromEmail) {
        const error: EmailError = new Error('From email not configured in SMTP settings');
        error.code = 'MISSING_CONFIG';
        error.statusCode = 500;
        error.retryable = false;
        throw error;
      }

      // Send email
      const transporter = await this.getTransporter();
      const result = await transporter.sendMail({
        from: fromEmail,
        to: options.recipient,
        subject,
        html,
        text,
      });

      // Log successful send
      const log = await prisma.emailSendLog.create({
        data: {
          templateId: template.id,
          templateVersion: template.version,
          recipient: options.recipient,
          subject,
          status: 'sent',
          messageId: result.messageId || undefined,
          variables: options.variables as any,
          abTestVariant: options.abTestVariant,
          sentAt: new Date(),
        },
      });

      this.log('info', 'Email sent successfully', {
        templateKey: options.templateKey,
        recipient: options.recipient,
        messageId: result.messageId,
        logId: log.id,
      });

      return {
        messageId: result.messageId || '',
        logId: log.id,
      };
    } catch (error) {
      const emailError = error as EmailError;
      const isRetryable = emailError.retryable !== false && emailError.code !== 'INVALID_EMAIL' && attempt < this.MAX_RETRIES;

      this.log('error', `Email send attempt ${attempt} failed`, {
        error: emailError.message,
        code: emailError.code,
        isRetryable,
        attempt,
      });

      if (isRetryable) {
        // Exponential backoff: 1s, 2s, 4s
        const delayMs = Math.pow(2, attempt - 1) * 1000;
        this.log('info', `Retrying in ${delayMs}ms`, { attempt: attempt + 1 });

        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return this.sendWithRetry(options, attempt + 1);
      }

      // Log permanent failure
      const template = await this.getTemplate(options.templateKey).catch(() => null);
      if (template) {
        await prisma.emailSendLog.create({
          data: {
            templateId: template.id,
            templateVersion: template.version,
            recipient: options.recipient,
            subject: 'FAILED TO SEND',
            status: 'failed',
            errorMessage: `${emailError.message} (attempt ${attempt}/${this.MAX_RETRIES})`,
            variables: options.variables as any,
            abTestVariant: options.abTestVariant,
          },
        });
      }

      throw error;
    }
  }

  /**
   * Send test email with sample data and enhanced validation
   */
  async sendTest(templateKey: string, recipientEmail: string, testVariables: Record<string, any>) {
    try {
      // Validate email format
      if (!this.validateEmailFormat(recipientEmail)) {
        throw new Error(`Invalid email format for test send: ${recipientEmail}`);
      }

      const template = await this.getTemplate(templateKey);

      // Validate required variables
      const missingVars = template.requiredVars.filter((v) => !(v in testVariables));
      if (missingVars.length > 0) {
        throw new Error(`Missing required variables for test: ${missingVars.join(', ')}`);
      }

      this.log('info', 'Sending test email', { templateKey, recipientEmail });

      // Render and send
      return this.send({
        templateKey,
        recipient: recipientEmail,
        variables: testVariables,
      });
    } catch (error) {
      this.log('error', `Test email failed: ${error instanceof Error ? error.message : String(error)}`, {
        templateKey,
        recipientEmail,
      });
      throw error;
    }
  }

  /**
   * Send bulk emails with progress tracking and error recovery
   */
  async sendBulk(
    templateKey: string,
    recipients: Array<{ email: string; variables: Record<string, any> }>,
    options?: { abTestVariant?: string; delayMs?: number }
  ): Promise<Array<{ email: string; messageId: string; logId: string; error?: string }>> {
    const results = [];
    const delayMs = options?.delayMs || 100; // Default 100ms delay between sends

    this.log('info', `Starting bulk send: ${recipients.length} recipients`, {
      templateKey,
      delayMs,
    });

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];

      try {
        const result = await this.send({
          templateKey,
          recipient: recipient.email,
          variables: recipient.variables,
          abTestVariant: options?.abTestVariant,
        });

        results.push({
          email: recipient.email,
          messageId: result.messageId,
          logId: result.logId,
        });

        // Add delay between sends to avoid overwhelming SMTP server
        if (i < recipients.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({
          email: recipient.email,
          messageId: '',
          logId: '',
          error: errorMessage,
        });

        this.log('warn', `Bulk send failed for recipient ${i + 1}/${recipients.length}`, {
          email: recipient.email,
          error: errorMessage,
        });
      }
    }

    const successful = results.filter((r) => !r.error).length;
    const failed = results.filter((r) => r.error).length;

    this.log('info', 'Bulk send completed', {
      total: recipients.length,
      successful,
      failed,
      successRate: `${((successful / recipients.length) * 100).toFixed(2)}%`,
    });

    return results;
  }

  /**
   * Get send history for a template with filters
   */
  async getSendHistory(
    templateId: string,
    options?: { limit?: number; status?: string; since?: Date }
  ) {
    const limit = options?.limit || 100;
    const where: any = { templateId };

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.since) {
      where.createdAt = { gte: options.since };
    }

    this.log('debug', 'Fetching send history', { templateId, limit });

    return prisma.emailSendLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get detailed send statistics with breakdown by status
   */
  async getStats(templateId: string, days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    this.log('debug', 'Computing email statistics', { templateId, days });

    const logs = await prisma.emailSendLog.findMany({
      where: {
        templateId,
        createdAt: { gte: since },
      },
    });

    const total = logs.length;
    const sent = logs.filter((l) => l.status === 'sent').length;
    const failed = logs.filter((l) => l.status === 'failed').length;
    const pending = logs.filter((l) => l.status === 'pending').length;
    const bounced = logs.filter((l) => l.status === 'bounced').length;

    // Calculate error rate and breakdown
    const successRate = total > 0 ? (sent / total) * 100 : 0;
    const failureRate = total > 0 ? (failed / total) * 100 : 0;

    // Group errors by message
    const errorCounts: Record<string, number> = {};
    logs
      .filter((l) => l.status === 'failed' && l.errorMessage)
      .forEach((l) => {
        const msg = l.errorMessage || 'Unknown error';
        errorCounts[msg] = (errorCounts[msg] || 0) + 1;
      });

    return {
      total,
      sent,
      failed,
      pending,
      bounced,
      successRate: parseFloat(successRate.toFixed(2)),
      failureRate: parseFloat(failureRate.toFixed(2)),
      period: `${days} days`,
      topErrors: Object.entries(errorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([message, count]) => ({ message, count })),
    };
  }
}

// Export singleton instance
export const emailService = new EmailService();
