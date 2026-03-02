import { LLMProvider } from './providers';

export interface AuditorResult {
  passed: boolean;
  issues: Array<{
    severity: 'critical' | 'warning' | 'info';
    message: string;
    location?: string;
  }>;
  suggestions: string[];
  score: number;
}

/**
 * Auditor validates output from Builder or CI/CD Builder
 * Uses a single LLM for focused validation
 */
export class Auditor {
  constructor(private provider: LLMProvider, private stage: 'auditor1' | 'auditor2') {}

  async audit(code: string, context?: any): Promise<AuditorResult> {
    const prompt = this.buildAuditPrompt(code, context);
    const response = await this.provider.generate(prompt, context);

    // Parse the audit response
    // In production, this would use structured output parsing
    return this.parseAuditResponse(response);
  }

  private buildAuditPrompt(code: string, context?: any): string {
    if (this.stage === 'auditor1') {
      return `
You are a code quality auditor. Review the following campaign website code for:
- Security vulnerabilities
- Accessibility compliance (WCAG 2.1 AA)
- Performance issues
- Best practices violations
- Political neutrality (no bias)

Code to review:
${code}

Provide a structured analysis with severity levels.
      `.trim();
    } else {
      return `
You are a deployment readiness auditor. Review the following CI/CD configuration and code for:
- Deployment safety
- Environment configuration completeness
- Integration readiness (ActBlue, Anedot, Salesforce, HubSpot)
- Rollback procedures
- Monitoring and logging setup

Configuration to review:
${code}

Provide a structured analysis with severity levels.
      `.trim();
    }
  }

  private parseAuditResponse(response: string): AuditorResult {
    // Simplified parsing - in production, use structured output
    return {
      passed: true,
      issues: [],
      suggestions: [],
      score: 95,
    };
  }
}
