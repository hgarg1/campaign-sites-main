# Technology Stack

## Overview

CampaignSites uses a modern, scalable technology stack designed for high performance, developer productivity, and reliability.

## Frontend

### Web Application (Builder UI)

- **Framework**: [Next.js 14](https://nextjs.org/) with App Router
  - Server-side rendering (SSR)
  - Static site generation (SSG)
  - API routes
  - Image optimization
  - Built-in TypeScript support

- **UI Framework**: [React 18](https://react.dev/)
  - Component-based architecture
  - Server Components
  - Suspense for data fetching
  - Concurrent rendering

- **Styling**: 
  - [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS
  - [Headless UI](https://headlessui.com/) - Unstyled, accessible components
  - [Heroicons](https://heroicons.com/) - SVG icons

- **State Management**:
  - [Zustand](https://zustand-demo.pmnd.rs/) - Lightweight state management
  - [TanStack Query (React Query)](https://tanstack.com/query) - Server state management

- **Animation**: [Framer Motion](https://www.framer.com/motion/) - Production-ready animations

- **Forms**: 
  - React Hook Form - Form validation
  - Zod - Schema validation

## Backend

### API Server

- **Runtime**: [Node.js 18+](https://nodejs.org/)
  - LTS version for stability
  - ES2022 features
  - Native ESM support

- **Framework**: [Express.js](https://expressjs.com/)
  - Mature, battle-tested
  - Extensive middleware ecosystem
  - RESTful API design

- **Language**: [TypeScript 5.3+](https://www.typescriptlang.org/)
  - Type safety
  - Better developer experience
  - Refactoring confidence

- **Validation**: [Zod](https://zod.dev/)
  - Runtime type checking
  - Schema validation
  - Type inference

### Worker System

- **Queue**: [BullMQ](https://docs.bullmq.io/)
  - Redis-backed job queue
  - Priority queues
  - Delayed jobs
  - Job retry with exponential backoff
  - Job events and progress tracking

- **Process Management**: PM2 or Docker Swarm
  - Auto-restart on failure
  - Load balancing
  - Cluster mode

## Database

### Primary Database

- **System**: [PostgreSQL 15+](https://www.postgresql.org/)
  - ACID compliance
  - JSONB support for flexible schemas
  - Full-text search
  - Row-level security
  - Excellent performance

- **ORM**: [Prisma](https://www.prisma.io/)
  - Type-safe database access
  - Auto-generated types
  - Migration management
  - Prisma Studio for DB GUI
  - Query optimization

### Caching & Sessions

- **System**: [Redis 7+](https://redis.io/)
  - In-memory data store
  - Cache frequently accessed data
  - Session storage
  - Job queue backend
  - Pub/sub for real-time features

## AI/LLM Providers

### OpenAI
- **SDK**: [openai](https://www.npmjs.com/package/openai)
- **Models**: 
  - GPT-4 Turbo (primary code generation)
  - GPT-3.5 Turbo (fallback/cost optimization)

### Anthropic
- **SDK**: [@anthropic-ai/sdk](https://www.npmjs.com/package/@anthropic-ai/sdk)
- **Models**:
  - Claude 3 Opus (auditing, reasoning)
  - Claude 3 Sonnet (fallback)

### Google
- **SDK**: [@google/generative-ai](https://www.npmjs.com/package/@google/generative-ai)
- **Models**:
  - Gemini Pro (UI/UX generation)
  - Gemini Pro Vision (image analysis)

## Third-Party Integrations

### Fundraising

- **ActBlue**: REST API
  - OAuth 2.0
  - Webhook events
  - Contribution tracking

- **Anedot**: REST API
  - API key authentication
  - Transaction sync
  - Custom pages

### CRM

- **Salesforce**: REST API + SOAP API
  - OAuth 2.0
  - SOQL queries
  - Bulk API for large datasets
  - Change Data Capture

- **HubSpot**: REST API
  - API key / OAuth
  - Contacts, Companies, Deals
  - Forms and workflows
  - Email automation

## Infrastructure & DevOps

### Deployment Platform

**Primary**: [Vercel](https://vercel.com/)
- Zero-config Next.js deployment
- Edge network (CDN)
- Automatic HTTPS
- Preview deployments
- Environment variables
- Analytics

**Workers**: AWS ECS/Fargate or Railway
- Containerized worker processes
- Auto-scaling
- Load balancing

### Container Technology

- **Docker**: Containerization
  - Consistent environments
  - Easy local development
  - Production-ready images

- **Docker Compose**: Local orchestration
  - Multi-container setup
  - Service dependencies
  - Easy onboarding

### CI/CD

- **GitHub Actions**
  - Automated testing
  - Automated deployments
  - Dependency updates
  - Security scanning

### Monitoring & Logging

- **Error Tracking**: [Sentry](https://sentry.io/)
  - Error tracking
  - Performance monitoring
  - Release tracking

- **Logging**: [Pino](https://getpino.io/)
  - Fast JSON logging
  - Log levels
  - Structured logs

- **Analytics**: 
  - Vercel Analytics
  - Custom event tracking
  - LLM usage metrics

### Storage

- **Object Storage**: AWS S3 or Cloudflare R2
  - Website assets
  - User uploads
  - Generated code artifacts
  - Template storage

- **CDN**: CloudFront or Cloudflare
  - Static asset delivery
  - Global edge network
  - DDoS protection

## Development Tools

### Package Management

- **Manager**: [pnpm](https://pnpm.io/)
  - Fast, disk-efficient
  - Strict dependency resolution
  - Workspace support for monorepo

### Monorepo Management

- **Build System**: [Turbo](https://turbo.build/)
  - Incremental builds
  - Parallel execution
  - Remote caching
  - Task pipelines

### Code Quality

- **Linting**: [ESLint](https://eslint.org/)
  - Code quality rules
  - Best practices enforcement
  - TypeScript support

- **Formatting**: [Prettier](https://prettier.io/)
  - Consistent code style
  - Auto-formatting
  - Git hooks integration

- **Git Hooks**: [Husky](https://typicode.github.io/husky/)
  - Pre-commit hooks
  - Pre-push validation
  - Commit message linting

### Testing

- **Unit Testing**: [Vitest](https://vitest.dev/)
  - Fast execution
  - Jest-compatible API
  - TypeScript support
  - Coverage reports

- **E2E Testing**: [Playwright](https://playwright.dev/)
  - Cross-browser testing
  - Auto-wait mechanisms
  - Screenshot/video capture
  - Parallel execution

- **API Testing**: [Supertest](https://github.com/ladjs/supertest)
  - Express route testing
  - HTTP assertions

## Security

### Authentication

- **JWT**: [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken)
  - Stateless authentication
  - Token expiration
  - Refresh tokens

### Encryption

- **Password Hashing**: [bcrypt](https://www.npmjs.com/package/bcrypt)
  - Salt + hash
  - Configurable rounds

### Security Headers

- **Helmet**: [helmet](https://helmetjs.github.io/)
  - CSP headers
  - XSS protection
  - HSTS
  - X-Frame-Options

### Environment Variables

- **dotenv**: Local development
- **Vercel Environment Variables**: Production
- **AWS Secrets Manager**: Sensitive credentials

## Documentation

- **API Docs**: OpenAPI/Swagger
  - Interactive API documentation
  - Type validation
  - Auto-generated from code

- **Code Docs**: TSDoc
  - Inline documentation
  - Type information
  - IDE integration

## Version Control

- **Git**: Source control
- **GitHub**: Code hosting
  - Pull request reviews
  - Branch protection
  - Issue tracking
  - Project boards

## Cost Estimates

### Infrastructure (Monthly)

| Service | Usage | Cost |
|---------|-------|------|
| Vercel Pro | Unlimited bandwidth | $20 |
| AWS RDS PostgreSQL | db.t4g.small | $30 |
| AWS ElastiCache Redis | cache.t4g.micro | $15 |
| AWS S3 | 100GB storage + transfer | $5 |
| AWS ECS Fargate | 2 workers 24/7 | $50 |
| **Total Infrastructure** | | **~$120** |

### LLM Costs (Per Website Build)

| Provider | Usage | Cost |
|----------|-------|------|
| OpenAI GPT-4 Turbo | ~20K tokens | $0.40 |
| Anthropic Claude 3 Opus | ~15K tokens | $0.75 |
| Google Gemini Pro | ~15K tokens | $0.15 |
| **Total per build** | | **~$1.30** |

### Integrations

- ActBlue: Free (transaction fees apply)
- Anedot: Free (transaction fees apply)
- Salesforce: Varies by plan
- HubSpot: Varies by plan
- Sentry: Free tier available

## Why These Technologies?

### TypeScript Everywhere
- **Type Safety**: Catch errors at compile time
- **Better DX**: Autocomplete, refactoring tools
- **Documentation**: Types serve as documentation
- **Confidence**: Refactor without fear

### Next.js
- **Performance**: Automatic optimization
- **SEO**: Server-side rendering
- **DX**: File-based routing, zero config
- **Ecosystem**: Large community, extensive plugins

### PostgreSQL
- **Reliability**: Battle-tested, ACID compliant
- **Features**: JSONB, full-text search, extensions
- **Performance**: Excellent query optimizer
- **Scalability**: Read replicas, partitioning

### Monorepo with pnpm + Turbo
- **Code Sharing**: Easy package reuse
- **Consistency**: Shared configs, tools
- **Performance**: Optimized builds, caching
- **Developer Experience**: Single repo, easier onboarding

### BullMQ
- **Reliability**: Built on Redis, proven tech
- **Features**: Priorities, delays, retries
- **Observability**: Built-in metrics, events
- **Performance**: Fast, efficient

This stack provides a solid foundation for building a scalable, maintainable, and performant AI-powered campaign website builder.
