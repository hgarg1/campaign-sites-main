# Getting Started with CampaignSites

This guide will walk you through setting up CampaignSites on your local machine in under 15 minutes.

## Prerequisites Checklist

Before you begin, make sure you have:

- [ ] Node.js 18+ installed
- [ ] pnpm 8+ installed
- [ ] PostgreSQL 15+ installed and running
- [ ] Redis 7+ installed and running
- [ ] At least one LLM API key (OpenAI, Anthropic, or Google)

## Step-by-Step Setup

### Step 1: Install Node.js and pnpm

**Node.js:**
- Download from [nodejs.org](https://nodejs.org/) (LTS version recommended)
- Verify: `node --version` (should show v18.x or higher)

**pnpm:**
```bash
npm install -g pnpm
pnpm --version  # Should show 8.x or higher
```

### Step 2: Install and Start PostgreSQL

**Windows:**
1. Download installer from [postgresql.org](https://www.postgresql.org/download/windows/)
2. Run installer, remember the password you set
3. PostgreSQL starts automatically

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install postgresql-15
sudo service postgresql start
```

**Create Database:**
```bash
# macOS/Linux
createdb campaignsites

# Windows (use psql or pgAdmin)
psql -U postgres
CREATE DATABASE campaignsites;
\q
```

### Step 3: Install and Start Redis

**Windows:**
1. Download from [GitHub Releases](https://github.com/microsoftarchive/redis/releases)
2. Extract and run `redis-server.exe`

**macOS:**
```bash
brew install redis
brew services start redis
```

**Linux:**
```bash
sudo apt-get install redis-server
sudo service redis-server start
```

**Verify Redis:**
```bash
redis-cli ping
# Should return: PONG
```

### Step 4: Clone and Install Project

```bash
# Clone the repository
git clone https://github.com/your-org/campaign-sites-website.git
cd campaign-sites-website

# Install all dependencies (this may take a few minutes)
pnpm install
```

### Step 5: Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env
```

**Edit `.env` with your text editor:**

```env
# Database (update if you changed default settings)
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/campaignsites
REDIS_URL=redis://localhost:6379

# Get API keys from:
# - OpenAI: https://platform.openai.com/api-keys
# - Anthropic: https://console.anthropic.com/
# - Google: https://makersuite.google.com/app/apikey

OPENAI_API_KEY=sk-...your-key-here
ANTHROPIC_API_KEY=sk-ant-...your-key-here
GOOGLE_AI_API_KEY=AI...your-key-here

# These can stay as-is for development
NODE_ENV=development
APP_URL=http://localhost:3000
API_URL=http://localhost:3001
JWT_SECRET=your-secret-key-change-this-in-production
SESSION_SECRET=another-secret-key-change-this-too
```

**Minimum Required:**
- `DATABASE_URL`
- `REDIS_URL`
- At least **one** LLM API key (OpenAI, Anthropic, or Google)

### Step 6: Set Up the Database

```bash
# Navigate to database package
cd packages/database

# Generate Prisma client
pnpm db:generate

# Create database tables
pnpm db:push

# Return to root
cd ../..
```

### Step 7: Start the Development Servers

```bash
# Start all services (web, API, workers)
pnpm dev
```

You should see:
```
> @campaignsites/web dev
> next dev

  ▲ Next.js 14.1.0
  - Local:        http://localhost:3000

> @campaignsites/api dev
> tsx watch src/index.ts

🚀 API server running on port 3001

> @campaignsites/worker dev
> tsx watch src/index.ts

🔧 Workers started successfully
```

### Step 8: Open the Application

Open your browser and navigate to:
- **Builder App:** http://localhost:3000
- **API Health Check:** http://localhost:3001/health

You should see the CampaignSites landing page!

## Verification Checklist

✅ All services started without errors  
✅ Web app loads at http://localhost:3000  
✅ API responds at http://localhost:3001/health  
✅ No error messages in the terminal  

## Next Steps

### Create Your First Website

1. Sign up for an account at http://localhost:3000/signup
2. Click "New Website"
3. Enter campaign details
4. Watch the AI pipeline generate your site!

### Explore the Code

```bash
# Open in VS Code
code .

# Key files to explore:
# - apps/web/src/app/page.tsx (home page)
# - apps/api/src/index.ts (API server)
# - packages/ai-pipeline/src/llm-ring.ts (multi-LLM logic)
```

### Run Tests

```bash
pnpm test
```

## Troubleshooting

### "Port 3000 is already in use"

**Find and kill the process:**
```bash
# macOS/Linux
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### "Can't connect to database"

**Check PostgreSQL is running:**
```bash
# macOS
brew services list | grep postgresql

# Linux
sudo service postgresql status

# Windows
# Check Services app for "postgresql-x64-15"
```

**Verify connection:**
```bash
psql -U postgres -d campaignsites
# Should connect without errors
```

### "Redis connection refused"

**Check Redis is running:**
```bash
redis-cli ping
# Should return: PONG
```

**Start Redis if not running:**
```bash
# macOS
brew services start redis

# Linux
sudo service redis-server start

# Windows
# Run redis-server.exe
```

### "Prisma Client is not generated"

```bash
cd packages/database
pnpm db:generate
cd ../..
```

### "Module not found errors"

```bash
# Reinstall dependencies
rm -rf node_modules
pnpm install

# Rebuild
pnpm build
```

### LLM API Errors

**OpenAI:**
- Verify your API key at https://platform.openai.com/api-keys
- Check you have credits/billing enabled

**Anthropic:**
- Verify your API key at https://console.anthropic.com/
- Check API access is enabled

**Google:**
- Verify your API key at https://makersuite.google.com/app/apikey
- Enable the Generative AI API

## Getting Help

If you're stuck:

1. **Check the logs** - Look for error messages in the terminal
2. **Search issues** - Check [GitHub Issues](https://github.com/your-org/campaign-sites-website/issues)
3. **Ask for help** - Join our [Discord](https://discord.gg/campaignsites) or create an issue

## Optional: Docker Setup

Prefer Docker? Use this instead of manual setup:

```bash
# Make sure Docker is installed and running

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Development Tools (Optional)

### Recommended VS Code Extensions

- ESLint
- Prettier
- Prisma
- TypeScript and JavaScript Language Features
- Tailwind CSS IntelliSense

### Database GUI

```bash
# Prisma Studio (web-based)
cd packages/database
pnpm db:studio
# Opens at http://localhost:5555

# Or use pgAdmin, TablePlus, etc.
```

### Redis GUI

- [Redis Insight](https://redis.com/redis-enterprise/redis-insight/) (free)
- [TablePlus](https://tableplus.com/) (paid, supports both PostgreSQL and Redis)

## What's Next?

- Read the [Architecture Overview](./ARCHITECTURE.md)
- Learn about the [AI Pipeline](./AI_PIPELINE.md)
- Explore the [Technology Stack](./TECH_STACK.md)
- Follow the [Development Guide](./DEVELOPMENT.md)

---

**Still stuck?** Open an issue or ask in Discord - we're here to help! 🚀
