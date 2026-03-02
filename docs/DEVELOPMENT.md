# Development Guide

## Getting Started

This guide will help you set up your development environment and understand the codebase structure.

## Development Environment Setup

### 1. Install Required Software

#### Node.js & pnpm
```bash
# Install Node.js 18+ from https://nodejs.org/
# Verify installation
node --version  # Should be 18.x or higher

# Install pnpm globally
npm install -g pnpm

# Verify pnpm installation
pnpm --version  # Should be 8.x or higher
```

#### PostgreSQL
```bash
# Windows: Download from https://www.postgresql.org/download/windows/
# macOS: brew install postgresql@15
# Linux: sudo apt-get install postgresql-15

# Start PostgreSQL
# Windows: Use pgAdmin or Services
# macOS: brew services start postgresql@15
# Linux: sudo service postgresql start

# Create database
createdb campaignsites
```

#### Redis
```bash
# Windows: Download from https://github.com/microsoftarchive/redis/releases
# macOS: brew install redis
# Linux: sudo apt-get install redis-server

# Start Redis
# Windows: Run redis-server.exe
# macOS: brew services start redis
# Linux: sudo service redis-server start
```

### 2. Clone and Install

```bash
# Clone repository
git clone https://github.com/your-org/campaign-sites-website.git
cd campaign-sites-website

# Install all dependencies
pnpm install

# This will install dependencies for all apps and packages
```

### 3. Environment Configuration

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your actual values
# Required for development:
# - DATABASE_URL
# - REDIS_URL
# - OPENAI_API_KEY (or at least one LLM provider)
```

### 4. Database Setup

```bash
# Navigate to database package
cd packages/database

# Generate Prisma client
pnpm db:generate

# Push schema to database (creates tables)
pnpm db:push

# (Optional) Seed database with sample data
pnpm db:seed

# Return to root
cd ../..
```

### 5. Start Development Servers

```bash
# Option 1: Start all services
pnpm dev

# Option 2: Start services individually
pnpm --filter @campaignsites/web dev        # Web app on :3000
pnpm --filter @campaignsites/api dev        # API on :3001
pnpm --filter @campaignsites/worker dev     # Workers
```

## Project Structure

### Monorepo Organization

```
campaign-sites-website/
├── apps/                    # Applications
│   ├── web/                # Next.js builder app
│   │   ├── src/
│   │   │   ├── app/       # App router pages
│   │   │   ├── components/ # React components
│   │   │   └── lib/       # Utility functions
│   │   ├── package.json
│   │   └── next.config.ts
│   │
│   ├── api/                # Express API server
│   │   ├── src/
│   │   │   ├── routes/    # API routes
│   │   │   ├── middleware/ # Express middleware
│   │   │   ├── services/  # Business logic
│   │   │   └── index.ts   # Entry point
│   │   └── package.json
│   │
│   └── worker/             # Background workers
│       ├── src/
│       │   ├── workers/   # Worker implementations
│       │   └── index.ts   # Entry point
│       └── package.json
│
├── packages/               # Shared packages
│   ├── ai-pipeline/       # LLM orchestration
│   │   ├── src/
│   │   │   ├── providers.ts  # LLM providers
│   │   │   ├── llm-ring.ts   # Multi-LLM ring
│   │   │   └── auditor.ts    # Audit logic
│   │   └── package.json
│   │
│   ├── database/          # Prisma ORM
│   │   ├── prisma/
│   │   │   └── schema.prisma # Database schema
│   │   └── package.json
│   │
│   ├── integrations/      # Third-party integrations
│   │   ├── src/
│   │   │   ├── actblue.ts
│   │   │   ├── anedot.ts
│   │   │   ├── salesforce.ts
│   │   │   └── hubspot.ts
│   │   └── package.json
│   │
│   ├── types/             # Shared TypeScript types
│   │   ├── src/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── ui/                # Shared UI components
│       ├── src/
│       │   ├── Button.tsx
│       │   └── index.ts
│       └── package.json
│
├── docs/                  # Documentation
├── .github/               # GitHub Actions workflows
├── package.json           # Root package.json
├── pnpm-workspace.yaml    # Workspace configuration
└── turbo.json            # Turbo build configuration
```

### Key Directories

#### `apps/web/src/app/`
Next.js 14 App Router pages. Each folder represents a route.

```
app/
├── layout.tsx           # Root layout
├── page.tsx             # Home page (/)
├── builder/
│   └── page.tsx        # /builder
├── templates/
│   └── page.tsx        # /templates
└── api/
    └── route.ts        # API routes
```

#### `apps/api/src/routes/`
Express API routes organized by resource.

```
routes/
├── websites.ts          # /api/v1/websites
├── builds.ts            # /api/v1/builds
├── templates.ts         # /api/v1/templates
└── integrations.ts      # /api/v1/integrations
```

#### `packages/ai-pipeline/src/`
Core AI pipeline logic.

```
ai-pipeline/
├── providers.ts         # LLM provider implementations
├── llm-ring.ts          # Multi-LLM consensus logic
├── auditor.ts           # Code auditing logic
└── index.ts             # Public API
```

## Development Workflow

### Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Edit files in the appropriate app or package
   - Follow existing code style and conventions

3. **Run tests**
   ```bash
   pnpm test
   ```

4. **Lint and format**
   ```bash
   pnpm lint
   pnpm format
   ```

5. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

   Commit message format:
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation changes
   - `style:` Code style changes (formatting)
   - `refactor:` Code refactoring
   - `test:` Test additions or changes
   - `chore:` Build process or tooling changes

### Working with Packages

#### Adding a Dependency

```bash
# To a specific package
pnpm --filter @campaignsites/web add react-hook-form

