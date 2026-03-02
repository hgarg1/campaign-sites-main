# CampaignSites Architecture

## Overview

CampaignSites is an AI-powered campaign website builder that uses a sophisticated multi-LLM pipeline to generate, audit, and deploy political campaign websites. The system is designed to be party-neutral and supports white-labeling for political organizations.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Web App    │  │  Admin App   │  │ Generated    │          │
│  │  (Builder)   │  │  (Dashboard) │  │  Websites    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API Layer                                 │
│  ┌──────────────────────────────────────────────────────┐       │
│  │   Express API (REST/GraphQL)                          │       │
│  │   - Authentication & Authorization                     │       │
│  │   - Website Management                                │       │
│  │   - Build Job Orchestration                           │       │
│  │   - Integration Management                            │       │
│  └──────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Message Queue (BullMQ + Redis)                 │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌──────────┐      │
│  │ Builder  │  │ Auditor 1 │  │  CI/CD   │  │ Auditor 2│      │
│  │  Queue   │  │   Queue   │  │  Queue   │  │  Queue   │      │
│  └──────────┘  └───────────┘  └──────────┘  └──────────┘      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Worker Layer                                │
│  ┌──────────────────────────────────────────────────────┐       │
│  │   AI Pipeline Workers                                 │       │
│  │   - Builder Worker (3+ LLM Ring)                     │       │
│  │   - Auditor 1 Worker (Single LLM)                    │       │
│  │   - CI/CD Builder Worker (3+ LLM Ring)               │       │
│  │   - Auditor 2 Worker (Single LLM)                    │       │
│  └──────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      LLM Providers                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  OpenAI API  │  │ Anthropic    │  │  Google      │          │
│  │  (Codex/GPT) │  │  (Claude)    │  │  (Gemini)    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Data & Storage Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  PostgreSQL  │  │    Redis     │  │  S3/Storage  │          │
│  │  (Primary)   │  │   (Cache)    │  │   (Assets)   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   External Integrations                          │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐  ┌────────────┐   │
│  │ ActBlue  │  │ Anedot   │  │ Salesforce │  │  HubSpot   │   │
│  └──────────┘  └──────────┘  └────────────┘  └────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## AI Pipeline Architecture

The core of CampaignSites is a 4-stage AI pipeline:

### Stage 1: Builder (3+ LLM Ring)

**Purpose**: Generate initial website code and structure

**How it works**:
1. User provides campaign requirements and customization
2. 3 LLM providers (OpenAI, Anthropic, Google) generate code independently
3. Consensus algorithm merges the best elements from each response
4. Output: Initial React/Next.js codebase

**LLM Configuration**:
- **OpenAI**: GPT-4 Turbo (primary code generation)
- **Anthropic**: Claude 3 Opus (architecture & best practices)
- **Google**: Gemini Pro (UI/UX optimization)

### Stage 2: Auditor 1 (Single LLM)

**Purpose**: Validate code quality, security, and compliance

**How it works**:
1. Receives code from Builder stage
2. Single Anthropic Claude instance performs comprehensive audit
3. Checks for:
   - Security vulnerabilities
   - Accessibility (WCAG 2.1 AA)
   - Performance issues
   - Political neutrality
   - Best practices violations

**Output**: Audit report with severity-ranked issues

### Stage 3: CI/CD Builder (3+ LLM Ring)

**Purpose**: Generate deployment configuration and CI/CD pipelines

**How it works**:
1. Takes audited code as input
2. 3 LLM providers generate:
   - Docker configurations
   - CI/CD pipelines (GitHub Actions, Azure DevOps)
   - Environment configurations
   - Integration setup scripts
3. Consensus merges best deployment strategies

**Output**: Production-ready deployment configuration

### Stage 4: Auditor 2 (Single LLM)

**Purpose**: Final deployment readiness validation

**How it works**:
1. Reviews entire deployment package
2. Single OpenAI GPT-4 instance validates:
   - Deployment safety
   - Environment completeness
   - Integration readiness
   - Monitoring setup
   - Rollback procedures

**Output**: Go/No-go decision with final recommendations

## System Components

### Frontend (Web App)

- **Framework**: Next.js 14 with App Router
- **State Management**: Zustand + React Query
- **UI**: Tailwind CSS + Headless UI
- **Features**:
  - Visual website builder interface
  - Template gallery
  - Real-time preview
  - Build progress tracking
  - Integration configuration

