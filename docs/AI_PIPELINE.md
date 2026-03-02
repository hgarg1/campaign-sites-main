# AI Pipeline Technical Specification

## Overview

The AI Pipeline is the core of CampaignSites, orchestrating multiple Large Language Models (LLMs) to generate, validate, and deploy campaign websites with high quality and reliability.

## Pipeline Stages

### 1. Builder Stage (3+ LLM Ring)

#### Objective
Generate complete, functional campaign website code from user requirements.

#### Input
```typescript
{
  prompt: string;              // User's campaign description
  templateId?: string;         // Optional base template
  customization: {
    theme: {
      primaryColor: string;
      secondaryColor: string;
      font: string;
    };
    features: string[];        // ["donate", "volunteer", "events"]
    integrations: {
      fundraising?: "actblue" | "anedot";
      crm?: "salesforce" | "hubspot";
    };
  };
}
```

#### LLM Configuration

**OpenAI GPT-4 Turbo**
```typescript
{
  model: "gpt-4-turbo-preview",
  temperature: 0.3,           // Lower for more consistent code
  max_tokens: 8000,
  systemPrompt: `You are an expert full-stack developer specializing in 
                 political campaign websites. Generate production-ready 
                 Next.js code that is accessible, performant, and secure.`
}
```

**Anthropic Claude 3 Opus**
```typescript
{
  model: "claude-3-opus-20240229",
  temperature: 0.3,
  max_tokens: 4000,
  systemPrompt: `You are a senior software architect. Focus on creating 
                 well-structured, maintainable code with excellent 
                 architecture and best practices.`
}
```

**Google Gemini Pro**
```typescript
{
  model: "gemini-pro",
  temperature: 0.4,            // Slightly higher for creative UI
  systemPrompt: `You are a UI/UX expert developer. Create beautiful, 
                 intuitive interfaces with excellent user experience.`
}
```

#### Consensus Algorithm

```typescript
async function buildConsensus(
  responses: LLMResponse[]
): Promise<ConsensusBuild> {
  // 1. Parse each response into structured components
  const parsed = responses.map(r => parseCodeResponse(r));
  
  // 2. Score each component on multiple dimensions
  const scored = parsed.map(p => ({
    ...p,
    scores: {
      codeQuality: analyzeCodeQuality(p.code),
      accessibility: checkAccessibility(p.code),
      performance: estimatePerformance(p.code),
      security: scanSecurity(p.code),
      completeness: checkCompleteness(p.code, requirements)
    }
  }));
  
  // 3. Select best components from each provider
  const consensus = {
    components: selectBestComponents(scored),
    styles: mergeStyles(scored),
    integrations: selectBestIntegrations(scored)
  };
  
  // 4. Validate consensus doesn't have conflicts
  validateConsensus(consensus);
  
  return consensus;
}
```

#### Output
```typescript
{
  code: {
    pages: Record<string, string>;      // Generated page components
    components: Record<string, string>; // Reusable components
    styles: string;                     // CSS/Tailwind config
    config: Record<string, any>;        // Next.js config, etc.
  };
  metadata: {
    providers: string[];
    confidence: number;
    timestamp: Date;
  };
}
```

### 2. Auditor 1 Stage (Single LLM)

#### Objective
Validate code quality, security, accessibility, and political neutrality.

#### LLM Configuration

**Anthropic Claude 3 Opus** (chosen for strong reasoning)
```typescript
{
  model: "claude-3-opus-20240229",
  temperature: 0,                // Deterministic for auditing
  max_tokens: 4000,
  systemPrompt: `You are a senior security and compliance auditor. 
                 Analyze code for vulnerabilities, accessibility issues, 
                 and compliance with best practices. Be thorough and precise.`
}
```

#### Audit Checklist

1. **Security Audit**
   - SQL injection vulnerabilities
   - XSS vulnerabilities
   - CSRF protection
   - Authentication/authorization flaws
   - Sensitive data exposure
   - Insecure dependencies

2. **Accessibility Audit**
   - WCAG 2.1 AA compliance
   - Semantic HTML
   - ARIA labels
   - Keyboard navigation
   - Color contrast
   - Screen reader compatibility

3. **Performance Audit**
   - Bundle size
   - Image optimization
   - Lazy loading
   - Code splitting
   - Caching strategies

