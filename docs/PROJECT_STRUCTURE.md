# Project Structure Visualization

## Directory Tree

```
campaign-sites-website/
│
├── 📱 apps/                          # Applications
│   ├── web/                          # Next.js Builder App (Port 3000)
│   │   ├── src/
│   │   │   ├── app/                 # Next.js 14 App Router
│   │   │   │   ├── layout.tsx       # Root layout
│   │   │   │   ├── page.tsx         # Home page
│   │   │   │   └── globals.css      # Global styles
│   │   │   ├── components/          # React components
│   │   │   └── lib/                 # Utilities
│   │   ├── package.json
│   │   ├── next.config.ts
│   │   └── tailwind.config.ts
│   │
│   ├── api/                          # Express API Server (Port 3001)
│   │   ├── src/
│   │   │   ├── routes/              # API endpoints
│   │   │   ├── middleware/          # Express middleware
│   │   │   ├── services/            # Business logic
│   │   │   └── index.ts             # Server entry point
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── worker/                       # Background Workers
│       ├── src/
│       │   ├── workers/             # Worker implementations
│       │   └── index.ts             # Worker entry point
│       ├── package.json
│       └── tsconfig.json
│
├── 📦 packages/                      # Shared Packages
│   ├── ai-pipeline/                  # ⚡ AI/LLM Orchestration
│   │   ├── src/
│   │   │   ├── providers.ts         # OpenAI, Anthropic, Google providers
│   │   │   ├── llm-ring.ts          # Multi-LLM consensus logic
│   │   │   ├── auditor.ts           # Code auditing
│   │   │   └── index.ts             # Public API
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── database/                     # 🗄️ Prisma ORM
│   │   ├── prisma/
│   │   │   └── schema.prisma        # Database schema
│   │   ├── src/
│   │   │   └── index.ts             # Prisma client export
│   │   └── package.json
│   │
│   ├── integrations/                 # 🔌 Third-party APIs
│   │   ├── src/
│   │   │   ├── actblue.ts           # ActBlue integration
│   │   │   ├── anedot.ts            # Anedot integration
│   │   │   ├── salesforce.ts        # Salesforce integration
│   │   │   ├── hubspot.ts           # HubSpot integration
│   │   │   └── index.ts             # Exports
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── types/                        # 📝 TypeScript Types
│   │   ├── src/
│   │   │   └── index.ts             # Shared type definitions
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── ui/                           # 🎨 UI Components
│       ├── src/
│       │   ├── Button.tsx           # Shared Button component
│       │   └── index.ts             # Component exports
│       ├── package.json
│       └── tsconfig.json
│
├── 📚 docs/                          # Documentation
│   ├── ARCHITECTURE.md               # System architecture
│   ├── AI_PIPELINE.md                # AI pipeline details
│   ├── TECH_STACK.md                 # Technology choices
│   ├── DEVELOPMENT.md                # Development guide
│   └── GETTING_STARTED.md            # Quick start guide
│
├── ⚙️ Configuration Files
│   ├── package.json                  # Root package configuration
│   ├── pnpm-workspace.yaml           # Workspace definition
│   ├── turbo.json                    # Turbo build config
│   ├── tsconfig.json                 # TypeScript base config
│   ├── .prettierrc                   # Code formatting rules
│   ├── .gitignore                    # Git ignore rules
│   ├── .env.example                  # Environment variables template
│   └── docker-compose.yml            # Docker setup
│
└── 📄 Documentation
    ├── README.md                     # Main project README
    └── LICENSE                       # MIT License
```

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│  ┌────────────────┐  ┌────────────────┐                    │
│  │   Web App      │  │  Admin App     │                    │
│  │  (Next.js 14)  │  │  (Future)      │                    │
│  │  Port: 3000    │  │                │                    │
│  └────────────────┘  └────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     API LAYER                                │
│  ┌────────────────────────────────────────────┐             │
│  │   Express.js REST API                       │             │
│  │   Port: 3001                                │             │
│  │   - Authentication & Authorization          │             │
│  │   - Website Management                      │             │
│  │   - Build Job Orchestration                 │             │
│  │   - Integration Configuration               │             │
│  └────────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   QUEUE LAYER                                │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Builder  │  │ Auditor 1 │  │  CI/CD   │  │ Auditor 2│  │
│  │  Queue   │  │   Queue   │  │  Queue   │  │  Queue   │  │
│  │          │  │           │  │          │  │          │  │
│  └──────────┘  └───────────┘  └──────────┘  └──────────┘  │
│                      BullMQ + Redis                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   WORKER LAYER                               │
│  ┌────────────────────────────────────────────┐             │
│  │   Background Workers                        │             │
│  │   - Builder Worker (3+ LLM Ring)           │             │
│  │   - Auditor 1 Worker (Single LLM)          │             │
│  │   - CI/CD Builder Worker (3+ LLM Ring)     │             │
│  │   - Auditor 2 Worker (Single LLM)          │             │
│  └────────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  AI/LLM LAYER                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   OpenAI     │  │  Anthropic   │  │   Google     │      │
│  │  GPT-4 Turbo │  │  Claude 3    │  │  Gemini Pro  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                    @campaignsites/ai-pipeline                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   DATA LAYER                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ PostgreSQL   │  │    Redis     │  │  S3/Storage  │      │
│  │   (Prisma)   │  │   (Cache)    │  │   (Assets)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│            @campaignsites/database                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│               INTEGRATION LAYER                              │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐  ┌──────────┐ │
│  │ ActBlue  │  │ Anedot   │  │ Salesforce │  │ HubSpot  │ │
│  └──────────┘  └──────────┘  └────────────┘  └──────────┘ │
│              @campaignsites/integrations                     │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### Website Creation Flow

