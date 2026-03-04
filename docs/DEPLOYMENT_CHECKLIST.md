# Admin Portal - Deployment & Optimization Guide

## Table of Contents
1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Deployment Instructions](#deployment-instructions)
3. [Post-Deployment Validation](#post-deployment-validation)
4. [Performance Optimization](#performance-optimization)
5. [Security Hardening](#security-hardening)
6. [Monitoring & Alerting](#monitoring--alerting)
7. [Rollback Procedure](#rollback-procedure)

---

## Pre-Deployment Checklist

### Code Quality & Testing
- [ ] All unit tests pass (`npm run test`)
- [ ] All integration tests pass (`npm run test:integration`)
- [ ] All E2E tests pass (`npm run test:e2e`)
- [ ] Code coverage is >= 70%
- [ ] No console errors or warnings
- [ ] ESLint passes with no errors (`npm run lint`)
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] Security audit passes (`npm run security-audit`)

### Build Validation
- [ ] Production bundle builds successfully
- [ ] Build size is acceptable (< 500KB gzipped)
- [ ] No unused dependencies
- [ ] No security vulnerabilities (`npm audit`)
- [ ] All environment variables are configured

### Database & Migrations
- [ ] Latest database migrations are applied
  ```bash
  pnpm run db:migrate:deploy
  ```
- [ ] Database backup exists
- [ ] Migration rollback plan is tested
- [ ] Database indexes are optimized
- [ ] Slow query log is reviewed

### Dependencies & Versions
- [ ] All dependencies are up-to-date
- [ ] Breaking changes from updates are addressed
- [ ] Lock file is committed (`pnpm-lock.yaml`)
- [ ] Node.js version matches requirements (18+)

### Documentation
- [ ] README is updated
- [ ] API documentation is complete
- [ ] Deployment guide is current
- [ ] Troubleshooting guide is available
- [ ] Changelog is updated
- [ ] Team is trained on new features

### Security Review
- [ ] HTTPS is enforced
- [ ] All secrets are in secure storage (not in code)
- [ ] API keys are validated on every request
- [ ] Session timeout is configured (default: 30 minutes)
- [ ] CORS headers are properly configured
- [ ] CSP headers are set
- [ ] SQL injection prevention is verified
- [ ] XSS protection is verified

### Performance Review
- [ ] Page load times are < 2 seconds (dashboard)
- [ ] API response times are < 200ms average
- [ ] Database queries are optimized
- [ ] Caching strategy is in place
- [ ] Images are optimized
- [ ] Bundle size is acceptable

---

## Deployment Instructions

### 1. Staging Deployment

**Prepare Staging Environment**:
```bash
# Pull latest code
git checkout main
git pull origin main

# Install dependencies
pnpm install

# Build for production
pnpm run build

# Run migrations on staging database
DATABASE_URL=<staging-db-url> pnpm run db:migrate:deploy

# Verify build
npm run test:e2e --env=staging
```

**Deploy to Staging**:
```bash
# Deploy to staging server
# (Using your preferred deployment tool: Vercel, Heroku, AWS, etc.)
```

**Validate Staging Deployment**:
- [ ] All pages load correctly
- [ ] All API endpoints respond
- [ ] Database connectivity works
- [ ] Redis cache works
- [ ] Email notifications work
- [ ] External integrations work
- [ ] Monitoring is receiving data

### 2. Production Deployment

**Create Release Branch**:
```bash
git checkout -b release/admin-portal-v1.0
```

**Tag Release**:
```bash
git tag -a v1.0.0 -m "Admin Portal v1.0.0 - Production Release"
git push origin v1.0.0
```

**Backup Production Database**:
```bash
# Create backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
ls -lh backup_*.sql
```

**Deploy to Production**:
```bash
# Using zero-downtime deployment strategy
# Option 1: Blue-Green Deployment
# - Deploy to green environment
# - Run smoke tests
# - Switch traffic from blue to green

# Option 2: Canary Deployment
# - Deploy to 5% of traffic
# - Monitor metrics
# - Gradually increase to 100%

# Option 3: Rolling Deployment
# - Deploy instance by instance
# - Keep service available during deployment
```

### 3. Database Migration Strategy

**For Large Migrations**:
1. **Create migration file**:
   ```bash
   npx prisma migrate dev --name <migration-name>
   ```

2. **Test migration**:
   - Test on staging database
   - Verify rollback procedure works
   - Estimate migration duration

3. **Schedule migration**:
   - During low-traffic period
   - Communicate with users
   - Have rollback plan ready

4. **Execute migration**:
   ```bash
   DATABASE_URL=<prod-db-url> pnpm run db:migrate:deploy
   ```

5. **Verify migration**:
   - Check data integrity
   - Verify no services are broken
   - Monitor performance impact

---

## Post-Deployment Validation

### Immediate Checks (0-5 minutes)
- [ ] Admin portal loads (`/admin/portal/dashboard`)
- [ ] Login works correctly
- [ ] Dashboard displays metrics
- [ ] No 500 errors in logs
- [ ] Performance metrics show improvement

### Functional Checks (5-30 minutes)
- [ ] User management works
- [ ] Organization management works
- [ ] Settings can be updated
- [ ] Analytics display correctly
- [ ] Logs viewer works
- [ ] Reports can be generated
- [ ] API endpoints respond correctly

### System Health Checks (30+ minutes)
- [ ] Database connection is stable
- [ ] Redis cache is working
- [ ] All background jobs are running
- [ ] Email notifications are sent
- [ ] External API integrations work
- [ ] Monitoring dashboards show normal metrics
- [ ] Error rates are normal
- [ ] Performance is acceptable

### Smoke Test Commands
```bash
# Run smoke tests
curl https://yoursite.com/admin/portal/dashboard
curl https://yoursite.com/api/admin/health
curl https://yoursite.com/api/admin/users?limit=1
```

---

## Performance Optimization

### Frontend Optimization

**Code Splitting**:
```typescript
// Lazy load heavy components
const HeavyAnalyticsChart = dynamic(() => import('./charts/analytical'), {
  loading: () => <LoadingSpinner />,
  ssr: false,
});
```

**Image Optimization**:
```typescript
import Image from 'next/image';

<Image 
  src="/logo.png" 
  alt="Logo"
  width={100}
  height={100}
  priority
/>
```

**Caching Strategy**:
```typescript
// Cache API responses
const getCachedData = async (key: string) => {
  const cached = cache.get(key);
  if (cached) return cached;
  
  const data = await fetchData();
  cache.set(key, data, 3600); // 1 hour TTL
  return data;
};
```

**Compression**:
```javascript
// In next.config.js
module.exports = {
  compress: true,
  poweredByHeader: false,
};
```

### Backend Optimization

**Database Query Optimization**:
```typescript
// Use database indexes
// Avoid N+1 queries
// Use pagination for large result sets

const users = await prisma.user.findMany({
  take: 50,
  skip: (page - 1) * 50,
  include: { organization: true }, // Eager load
});
```

**API Response Compression**:
```javascript
// Use gzip compression for API responses
app.use(compression());
```

**Redis Caching**:
```typescript
const redis = new Redis(process.env.REDIS_URL);

// Cache frequently accessed data
const cachedData = await redis.get('key');
if (!cachedData) {
  const data = await fetchFromDB();
  await redis.setex('key', 3600, JSON.stringify(data));
}
```

### Monitoring Performance

**Metrics to Track**:
- Page load time (< 2s target)
- API response time (< 200ms target)
- Database query performance
- Redis cache hit rate
- CPU usage
- Memory usage
- Disk I/O

**Performance Budget**:
- JavaScript: < 200KB gzipped
- CSS: < 50KB gzipped
- Images: < 100KB total
- Total page size: < 500KB

---

## Security Hardening

### HTTPS & TLS
- [ ] HTTPS is enforced on all pages
```typescript
// Next.js redirect configuration
module.exports = {
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'header', key: 'X-Forwarded-Proto', value: '(?!https)' }],
        destination: 'https://:host/:path*',
        permanent: true,
      },
    ];
  },
};
```

### Request Validation
```typescript
// Validate all input
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

router.post('/users', (req, res) => {
  const result = schema.safeParse(req.body);
  if (!result.success) return res.status(400).json(result.error);
  // Process validated data
});
```

### Rate Limiting
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

router.post('/api/users', limiter, (req, res) => {
  // API endpoint
});
```

### CSRF Protection
```typescript
import csrf from 'csurf';

const csrfProtection = csrf({ cookie: false });

router.post('/users', csrfProtection, (req, res) => {
  // CSRF token verified
});
```

### Security Headers
```javascript
// In Next.js middleware
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  response.headers.set('Content-Security-Policy', "default-src 'self'");
  
  return response;
}
```

---

## Monitoring & Alerting

### Key Metrics to Monitor

**Application Health**:
- Error rate (target: < 0.5%)
- API response time (target: < 200ms)
- Page load time (target: < 2s)
- Database connection pool usage
- Redis memory usage

**System Health**:
- CPU usage (alert if > 80%)
- Memory usage (alert if > 85%)
- Disk space (alert if < 10%)
- Network I/O

**Business Metrics**:
- Active admin sessions
- API key usage
- Feature usage (dashboard views, user creates, etc.)
- Data export requests

### Alert Configuration

**Critical Alerts** (Page on-call):
- Error rate > 1%
- API response time > 1000ms
- Database error rate > 5%
- Service is down

**High Alerts** (Email to team):
- Error rate > 0.5%
- API response time > 500ms
- Database query time > 1000ms
- Memory usage > 85%

**Medium Alerts** (Slack notification):
- API response time > 250ms
- Slow query detected
- Cache hit rate < 50%

### Monitoring Setup

**Prometheus Configuration**:
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'admin-portal'
    static_configs:
      - targets: ['localhost:3000/metrics']
```

**Grafana Dashboards**:
- Admin Portal Health Dashboard
- API Performance Dashboard
- Database Performance Dashboard
- User Activity Dashboard

---

## Rollback Procedure

### Automatic Rollback Triggers
- Error rate > 5% for 5 minutes
- API response time > 5000ms for 10 minutes
- Database connection failures
- Critical service timeouts

### Manual Rollback Steps

**1. Identify the Issue**:
```bash
# Check error logs
tail -f /var/log/admin-portal/error.log

# Check metrics
curl https://prometheus.local/api/v1/query?query=error_rate
```

**2. Preparation**:
```bash
# Backup current deployment version
git log --oneline | head -1
# Note the current commit: abc1234

# Switch to previous release tag
git tag -l | grep 'v[0-9]' | sort -V | tail -2
# Note the previous version: v0.9.0
```

**3. Execute Rollback**:
```bash
# Revert to previous version
git checkout v0.9.0

# Rebuild and redeploy
pnpm install
pnpm run build

# Deploy to production
# (Using your deployment tool)
```

**4. Database Rollback** (if needed):
```bash
# Restore from backup if migrations were rolled back
psql $DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql
```

**5. Verify Rollback**:
- [ ] Admin portal loads correctly
- [ ] No errors in logs
- [ ] Metrics return to normal
- [ ] All critical features work

**6. Post-Rollback**:
- [ ] Create incident report
- [ ] Identify root cause
- [ ] Plan fix and testing
- [ ] Schedule re-deployment

---

## Troubleshooting Deployment Issues

### Issue: Database Migration Fails
**Solution**:
1. Check migration SQL for syntax errors
2. Verify database user has required permissions
3. Check available disk space
4. Rollback and retry after fixing

### Issue: High Memory Usage
**Solution**:
1. Check for memory leaks in application
2. Reduce Node.js heap size if needed
3. Optimize database queries
4. Implement data pagination

### Issue: API Timeouts
**Solution**:
1. Check for slow database queries
2. Increase database connection pool size
3. Add caching for frequently accessed data
4. Optimize API endpoints

### Issue: Session Errors
**Solution**:
1. Verify Redis is running and accessible
2. Check session configuration
3. Clear stale session data
4. Verify session timeout

---

## Deployment Checklist Template

```markdown
# Deployment Log - [Date]

## Pre-Deployment
- [ ] Code review completed
- [ ] Tests passed
- [ ] Database backup created
- [ ] Notification sent to team

## Deployment
- [ ] Staging deployment successful
- [ ] Staging validation passed
- [ ] Production deployment started
- [ ] Production deployment completed

## Post-Deployment
- [ ] Smoke tests passed
- [ ] Performance metrics normal
- [ ] Error rate normal
- [ ] No critical issues

## Sign-Off
Deployed By: ______________
Date & Time: ______________
Status: ✓ Success / ✗ Failed
```

---

## Support & Rollback Contact

**Deployment Lead**: __________________
**On-Call Engineer**: __________________
**Emergency Contact**: __________________
**Rollback Hotline**: __________________

---

**Last Updated**: 2024
**Maintained By**: Admin Portal Team
**Review Frequency**: Quarterly
