# Admin Portal Documentation

## Table of Contents
1. [Setup & Installation](#setup--installation)
2. [Architecture Overview](#architecture-overview)
3. [Feature Documentation](#feature-documentation)
4. [API Reference](#api-reference)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)

---

## Setup & Installation

### Prerequisites
- Node.js 18+ and npm/pnpm
- PostgreSQL database
- Redis for sessions
- Environment variables configured

### Installation Steps

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Configure environment variables**
   Create `.env.local` in `apps/web/`:
   ```env
   # Database
   DATABASE_URL=postgresql://user:password@localhost:5432/campaign_sites

   # Redis
   REDIS_URL=redis://localhost:6379

   # API
   NEXT_PUBLIC_API_URL=http://localhost:3000
   API_SECRET_KEY=your-secret-key

   # Auth
   JWT_SECRET=your-jwt-secret
   SESSION_TIMEOUT=1800  # 30 minutes

   # Admin Portal
   ADMIN_PORTAL_ENABLED=true
   ADMIN_ROLE_REQUIRED=GLOBAL_ADMIN
   ```

3. **Set up database**
   ```bash
   pnpm run db:migrate
   pnpm run db:seed
   ```

4. **Start development server**
   ```bash
   pnpm run dev
   ```

5. **Access admin portal**
   Navigate to `http://localhost:3000/admin/portal/dashboard`

---

## Architecture Overview

### Technology Stack
- **Frontend**: Next.js 14, React 18, TypeScript
- **UI Components**: Custom React components, Tailwind CSS
- **State Management**: React Context + Hooks
- **Authentication**: Session-based with JWT tokens
- **Database**: PostgreSQL with Prisma ORM
- **Caching**: Redis for performance
- **Testing**: Jest + React Testing Library (unit), Cypress (E2E)

### Directory Structure
```
apps/web/
├── src/
│   ├── app/
│   │   ├── admin/
│   │   │   └── portal/
│   │   │       ├── dashboard/          # Dashboard page & components
│   │   │       ├── users/              # User management
│   │   │       ├── organizations/      # Organization management
│   │   │       ├── monitoring/         # System monitoring
│   │   │       ├── analytics/          # Analytics dashboards
│   │   │       ├── logs/               # Log viewer & audit trail
│   │   │       └── settings/           # Admin settings
│   │   ├── api/
│   │   │   └── admin/                  # Admin API endpoints
│   │   └── layout.tsx                  # Root layout
│   ├── components/                     # Reusable UI components
│   ├── lib/                            # Utilities & helpers
│   └── instrumentation.ts              # App monitoring setup
```

### Key Modules

#### Performance Monitoring (`lib/performance-monitor.ts`)
- Tracks page load, API response, component render times
- Configurable thresholds for alerting
- React hook integration for easy adoption

#### Security Audit (`lib/security-audit.ts`)
- Validates HTTPS enforcement, secure cookies, CSP headers
- Checks for XSS, CORS, authentication, session management
- Provides security score and severity reporting

---

## Feature Documentation

### 1. Dashboard
**Location**: `/admin/portal/dashboard`

**Features**:
- Real-time metrics display (users, organizations, websites, builds)
- Growth indicators with trend comparison
- System health status
- Recent activity feed

**Component Structure**:
- `StatsCard`: Displays metric with change indicator
- `MetricsGrid`: 2x2 grid of key metrics
- `ActivityFeed`: Scrollable list of recent events
- `SystemHealth`: Status indicators for system components

**Usage Example**:
```typescript
import Dashboard from '@/app/admin/portal/dashboard/page';

// Dashboard automatically loads data on mount
// Uses useEffect to fetch metrics from /api/admin/metrics
```

### 2. User Management
**Location**: `/admin/portal/users`

**Features**:
- List all users with pagination
- Search and filter by name, email, role, status
- Create new users
- Edit user properties (name, email, role)
- Suspend/unsuspend users
- View user activity and login history
- Export user list to CSV

**Key Components**:
- `UserList`: Paginated table of users
- `UserForm`: Form for creating/editing users
- `UserFilterBar`: Advanced filtering controls
- `SuspendModal`: Confirmation dialog for suspension

**API Endpoints**:
- `GET /api/admin/users` - List users with pagination
- `POST /api/admin/users` - Create user
- `GET /api/admin/users/:id` - Get user details
- `PUT /api/admin/users/:id` - Update user
- `PUT /api/admin/users/:id/suspend` - Suspend user
- `DELETE /api/admin/users/:id` - Delete user

### 3. Organization Management
**Location**: `/admin/portal/organizations`

**Features**:
- List all organizations
- Create organizations with name and settings
- Edit organization information
- Manage organization members
- View organization websites and statistics
- Assign websites to organizations

**Key Components**:
- `OrganizationList`: Table of organizations
- `OrganizationForm`: Create/edit form
- `MemberManager`: Add/remove organization members

**API Endpoints**:
- `GET /api/admin/organizations` - List organizations
- `POST /api/admin/organizations` - Create organization
- `PUT /api/admin/organizations/:id` - Update organization
- `GET /api/admin/organizations/:id/members` - List members
- `POST /api/admin/organizations/:id/members` - Add member

### 4. Monitoring
**Location**: `/admin/portal/monitoring`

**Features**:
- Real-time system health status
- Server uptime and availability tracking
- Database connection health
- Redis cache status
- API endpoint health checks
- Performance metrics over time
- Alert configuration

**Key Components**:
- `HealthStatus`: Current status indicators
- `UptimeChart`: Uptime trend visualization
- `PerformanceMetrics`: API/DB response time graphs
- `AlertConfig`: Alert configuration panel

### 5. Analytics
**Location**: `/admin/portal/analytics`

**Features**:
- User growth metrics
- Website engagement statistics
- Campaign performance data
- Conversion metrics
- Custom date range selection
- Data export to CSV/JSON
- Report generation and scheduling

**Key Components**:
- `MetricsCard`: Individual metric with sparkline
- `TrendChart`: Line chart with date range picker
- `ReportBuilder`: Create custom reports
- `ExportButton`: Export data in multiple formats

### 6. Logs
**Location**: `/admin/portal/logs`

**Features**:
- Application error logs with filtering
- Audit trail of admin actions
- Log level filtering (DEBUG, INFO, WARN, ERROR)
- Search logs by message content
- Date range filtering
- Real-time log streaming
- Log export and archival

**Key Components**:
- `LogViewer`: Searchable log list
- `LogFilter`: Advanced filtering controls
- `LogDetail`: Detailed log information modal
- `AuditTrail`: Admin action history table

### 7. Settings
**Location**: `/admin/portal/settings`

**Features**:
- Global system settings management
- Session timeout configuration
- Email notification settings
- API key management
- Security policy configuration
- User role and permission management
- System integrations

**Key Components**:
- `SettingsPanel`: Individual setting control
- `APIKeyManager`: Generate and revoke API keys
- `PermissionMatrix`: Role-based permission matrix

---

## API Reference

### Authentication Headers
All requests require authentication:
```typescript
headers: {
  'Authorization': 'Bearer <session-token>',
  'Content-Type': 'application/json'
}
```

### User Endpoints

#### List Users
```typescript
GET /api/admin/users?limit=50&offset=0&sort=created_at&order=desc

Response:
{
  "users": [ /* user objects */ ],
  "total": 1234,
  "limit": 50,
  "offset": 0
}
```

#### Create User
```typescript
POST /api/admin/users
{
  "email": "user@example.com",
  "name": "John Doe",
  "role": "EDITOR"
}

Response: { user object with id, created_at, etc. }
```

### Analytics Endpoints

#### Get User Analytics
```typescript
GET /api/admin/analytics/users?startDate=2024-01-01&endDate=2024-12-31

Response:
{
  "metrics": {
    "totalUsers": 1234,
    "activeUsers": 856,
    "newUsers": 45,
    "churnRate": 2.1,
    "trend": [ /* daily data */ ]
  }
}
```

---

## Best Practices

### 1. Performance Optimization
- Use `usePerformanceTracking` hook in heavy components
- Implement pagination for large data lists (limit: 50-100)
- Use React.memo for pure components
- Lazy load heavy features and routes
- Implement virtual scrolling for large tables

### 2. Security
- Always validate input on both client and server
- Never log sensitive data (passwords, tokens, PII)
- Use HTTPS only in production
- Implement CSRF protection on forms
- Validate API keys on every request
- Use secure, HttpOnly, SameSite cookies

### 3. Error Handling
- Show user-friendly error messages
- Log detailed errors server-side
- Implement retry logic with exponential backoff
- Use error boundaries for React components
- Monitor and alert on error spikes

### 4. Testing
- Write unit tests for business logic
- Test API endpoints with integration tests
- Run E2E tests for critical user journeys
- Aim for 70%+ code coverage
- Test error scenarios and edge cases

### 5. Code Quality
- Use TypeScript for type safety
- Follow ESLint and Prettier formatting
- Keep components small and focused
- Extract reusable logic to custom hooks
- Document complex functions with JSDoc

---

## Troubleshooting

### Common Issues

#### 1. Admin Portal Not Loading
**Problem**: 403 Forbidden when accessing `/admin/portal`
**Solution**: 
- Verify user has GLOBAL_ADMIN or required role
- Check `ADMIN_ROLE_REQUIRED` environment variable
- Verify authentication token is valid
- Check session expiration (default: 30 minutes)

#### 2. Slow Dashboard Load
**Problem**: Dashboard takes > 2 seconds to load
**Solution**:
- Check database query performance
- Verify Redis cache is working
- Check API response times in network tab
- Implement pagination for data-heavy tables
- Consider caching analytics data

#### 3. API Errors 500
**Problem**: `Internal Server Error` responses
**Solution**:
- Check server logs in `/admin/portal/logs`
- Verify database connection
- Check Redis connection
- Review recent code changes
- Check for database migration issues

#### 4. Security Audit Failing
**Problem**: Security checks showing failures
**Solution**:
- Use HTTPS in production
- Set secure cookies with Secure/HttpOnly flags
- Add CSP headers to Next.js config
- Review XSS protection implementation
- Check CORS configuration

### Debug Mode
Enable debug logging:
```env
DEBUG=admin-portal:*
LOG_LEVEL=DEBUG
```

### Performance Analysis
Run performance audit:
```typescript
import { performanceMonitor } from '@/lib/performance-monitor';

// View metrics
const summary = performanceMonitor.getSummary();
console.log(summary);

// Print report
performanceMonitor.printSummary();
```

Run security audit:
```typescript
import { securityAudit } from '@/lib/security-audit';

// Run all checks
const results = securityAudit.runAllChecks();
securityAudit.printReport();
```

---

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [Prisma ORM Docs](https://www.prisma.io/docs)
- [Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro)

---

**Last Updated**: 2024
**Maintained By**: Admin Portal Team
**Support**: admin-support@example.com
