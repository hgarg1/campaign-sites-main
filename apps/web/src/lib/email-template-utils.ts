/**
 * Email Template Utilities
 *
 * Advanced utilities for template rendering, preview, management, and validation.
 * These utilities provide production-grade template handling with safety guards.
 */

import { prisma } from './database';
import { EmailService } from './email-service';
import Handlebars from 'handlebars';

export interface TemplateRenderOptions {
  variables?: Record<string, any>;
  escapeHtml?: boolean;
  strict?: boolean; // Fail on missing variables
}

export interface TemplatePreview {
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: Record<string, any>;
}

export interface TemplateMetadata {
  key: string;
  name: string;
  category: string;
  requiredVars: string[];
  optionalVars: string[];
  isActive: boolean;
  version: number;
}

/**
 * Render a template with given variables
 *
 * @param templateKey - Template key (e.g., 'password-reset')
 * @param variables - Variables to substitute
 * @param options - Rendering options
 * @returns Rendered template with subject and content
 *
 * @example
 * const rendered = await renderTemplate('welcome-email', {
 *   userName: 'Jane',
 *   organizationName: 'Acme',
 *   activationLink: 'https://activate.com'
 * });
 */
export async function renderTemplate(
  templateKey: string,
  variables: Record<string, any> = {},
  options: TemplateRenderOptions = {}
): Promise<TemplatePreview> {
  const { escapeHtml = true, strict = false } = options;

  // Fetch template
  const template = await prisma.emailTemplate.findUnique({
    where: { key: templateKey },
  });

  if (!template) {
    throw new Error(`Template not found: ${templateKey}`);
  }

  // Validate variables in strict mode
  if (strict) {
    const missing = template.requiredVars.filter((v) => !(v in variables));
    if (missing.length > 0) {
      throw new Error(
        `Missing required variables for ${templateKey}: ${missing.join(', ')}`
      );
    }
  }

  // Escape variables for safety
  const safeVariables = escapeHtml
    ? escapeVariables(variables)
    : variables;

  // Compile templates with Handlebars
  const subjectTemplate = Handlebars.compile(template.subject);
  const htmlTemplate = Handlebars.compile(template.htmlContent);
  const textTemplate = Handlebars.compile(template.textContent || '');

  try {
    return {
      subject: subjectTemplate(safeVariables),
      htmlContent: htmlTemplate(safeVariables),
      textContent: textTemplate(safeVariables),
      variables: safeVariables,
    };
  } catch (error) {
    throw new Error(`Failed to render template ${templateKey}: ${error}`);
  }
}

/**
 * Get template metadata (name, variables, category, etc)
 *
 * @param templateKey - Template key
 * @returns Template metadata
 */
export async function getTemplateMetadata(
  templateKey: string
): Promise<TemplateMetadata> {
  const template = await prisma.emailTemplate.findUnique({
    where: { key: templateKey },
  });

  if (!template) {
    throw new Error(`Template not found: ${templateKey}`);
  }

  const optionalVars = template.variables.filter(
    (v) => !template.requiredVars.includes(v)
  );

  return {
    key: template.key,
    name: template.name,
    category: template.category,
    requiredVars: template.requiredVars,
    optionalVars,
    isActive: template.isActive,
    version: template.version,
  };
}

/**
 * Validate variables against template requirements
 *
 * @param templateKey - Template key
 * @param variables - Variables to validate
 * @returns Validation result with missing/extra variables
 */
export async function validateTemplateVariables(
  templateKey: string,
  variables: Record<string, any>
): Promise<{
  valid: boolean;
  missing: string[];
  extra: string[];
  message?: string;
}> {
  const metadata = await getTemplateMetadata(templateKey);

  const missing = metadata.requiredVars.filter(
    (v) => !(v in variables)
  );
  const allowed = [...metadata.requiredVars, ...metadata.optionalVars];
  const extra = Object.keys(variables).filter((v) => !allowed.includes(v));

  const valid = missing.length === 0;

  return {
    valid,
    missing,
    extra,
    message: valid
      ? 'All required variables provided'
      : `Missing variables: ${missing.join(', ')}`,
  };
}

/**
 * List all active templates
 *
 * @param category - Filter by category (optional)
 * @returns Array of template metadata
 */
export async function listTemplates(category?: string) {
  const templates = await prisma.emailTemplate.findMany({
    where: {
      isActive: true,
      isArchived: false,
      ...(category && { category }),
    },
    select: {
      key: true,
      name: true,
      category: true,
      variables: true,
      requiredVars: true,
      version: true,
    },
    orderBy: { category: 'asc' },
  });

  return templates.map((t) => ({
    key: t.key,
    name: t.name,
    category: t.category,
    requiredVars: t.requiredVars,
    optionalVars: t.variables.filter((v) => !t.requiredVars.includes(v)),
    version: t.version,
  }));
}