4. **Political Neutrality Audit**
   - No partisan language in system messages
   - No biased default content
   - Fair representation options
   - Bias-free templates

5. **Best Practices**
   - Code organization
   - Error handling
   - Logging
   - Testing coverage
   - Documentation

#### Output
```typescript
{
  passed: boolean;
  overallScore: number;         // 0-100
  issues: Array<{
    severity: "critical" | "major" | "minor" | "info";
    category: string;
    message: string;
    location: {
      file: string;
      line?: number;
    };
    suggestion: string;
  }>;
  metrics: {
    security: number;
    accessibility: number;
    performance: number;
    neutrality: number;
    bestPractices: number;
  };
}
```

#### Failure Handling

If critical issues found:
```typescript
if (auditResult.issues.some(i => i.severity === 'critical')) {
  // Return to Builder stage with specific feedback
  return {
    action: 'REBUILD',
    feedback: criticalIssues,
    attempt: currentAttempt + 1,
    maxAttempts: 3
  };
}
```

### 3. CI/CD Builder Stage (3+ LLM Ring)

#### Objective
Generate deployment configurations, CI/CD pipelines, and infrastructure code.

#### Input
```typescript
{
  code: BuilderOutput;
  auditReport: AuditorOutput;
  deploymentTarget: {
    platform: "vercel" | "netlify" | "aws" | "custom";
    domain?: string;
    environment: "staging" | "production";
  };
  integrations: {
    actblue?: ActBlueConfig;
    anedot?: AnedotConfig;
    salesforce?: SalesforceConfig;
    hubspot?: HubSpotConfig;
  };
}
```

#### LLM Configuration

All three providers (OpenAI, Anthropic, Google) with:
```typescript
{
  temperature: 0.2,             // Low for infrastructure code
  systemPrompt: `You are a DevOps expert. Generate production-grade 
                 deployment configurations with proper security, 
                 monitoring, and rollback capabilities.`
}
```

#### Output
```typescript
{
  docker: {
    dockerfile: string;
    dockerCompose: string;
    dockerignore: string;
  };
  cicd: {
    githubActions?: string;
    azureDevOps?: string;
    gitlabCI?: string;
  };
  infrastructure: {
    terraform?: Record<string, string>;
    cloudformation?: string;
  };
  env: {
    staging: Record<string, string>;
    production: Record<string, string>;
  };
  scripts: {
    deploy: string;
    rollback: string;
    healthcheck: string;
  };
}
```

### 4. Auditor 2 Stage (Single LLM)

#### Objective
Final validation of deployment readiness.

#### LLM Configuration

**OpenAI GPT-4 Turbo**
```typescript
{
  model: "gpt-4-turbo-preview",
  temperature: 0,
  max_tokens: 4000,
  systemPrompt: `You are a deployment safety expert. Validate that all 
                 configurations are production-ready, secure, and complete.`
}
```

#### Audit Checklist

1. **Deployment Safety**
   - Health checks configured
   - Rollback procedures defined
   - Zero-downtime deployment
   - Database migration safety

2. **Environment Configuration**
   - All required env vars defined
   - Secrets properly managed
   - Environment-specific configs
   - API keys validated

3. **Integration Readiness**
   - API credentials configured
   - Webhooks set up
   - Error handling for third-party failures
   - Rate limiting configured

4. **Monitoring & Logging**
   - Error tracking (Sentry, etc.)
   - Performance monitoring
   - Log aggregation
   - Alerting rules

5. **Security**
   - HTTPS enforced
   - Security headers configured
   - CORS properly set
   - Rate limiting enabled

#### Output
```typescript
{
  approved: boolean;
  readinessScore: number;       // 0-100
  blockers: Array<{
    severity: "critical" | "warning";
    category: string;
    message: string;
    resolution: string;
  }>;
  recommendations: string[];
  estimatedDeploymentTime: number; // minutes
}
```

## Error Handling & Retry Logic

### LLM Provider Failures

```typescript
async function callLLMWithRetry(
  provider: LLMProvider,
  prompt: string,
  maxRetries = 3
): Promise<string> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await provider.generate(prompt);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      // Exponential backoff
      await sleep(Math.pow(2, i) * 1000);
      
      // Try alternate provider if available
      if (shouldFallback(error)) {
        provider = getAlternateProvider(provider);
      }
    }
  }
}
```