# To root (dev dependency)
pnpm add -D -w prettier
```

#### Using Workspace Packages

```typescript
// In apps/web/package.json
{
  "dependencies": {
    "@campaignsites/ui": "workspace:*",
    "@campaignsites/types": "workspace:*"
  }
}

// Import in code
import { Button } from '@campaignsites/ui';
import type { BuildRequest } from '@campaignsites/types';
```

### Database Changes

#### Adding a New Model

1. Edit `packages/database/prisma/schema.prisma`
   ```prisma
   model Campaign {
     id        String   @id @default(cuid())
     name      String
     createdAt DateTime @default(now())
     
     @@map("campaigns")
   }
   ```

2. Generate migration
   ```bash
   cd packages/database
   pnpm db:migrate
   # Enter migration name when prompted
   ```

3. Regenerate Prisma client
   ```bash
   pnpm db:generate
   ```

#### Querying Database

```typescript
import { PrismaClient } from '@campaignsites/database';

const prisma = new PrismaClient();

// Create
const website = await prisma.website.create({
  data: {
    name: 'My Campaign',
    slug: 'my-campaign',
    userId: user.id,
    organizationId: org.id,
  },
});

// Find
const websites = await prisma.website.findMany({
  where: { userId: user.id },
  include: { organization: true },
});

// Update
await prisma.website.update({
  where: { id: website.id },
  data: { status: 'PUBLISHED' },
});
```

### Adding API Endpoints

1. Create route file in `apps/api/src/routes/`
   ```typescript
   // apps/api/src/routes/campaigns.ts
   import { Router } from 'express';
   
   const router = Router();
   
   router.get('/', async (req, res) => {
     // Implementation
     res.json({ campaigns: [] });
   });
   
   router.post('/', async (req, res) => {
     // Implementation
     res.json({ campaign: {} });
   });
   
   export default router;
   ```

2. Register route in `apps/api/src/index.ts`
   ```typescript
   import campaignsRouter from './routes/campaigns';
   
   app.use('/api/v1/campaigns', campaignsRouter);
   ```

### Working with Workers

#### Adding a New Queue

1. Define queue in `apps/worker/src/index.ts`
   ```typescript
   const myNewWorker = new Worker(
     'my-new-queue',
     async (job) => {
       console.log(`Processing job ${job.id}`, job.data);
       // Process job
       return { success: true };
     },
     { connection }
   );
   ```

2. Add job to queue from API
   ```typescript
   import { Queue } from 'bullmq';
   
   const myNewQueue = new Queue('my-new-queue', { connection });
   
   await myNewQueue.add('process-item', {
     itemId: '123',
     data: {},
   });
   ```

## Testing

### Running Tests

```bash
# All tests
pnpm test

# Specific package
pnpm --filter @campaignsites/ai-pipeline test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage
```

### Writing Tests

#### Unit Test Example
```typescript
// packages/ai-pipeline/src/providers.test.ts
import { describe, it, expect } from 'vitest';
import { OpenAIProvider } from './providers';

describe('OpenAIProvider', () => {
  it('should generate response', async () => {
    const provider = new OpenAIProvider(process.env.OPENAI_API_KEY!);
    const response = await provider.generate('Hello');
    expect(response).toBeTruthy();
    expect(typeof response).toBe('string');
  });
});
```

#### Integration Test Example
```typescript
// apps/api/src/routes/websites.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../index';

describe('GET /api/v1/websites', () => {
  it('should return websites', async () => {
    const response = await request(app)
      .get('/api/v1/websites')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.websites)).toBe(true);
  });
});
```

## Debugging

### VS Code

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug API",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["--filter", "@campaignsites/api", "dev"],
      "skipFiles": ["<node_internals>/**"],
      "console": "integratedTerminal"
    },
    {
      "name": "Debug Worker",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["--filter", "@campaignsites/worker", "dev"],
      "skipFiles": ["<node_internals>/**"],
      "console": "integratedTerminal"
    }
  ]
}
```

### Chrome DevTools

```bash
# Start with inspect flag
node --inspect apps/api/dist/index.js

# Open chrome://inspect in Chrome
```

## Common Tasks

### Reset Database

```bash
cd packages/database
pnpm db:push --force-reset
pnpm db:seed
```

### Clear Redis Cache

```bash
redis-cli FLUSHALL
```

### View Logs

```bash
# API logs
pnpm --filter @campaignsites/api dev | pnpm pino-pretty

# Worker logs
pnpm --filter @campaignsites/worker dev | pnpm pino-pretty
```

### Database GUI

```bash
cd packages/database
pnpm db:studio
# Opens Prisma Studio at http://localhost:5555
```

## Troubleshooting

### Port Already in Use

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3000 | xargs kill -9
```

### Prisma Client Out of Sync

```bash
cd packages/database
pnpm db:generate
```

### Module Not Found

```bash
# Reinstall dependencies
pnpm install

# Clear Turbo cache
rm -rf .turbo

# Rebuild
pnpm build
```

### Redis Connection Issues

```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG

# If not, start Redis
# macOS: brew services start redis
# Linux: sudo service redis-server start
```

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [pnpm Documentation](https://pnpm.io/)
- [Turbo Documentation](https://turbo.build/repo/docs)