/**
 * Get template by category
 *
 * @param category - Template category
 * @returns Template metadata
 */
export async function getTemplatesByCategory(category: string) {
  return listTemplates(category);
}

/**
 * Escape HTML special characters to prevent XSS
 *
 * Recursively escapes all string values in object
 */
function escapeVariables(
  obj: any,
  depth = 0,
  maxDepth = 10
): any {
  if (depth > maxDepth) return obj;

  if (typeof obj === 'string') {
    return obj
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => escapeVariables(item, depth + 1, maxDepth));
  }

  if (obj !== null && typeof obj === 'object') {
    const escaped: any = {};
    for (const key in obj) {
      escaped[key] = escapeVariables(obj[key], depth + 1, maxDepth);
    }
    return escaped;
  }

  return obj;
}

/**
 * Enable/disable a template
 *
 * @param templateKey - Template key
 * @param isActive - Whether to enable or disable
 */
export async function setTemplateActive(
  templateKey: string,
  isActive: boolean
) {
  const template = await prisma.emailTemplate.update({
    where: { key: templateKey },
    data: { isActive },
    select: {
      key: true,
      name: true,
      isActive: true,
    },
  });

  return template;
}

/**
 * Archive a template (soft delete)
 *
 * @param templateKey - Template key
 */
export async function archiveTemplate(templateKey: string) {
  const template = await prisma.emailTemplate.update({
    where: { key: templateKey },
    data: { isArchived: true, isActive: false },
    select: {
      key: true,
      name: true,
      isArchived: true,
    },
  });

  return template;
}

/**
 * Get template usage statistics
 *
 * @param templateKey - Template key
 * @param days - Number of days to look back (default: 30)
 * @returns Usage stats from email logs
 */
export async function getTemplateStats(
  templateKey: string,
  days: number = 30
) {
  // Query email logs for this template
  const templateDoc = await prisma.emailTemplate.findUnique({
    where: { key: templateKey },
  });

  if (!templateDoc) {
    throw new Error(`Template not found: ${templateKey}`);
  }

  // This is a placeholder - actual implementation would need
  // to query audit logs or email delivery tracking table

  return {
    templateKey,
    templateId: templateDoc.id,
    period: `Last ${days} days`,
    // Additional stats would come from email log table:
    // - totalSent
    // - successCount
    // - failureCount
    // - bounceCount
    // - openRate
    // - clickRate
  };
}

/**
 * Create template preview for admin UI
 *
 * Renders template with mock data for visual preview
 *
 * @param templateKey - Template key
 * @returns HTML and text previews
 */
export async function createTemplatePreview(
  templateKey: string
): Promise<TemplatePreview> {
  // Mock variables for common templates
  const mockVariables: Record<string, Record<string, any>> = {
    'password-reset': {
      userName: 'John Doe',
      resetLink: 'https://app.example.com/reset/token123',
      expiresAt: '2 hours',
      companyName: 'Acme Corp',
      supportEmail: 'support@acme.com',
    },
    'welcome-email': {
      userName: 'Jane Smith',
      organizationName: 'Tech Startup',
      activationLink: 'https://app.example.com/activate/token',
      supportEmail: 'support@startup.com',
    },
    'user-invitation': {
      inviterName: 'Alice Johnson',
      organizationName: 'Design Team',
      joinLink: 'https://app.example.com/join/invite123',
      expiresAt: '7 days',
      role: 'Designer',
    },
    'notification': {
      title: 'Report Ready',
      message: 'Your monthly report has been generated.',
      actionUrl: 'https://app.example.com/reports/monthly',
      actionText: 'View Report',
      details: 'Generated on 2026-03-13',
    },
    'approval-request': {
      requestorName: 'Bob Wilson',
      requestType: 'Budget Increase',
      approvalLink: 'https://app.example.com/approvals/req123/approve',
      rejectionLink: 'https://app.example.com/approvals/req123/reject',
      details: 'Requesting $50K for marketing',
      deadline: '2026-03-20',
      reason: 'Campaign scope expanded',
    },
    'system-alert': {
      alertType: 'Database Connection',
      alertMessage: 'Connection pool exhausted',
      severity: 'CRITICAL',
      details: 'Active: 100/100, Pending: 25',
      affectedUsers: '2,450',
      timestamp: new Date().toISOString(),
    },
  };

  const variables = mockVariables[templateKey];
  if (!variables) {
    throw new Error(`No preview data for template: ${templateKey}`);
  }

  return renderTemplate(templateKey, variables, {
    escapeHtml: true,
    strict: false,
  });
}

