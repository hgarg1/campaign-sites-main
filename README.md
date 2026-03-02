# CampaignSites

> AI-powered campaign website builder with multi-LLM pipeline architecture

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)

CampaignSites is a party-neutral, AI-powered platform for rapidly creating professional campaign websites. It uses a sophisticated 4-stage multi-LLM pipeline to generate, audit, and deploy high-quality campaign sites with deep integrations to fundraising and CRM tools.

## 🌟 Key Features

- **AI-Powered Generation**: Multi-LLM architecture (OpenAI, Anthropic, Google) for high-quality code generation
- **4-Stage Pipeline**: Builder → Auditor 1 → CI/CD Builder → Auditor 2
- **White-Label Ready**: Multi-tenancy support for political organizations
- **Deep Integrations**: ActBlue, Anedot, Salesforce, HubSpot
- **Template System**: Start from scratch or use pre-built templates
- **Accessibility First**: WCAG 2.1 AA compliant
- **Political Neutrality**: Bias-free, party-neutral platform
- **Production-Ready**: Automated CI/CD, monitoring, and deployment

## 🏗️ Architecture

```
┌─────────────┐
│   User      │
│   Input     │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  Builder Ring   │  ←─ OpenAI + Anthropic + Google
│  (3+ LLMs)      │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  Auditor 1      │  ←─ Single LLM (Security & Quality)
│  (1 LLM)        │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  CI/CD Builder  │  ←─ OpenAI + Anthropic + Google
│  (3+ LLMs)      │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  Auditor 2      │  ←─ Single LLM (Deployment Check)
│  (1 LLM)        │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│   Deployment    │
└─────────────────┘
```

## 📁 Project Structure

```
campaign-sites-website/
├── apps/
│   ├── web/              # Next.js builder application
│   ├── api/              # Express.js API server
│   └── worker/           # BullMQ worker processes
├── packages/
│   ├── ai-pipeline/      # LLM orchestration logic
│   ├── database/         # Prisma schema & utilities
│   ├── integrations/     # ActBlue, Anedot, Salesforce, HubSpot
│   ├── types/            # Shared TypeScript types
│   └── ui/               # Shared React components
├── docs/                 # Documentation
└── package.json          # Monorepo root
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ ([Download](https://nodejs.org/))
- pnpm 8+ (`npm install -g pnpm`)
- PostgreSQL 15+ ([Download](https://www.postgresql.org/download/))
- Redis 7+ ([Download](https://redis.io/download))
- Docker (optional, for containerized setup)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/campaign-sites-website.git
   cd campaign-sites-website
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and database credentials
   ```

4. **Set up the database**
   ```bash
   cd packages/database
   pnpm db:push
   ```

5. **Start development servers**
   ```bash
   # From root directory
   pnpm dev
   ```

   This starts:
   - Web app: http://localhost:3000
   - API server: http://localhost:3001
   - Workers: Background processes

### Using Docker (Alternative)

```bash
docker-compose up -d
```

## 🔑 Environment Variables

Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/campaignsites
REDIS_URL=redis://localhost:6379

# AI/LLM API Keys
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
GOOGLE_AI_API_KEY=your_google_ai_api_key

# Application
NODE_ENV=development
APP_URL=http://localhost:3000
API_URL=http://localhost:3001

# Authentication
JWT_SECRET=your_jwt_secret_here
SESSION_SECRET=your_session_secret_here

# Integrations (Optional)
ACTBLUE_API_KEY=your_actblue_api_key
ANEDOT_API_KEY=your_anedot_api_key
SALESFORCE_CLIENT_ID=your_salesforce_client_id
SALESFORCE_CLIENT_SECRET=your_salesforce_client_secret
HUBSPOT_API_KEY=your_hubspot_api_key

# Storage (Optional)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
S3_BUCKET=campaignsites-assets
```

## 📖 Documentation

- [Architecture Overview](./docs/ARCHITECTURE.md)
- [AI Pipeline Details](./docs/AI_PIPELINE.md)
- [Technology Stack](./docs/TECH_STACK.md)
- [Development Guide](./docs/DEVELOPMENT.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [API Documentation](./docs/API.md)

## 🛠️ Development

### Available Scripts

```bash
# Development
pnpm dev              # Start all apps in dev mode
pnpm dev:web          # Start web app only
pnpm dev:api          # Start API server only
pnpm dev:worker       # Start worker only

# Building
pnpm build            # Build all apps
pnpm build:web        # Build web app only

# Testing
pnpm test             # Run all tests
pnpm test:watch       # Run tests in watch mode
pnpm test:coverage    # Generate coverage report

# Code Quality
pnpm lint             # Lint all code
pnpm format           # Format all code with Prettier
pnpm typecheck        # TypeScript type checking

# Database
pnpm db:generate      # Generate Prisma client
pnpm db:push          # Push schema to database
pnpm db:migrate       # Create migration
pnpm db:studio        # Open Prisma Studio

# Cleanup
pnpm clean            # Clean all build artifacts
```

### Development Workflow

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Run tests: `pnpm test`
4. Lint and format: `pnpm lint && pnpm format`
5. Commit: `git commit -m "feat: your feature"`
6. Push: `git push origin feature/your-feature`
7. Create a Pull Request

## 🧪 Testing

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Specific package
pnpm --filter @campaignsites/ai-pipeline test
```

## 📦 Deployment

### Vercel (Recommended for Web + API)

1. **Connect GitHub repository to Vercel**
2. **Set environment variables in Vercel dashboard**
3. **Deploy**: Automatic on push to main

### AWS (For Workers)

1. **Build Docker image**
   ```bash
   docker build -t campaignsites-worker -f apps/worker/Dockerfile .
   ```

2. **Push to ECR**
   ```bash
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com
   docker tag campaignsites-worker:latest <account>.dkr.ecr.us-east-1.amazonaws.com/campaignsites-worker:latest
   docker push <account>.dkr.ecr.us-east-1.amazonaws.com/campaignsites-worker:latest
   ```

3. **Deploy to ECS/Fargate**
   - See [Deployment Guide](./docs/DEPLOYMENT.md) for details

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Code of Conduct

This project adheres to a Code of Conduct. By participating, you are expected to uphold this code.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🔗 Links

- **Documentation**: [docs/](./docs/)
- **Issue Tracker**: [GitHub Issues](https://github.com/your-org/campaign-sites-website/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/campaign-sites-website/discussions)

## 💡 Support

- **Email**: support@campaignsites.com
- **Discord**: [Join our community](https://discord.gg/campaignsites)
- **Twitter**: [@CampaignSites](https://twitter.com/campaignsites)

## 🙏 Acknowledgments

- OpenAI for GPT-4 Turbo
- Anthropic for Claude 3 Opus
- Google for Gemini Pro
- The open-source community

## 🗺️ Roadmap

- [x] Core AI pipeline architecture
- [x] Multi-LLM integration
- [x] Template system
- [x] Fundraising integrations (ActBlue, Anedot)
- [x] CRM integrations (Salesforce, HubSpot)
- [ ] Advanced analytics dashboard
- [ ] A/B testing framework
- [ ] Mobile app
- [ ] Multi-language support
- [ ] Template marketplace
- [ ] Real-time collaboration
- [ ] Advanced customization tools

---

Built with ❤️ for democracy