```
┌─────────────┐
│    User     │ Enters campaign details
│   Browser   │ and preferences
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Web App    │ User interface
│  (Next.js)  │ Form validation
└──────┬──────┘
       │ POST /api/v1/websites
       ▼
┌─────────────┐
│     API     │ Create website record
│  (Express)  │ Enqueue build job
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Redis     │ Store job in
│   Queue     │ builder-queue
└──────┬──────┘
       │
       ▼
┌─────────────────────────────┐
│  Builder Worker             │
│  ┌─────────────────────┐   │
│  │  LLM Ring           │   │
│  │  → OpenAI (GPT-4)   │   │ Generate website code
│  │  → Anthropic        │   │ (parallel execution)
│  │  → Google           │   │
│  └─────────────────────┘   │
│  Build Consensus            │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  Auditor 1 Worker           │
│  - Security check           │
│  - Accessibility check      │ Validate code quality
│  - Performance check        │
│  - Best practices check     │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  CI/CD Builder Worker       │
│  ┌─────────────────────┐   │
│  │  LLM Ring           │   │
│  │  → OpenAI           │   │ Generate deployment
│  │  → Anthropic        │   │ configurations
│  │  → Google           │   │
│  └─────────────────────┘   │
│  Build Consensus            │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  Auditor 2 Worker           │
│  - Deployment safety        │
│  - Environment check        │ Final validation
│  - Integration check        │
│  - Monitoring check         │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────┐
│ Deployment  │ Deploy to hosting
│   Stage     │ (Vercel, AWS, etc.)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Published  │ Website is live!
│   Website   │
└─────────────┘
```

## Package Dependencies

```
apps/web
├── @campaignsites/ui
├── @campaignsites/types
├── next
├── react
└── tailwindcss

apps/api
├── @campaignsites/database
├── @campaignsites/types
├── @campaignsites/ai-pipeline
├── @campaignsites/integrations
├── express
├── bullmq
└── jsonwebtoken

apps/worker
├── @campaignsites/database
├── @campaignsites/types
├── @campaignsites/ai-pipeline
└── bullmq

packages/ai-pipeline
├── @campaignsites/types
├── openai
├── @anthropic-ai/sdk
└── @google/generative-ai

packages/database
└── @prisma/client

packages/integrations
├── @campaignsites/types
└── axios

packages/types
(no dependencies)

packages/ui
└── react
```

## Communication Patterns

### Synchronous (HTTP/REST)
- Web App ↔ API Server
- API Server ↔ Database
- API Server ↔ Third-party APIs

### Asynchronous (Message Queue)
- API Server → Redis Queue → Workers
- Workers ↔ LLM Providers
- Workers → Database (write results)

### Real-time (Future)
- Web App ↔ API Server (WebSocket for build progress)
- Workers → Web App (via WebSocket for status updates)

## Development Workflow

```
Developer
    │
    ├── Edit Code
    │   └── apps/web/src/app/page.tsx
    │
    ├── Hot Reload (Next.js)
    │   └── See changes at http://localhost:3000
    │
    ├── Edit API
    │   └── apps/api/src/routes/websites.ts
    │
    ├── Auto Restart (tsx watch)
    │   └── API reloads automatically
    │
    ├── Edit Package
    │   └── packages/ai-pipeline/src/llm-ring.ts
    │
    └── Turbo Rebuild
        └── Dependent apps rebuild automatically
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        VERCEL                                │
│  ┌────────────────┐         ┌────────────────┐             │
│  │   Web App      │         │   API Routes   │             │
│  │  (Edge/CDN)    │         │  (Serverless)  │             │
│  └────────────────┘         └────────────────┘             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     AWS/CLOUD                                │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐  │
│  │  RDS           │  │  ElastiCache   │  │     S3       │  │
│  │  PostgreSQL    │  │  Redis         │  │   Storage    │  │
│  └────────────────┘  └────────────────┘  └──────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────┐             │
│  │   ECS/Fargate Workers                       │             │
│  │   - Builder Worker (auto-scaling)          │             │
│  │   - Auditor Workers                         │             │
│  │   - CI/CD Builder Worker                    │             │
│  └────────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────┘
```

This structure provides a clear, maintainable, and scalable architecture for CampaignSites!