### Consensus Failure

```typescript
if (consensusConfidence < 0.7) {
  // Re-run with more specific prompts
  const refinedPrompts = refinePromptsBasedOnDivergence(responses);
  const newResponses = await generateWithRefinedPrompts(refinedPrompts);
  return buildConsensus([...responses, ...newResponses]);
}
```

## Performance Optimization

### Parallel Execution

```typescript
// Run all 3 LLMs in parallel
const [openaiResponse, anthropicResponse, googleResponse] = 
  await Promise.all([
    openaiProvider.generate(prompt),
    anthropicProvider.generate(prompt),
    googleProvider.generate(prompt)
  ]);
```

### Caching

```typescript
// Cache similar requests
const cacheKey = hashPrompt(prompt, customization);
const cached = await redis.get(cacheKey);
if (cached && !forceRegenerate) {
  return JSON.parse(cached);
}
```

### Token Optimization

```typescript
// Estimate tokens before calling
const estimatedTokens = estimateTokenCount(prompt);
if (estimatedTokens > MAX_TOKENS) {
  prompt = summarizePrompt(prompt, MAX_TOKENS * 0.8);
}
```

## Monitoring & Observability

### Metrics to Track

```typescript
{
  builderStage: {
    duration: number;
    tokensUsed: { openai: number, anthropic: number, google: number };
    confidence: number;
    retries: number;
  },
  auditor1Stage: {
    duration: number;
    tokensUsed: number;
    issuesFound: number;
    criticalIssues: number;
  },
  cicdBuilderStage: {
    duration: number;
    tokensUsed: { openai: number, anthropic: number, google: number };
    confidence: number;
  },
  auditor2Stage: {
    duration: number;
    tokensUsed: number;
    blockersFound: number;
    approved: boolean;
  },
  totalCost: number;
  totalDuration: number;
}
```

### Logging

```typescript
// Log every LLM interaction
await logLLMCall({
  stage: 'builder',
  provider: 'openai',
  model: 'gpt-4-turbo',
  prompt: truncate(prompt, 500),
  response: truncate(response, 500),
  tokens: tokenCount,
  latency: duration,
  cost: calculateCost(tokenCount, 'gpt-4-turbo')
});
```

## Cost Management

### Budget Controls

```typescript
const BUDGET_LIMITS = {
  perWebsite: 5.00,           // $5 per website build
  perOrganization: 500.00,    // $500 per org per month
  perUser: 50.00              // $50 per user per month
};

async function checkBudget(userId: string, estimatedCost: number) {
  const currentUsage = await getBudgetUsage(userId);
  if (currentUsage + estimatedCost > BUDGET_LIMITS.perUser) {
    throw new BudgetExceededError();
  }
}
```

### Cost Optimization Strategies

1. **Cache aggressively** - Reuse results for similar inputs
2. **Use cheaper models** for simple tasks
3. **Batch requests** when possible
4. **Implement quotas** per organization tier
5. **Progressive enhancement** - Start with basic, upgrade with AI

## Testing Strategy

### Unit Tests

```typescript
describe('LLMRing', () => {
  it('should generate consensus from 3+ providers', async () => {
    const ring = new LLMRing([mockOpenAI, mockAnthropic, mockGoogle]);
    const result = await ring.generate(testPrompt);
    expect(result.consensus).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0.7);
  });
});
```

### Integration Tests

```typescript
describe('Full Pipeline', () => {
  it('should complete all 4 stages successfully', async () => {
    const result = await runFullPipeline(testInput);
    expect(result.stages.builder.status).toBe('completed');
    expect(result.stages.auditor1.status).toBe('completed');
    expect(result.stages.cicdBuilder.status).toBe('completed');
    expect(result.stages.auditor2.approved).toBe(true);
  });
});
```

### LLM Output Validation

```typescript
describe('Code Generation Quality', () => {
  it('should generate valid React components', async () => {
    const code = await builder.generate(prompt);
    expect(() => parseReactComponent(code)).not.toThrow();
    expect(hasNoSecurityVulnerabilities(code)).toBe(true);
  });
});
```