/**
 * Get all template previews (for admin dashboard)
 */
export async function getAllTemplatePreviews() {
  const templates = await listTemplates();
  const previews: Record<string, TemplatePreview> = {};

  for (const template of templates) {
    try {
      previews[template.key] = await createTemplatePreview(template.key);
    } catch (error) {
      console.error(`Failed to create preview for ${template.key}:`, error);
    }
  }

  return previews;
}

/**
 * Register Handlebars helpers for common patterns
 */
export function registerHandlebarsHelpers() {
  // Format date
  Handlebars.registerHelper('formatDate', (date: any) => {
    if (typeof date === 'string') {
      return new Date(date).toLocaleDateString();
    }
    return date;
  });

  // Currency formatting
  Handlebars.registerHelper('currency', (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  });

  // Pluralize
  Handlebars.registerHelper('pluralize', (count: number, word: string) => {
    return count === 1 ? word : `${word}s`;
  });

  // Uppercase
  Handlebars.registerHelper('upper', (str: string) => {
    return str ? str.toUpperCase() : '';
  });

  // Lowercase
  Handlebars.registerHelper('lower', (str: string) => {
    return str ? str.toLowerCase() : '';
  });
}

/**
 * Verify template integrity
 *
 * Checks that template can be rendered without errors
 */
export async function verifyTemplateIntegrity(templateKey: string) {
  try {
    const preview = await createTemplatePreview(templateKey);

    // Check all fields are present
    if (!preview.subject || !preview.htmlContent) {
      return {
        valid: false,
        error: 'Missing subject or HTML content',
      };
    }

    // Check for unrendered placeholders
    const hasUnrenderedVars =
      preview.subject.includes('{{') ||
      preview.htmlContent.includes('{{');

    if (hasUnrenderedVars) {
      return {
        valid: false,
        error: 'Template has unrendered variables',
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Export template as JSON
 *
 * Useful for backup/versioning
 */
export async function exportTemplate(templateKey: string) {
  const template = await prisma.emailTemplate.findUnique({
    where: { key: templateKey },
  });

  if (!template) {
    throw new Error(`Template not found: ${templateKey}`);
  }

  return {
    key: template.key,
    name: template.name,
    category: template.category,
    subject: template.subject,
    htmlContent: template.htmlContent,
    textContent: template.textContent,
    variables: template.variables,
    requiredVars: template.requiredVars,
    version: template.version,
    exportedAt: new Date().toISOString(),
  };
}

/**
 * Export all templates
 */
export async function exportAllTemplates() {
  const templates = await prisma.emailTemplate.findMany({
    where: { isArchived: false },
  });

  return {
    exportedAt: new Date().toISOString(),
    count: templates.length,
    templates: templates.map((t) => ({
      key: t.key,
      name: t.name,
      category: t.category,
      subject: t.subject,
      htmlContent: t.htmlContent,
      textContent: t.textContent,
      variables: t.variables,
      requiredVars: t.requiredVars,
      version: t.version,
    })),
  };
}

/**
 * Generate template documentation
 *
 * Creates markdown documentation for all templates
 */
export async function generateTemplateDocumentation() {
  const templates = await listTemplates();

  let doc = '# Email Templates Documentation\n\n';
  doc += `Generated: ${new Date().toISOString()}\n\n`;
  doc += `## Quick Reference\n\n`;

  // Quick reference table
  doc += '| Template | Category | Required Variables |\n';
  doc += '|----------|----------|---------------------|\n';

  for (const template of templates) {
    doc += `| ${template.key} | ${template.category} | ${template.requiredVars.join(', ')} |\n`;
  }

  doc += '\n## Template Details\n\n';

  // Detailed info for each
  for (const template of templates) {
    doc += `### ${template.name}\n\n`;
    doc += `**Key**: \`${template.key}\`\n\n`;
    doc += `**Category**: ${template.category}\n\n`;
    doc += `**Required Variables**:\n`;
    for (const v of template.requiredVars) {
      doc += `- ${v}\n`;
    }
    if (template.optionalVars.length > 0) {
      doc += `\n**Optional Variables**:\n`;
      for (const v of template.optionalVars) {
        doc += `- ${v}\n`;
      }
    }
    doc += '\n---\n\n';
  }

  return doc;
}

// Initialize Handlebars helpers on import
registerHandlebarsHelpers();