### Backend (API)

- **Framework**: Express.js with TypeScript
- **Authentication**: JWT-based auth
- **API Design**: RESTful with versioning
- **Key Routes**:
  - `/api/v1/websites` - Website CRUD
  - `/api/v1/builds` - Build job management
  - `/api/v1/templates` - Template management
  - `/api/v1/integrations` - Third-party integrations

### Worker System

- **Queue**: BullMQ with Redis
- **Architecture**: Dedicated workers per pipeline stage
- **Scalability**: Horizontally scalable workers
- **Monitoring**: Job metrics and error tracking

### Database Schema

See [packages/database/prisma/schema.prisma](../packages/database/prisma/schema.prisma)

**Key Models**:
- `User` - Authentication and user management
- `Organization` - Multi-tenancy for white-labeling
- `Website` - Campaign website instances
- `Template` - Reusable website templates
- `BuildJob` - Pipeline execution tracking
- `LLMLog` - LLM interaction logging
- `Integration` - Third-party service configuration

## White-Label Architecture

CampaignSites supports white-labeling through:

1. **Organization Model**: Each political party/organization has isolated data
2. **Custom Branding**: Configurable logos, colors, domains
3. **Domain Mapping**: Custom domain support per organization
4. **Template Isolation**: Organization-specific templates
5. **API Keys**: Separate integration credentials per org

## Security Architecture

### Authentication & Authorization

- JWT tokens with refresh mechanism
- Role-based access control (RBAC)
- Organization-level permissions
- API key authentication for integrations

### Data Security

- Encrypted environment variables
- Secure credential storage
- HTTPS/TLS enforcement
- Database encryption at rest
- Regular security audits

### LLM Security

- Prompt injection protection
- Output sanitization
- Rate limiting per organization
- Token usage monitoring
- Audit logging

## Integration Architecture

### Fundraising Integrations

**ActBlue**:
- OAuth 2.0 authentication
- Donation form embedding
- Real-time contribution tracking
- Webhook integration

**Anedot**:
- API key authentication
- Custom donation pages
- Transaction history sync

### CRM Integrations

**Salesforce**:
- OAuth 2.0 flow
- Contact synchronization
- Campaign member management
- Custom object support

**HubSpot**:
- API key authentication
- Contact/list management
- Form submissions
- Email automation

## Deployment Architecture

### Infrastructure

- **Primary**: Vercel (Frontend + API Functions)
- **Workers**: AWS ECS/Fargate (containerized)
- **Database**: AWS RDS PostgreSQL
- **Cache**: AWS ElastiCache Redis
- **Storage**: AWS S3
- **CDN**: CloudFront

### CI/CD Pipeline

```
┌─────────────┐
│   Git Push  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Run Tests  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    Build    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Deploy    │
│  (Staging)  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Integration│
│    Tests    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Deploy    │
│ (Production)│
└─────────────┘
```

## Scalability Considerations

### Horizontal Scaling

- **API**: Stateless design for easy scaling
- **Workers**: Independent worker processes
- **Database**: Read replicas for queries
- **Cache**: Redis cluster mode

### Performance Optimization

- **CDN**: Static asset caching
- **Database**: Query optimization and indexing
- **API**: Response caching with Redis
- **LLM**: Response caching for similar requests

## Monitoring & Observability

### Metrics

- API response times
- Worker job processing times
- LLM provider latency
- Database query performance
- Error rates per component

### Logging

- Structured JSON logging
- Centralized log aggregation
- LLM interaction logs
- User activity logs
- Integration API logs

### Alerting

- Error rate thresholds
- Job failure alerts
- Performance degradation
- Integration failures
- Cost overruns (LLM usage)

## Development Workflow

1. **Local Development**: 
   - Docker Compose for local services
   - Hot reload for all apps
   - Mock LLM providers for testing

2. **Testing**:
   - Unit tests per package
   - Integration tests for API
   - E2E tests for critical flows
   - LLM output validation tests

3. **Staging**:
   - Full pipeline testing
   - Integration testing with real services
   - Performance benchmarking

4. **Production**:
   - Blue-green deployments
   - Gradual rollouts
   - Automatic rollback on errors

## Future Enhancements

- GraphQL API layer
- Real-time collaboration
- A/B testing framework
- Advanced analytics dashboard
- Mobile app for campaign management
- Multi-language support
- Advanced template marketplace
