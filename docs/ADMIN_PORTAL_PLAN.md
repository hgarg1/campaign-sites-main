# System Admin Portal - Comprehensive Plan

## Overview

The Admin Portal is a comprehensive system administration and monitoring interface for CampaignSites. It provides global administrators with visibility, control, and analytics over all system operations, users, organizations, and infrastructure health.

**Portal Location**: `/admin/portal`  
**Access Level**: Global Admin only (based on `GLOBAL_ADMIN` user role)  
**Tech Stack**: Next.js 14, TypeScript, React, Tailwind CSS, Framer Motion

---

## 1. Portal Architecture

### 1.1 Authentication & Access Control

```
┌─────────────────────┐
│   Login Request     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────┐
│ Check User Role (GLOBAL_ADMIN)  │
└──────────┬────────────┬─────────┘
           │            │
      PASS │            │ FAIL
           ▼            ▼
      ✓ Access    ✗ Redirect to /login
```

**Implementation**:
- Middleware to verify `GLOBAL_ADMIN` role before accessing `/admin/*` routes
- Session validation via JWT or session cookies
- Rate limiting on login attempts
- Optional: Two-factor authentication (2FA) for admin accounts

### 1.2 Layout Structure

```
┌─────────────────────────────────────────────────────┐
│           Top Navigation Bar                        │
│  Logo  |  Breadcrumb  |  Search  |  User Menu      │
└─────────────────────────────────────────────────────┘
┌──────────────────┬──────────────────────────────────┐
│                  │                                  │
│   Left Sidebar   │      Main Content Area          │
│   Navigation     │                                  │
│                  │                                  │
│   - Dashboard    │                                  │
│   - Users        │                                  │
│   - Orgs         │      Dynamic Content             │
│   - Websites     │      Based on Selection          │
│   - System       │                                  │
│   - Analytics    │                                  │
│   - Settings     │                                  │
│   - Logs         │                                  │
│                  │                                  │
└──────────────────┴──────────────────────────────────┘
```

---

## 2. Core Modules & Pages

### 2.1 Dashboard (Overview)

**Route**: `/admin/portal`

**Features**:
- **Key Metrics Cards** (Real-time):
  - Total active users
  - Active organizations
  - Websites published (this month)
  - System health status
  - LLM API costs (daily/weekly/monthly)
  - Build jobs completed
  - Failed jobs count
  - API uptime percentage

- **System Health Indicators**:
  - Database connection status
  - Redis cache status
  - API response time
  - Worker queue length
  - Disk space usage
  - Memory usage
  - CPU usage

- **Activity Feed**:
  - Recent user registrations
  - Organization creations
  - Website publications
  - System alerts/errors
  - Integration updates
  - Timestamps and user details

- **Charts & Graphs**:
  - Daily active users (7-day trend)
  - Website creation rate (30-day)
  - Build success/failure rate
  - LLM costs over time
  - System health timeline

**Components**:
- `DashboardMetricsGrid`
- `SystemHealthStatus`
- `ActivityFeed`
- `TrendChart`
- `AlertsPanel`

**API Endpoints Needed**:
- `GET /api/admin/dashboard/metrics`
- `GET /api/admin/dashboard/health`
- `GET /api/admin/dashboard/activity-feed`
- `GET /api/admin/dashboard/trends`

---

### 2.2 Users Management

**Route**: `/admin/portal/users`

**Features**:

#### 2.2.1 Users List
- **Searchable Table** with columns:
  - Email
  - Name
  - Role (USER, ADMIN, GLOBAL_ADMIN)
  - Primary Organization
  - Websites Created
  - Status (Active, Suspended, Deleted)
  - Created Date
  - Last Login
  - Actions (View, Edit, Suspend, Delete)

- **Filters & Search**:
  - Filter by role
  - Filter by status
  - Filter by creation date range
  - Search by email/name
  - Organizations filter

- **Bulk Actions**:
  - Suspend multiple users
  - Change role for multiple users
  - Export user list (CSV)

- **Pagination**: 20/50/100 items per page

**Components**:
- `UsersTable`
- `UserFilters`
- `UserSearchBar`
- `BulkActionsToolbar`
- `UserPagination`

#### 2.2.2 User Detail View
**Route**: `/admin/portal/users/[id]`

- **User Profile Section**:
  - Email, name, avatar
  - Role and status
  - Organizations (with role in each)
  - Creation date, last login, last action

- **Activity Timeline**:
  - Login history (last 30 days)
  - Websites created
  - API calls made
  - File uploads

- **Permissions & Roles**:
  - Current role
  - Organizations and roles
  - Permissions breakdown

- **Actions**:
  - Change role
  - Add to organization
  - Reset password (send reset link)
  - Force logout
  - Suspend/Unsuspend account
  - Delete account (with confirmation)
  - Impersonate user (optional, for debugging)

- **API Usage**:
  - Monthly API calls count
  - LLM API calls
  - Storage usage
  - Submission history

**Components**:
- `UserProfile`
- `ActivityTimeline`
- `PermissionsManager`
- `ActionsPanel`
- `ApiUsageStats`

**API Endpoints Needed**:
- `GET /api/admin/users` (list)
- `GET /api/admin/users/[id]` (detail)
- `PATCH /api/admin/users/[id]` (update role, status)
- `POST /api/admin/users/[id]/reset-password`
- `POST /api/admin/users/[id]/suspend`
- `POST /api/admin/users/[id]/unsuspend`
- `DELETE /api/admin/users/[id]`
- `POST /api/admin/users/[id]/impersonate`
- `GET /api/admin/users/[id]/activity`
- `GET /api/admin/users/[id]/api-usage`

---

### 2.3 Organizations Management

**Route**: `/admin/portal/organizations`

**Features**:

#### 2.3.1 Organizations List
- **Table Columns**:
  - Organization name
  - Slug
  - Member count
  - Websites count
  - Status (Active, Suspended)
  - White-label status
  - Created date
  - Owner
  - Actions

- **Filters**:
  - Filter by white-label status
  - Filter by status
  - Filter by creation date
  - Search by name/slug

#### 2.3.2 Organization Detail View
**Route**: `/admin/portal/organizations/[id]`

- **Organization Profile**:
  - Name, slug, custom domain
  - Logo and branding colors
  - White-label settings
  - Creation date, member count

- **Members List**:
  - Table of organization members
  - Role in organization
  - Email, name
  - Actions: Change role, remove member

- **Websites**:
  - List of websites created
  - Status, publishing date
  - Actions: View, manage

- **Settings**:
  - Enable/disable organization
  - White-label toggle
  - Custom domain setup
  - Branding configuration

- **Integrations**:
  - Connected integrations per website
  - Integration status
  - Last sync date

- **Usage & Billing**:
  - Monthly website builds
  - API calls used
  - Storage usage
  - LLM costs attribution

**Components**:
- `OrganizationProfile`
- `MembersTable`
- `WebsitesTable`
- `IntegrationsSection`
- `OrganizationSettings`

**API Endpoints Needed**:
- `GET /api/admin/organizations` (list)
- `GET /api/admin/organizations/[id]` (detail)
- `PATCH /api/admin/organizations/[id]` (update)
- `GET /api/admin/organizations/[id]/members`
- `PATCH /api/admin/organizations/[id]/members/[memberId]`
- `DELETE /api/admin/organizations/[id]/members/[memberId]`
- `GET /api/admin/organizations/[id]/websites`
- `GET /api/admin/organizations/[id]/usage`

---

### 2.4 Websites Management

**Route**: `/admin/portal/websites`

**Features**:

#### 2.4.1 Websites List
- **Table Columns**:
  - Website name
  - Domain/slug
  - Status (Draft, Building, Published, Failed)
  - Organization
  - Owner
  - Build progress (%)
  - Published date
  - Last modified
  - Actions

- **Filters**:
  - Filter by status
  - Filter by organization
  - Filter by date range
  - Search by name/domain

- **Bulk Actions**:
  - Trigger rebuild
  - Export websites list

#### 2.4.2 Website Detail View
**Route**: `/admin/portal/websites/[id]`

- **Website Overview**:
  - Name, domain, organization
  - Current status with progress
  - Owner information
  - Created/published dates

- **Build Jobs History**:
  - List of all build jobs
  - Stage (Builder, Auditor1, CICD, Auditor2, Deployment)
  - Status, duration
  - LLM provider used
  - Token count and cost
  - Error messages if failed

- **LLM Execution Details**:
  - Providers used (OpenAI, Anthropic, Google)
  - Consensus results
  - Token usage breakdown
  - Cost breakdown
  - Latency per stage

- **Pages & Content**:
  - List of pages
  - SEO metadata
  - Last modified
  - Preview link

- **Integrations**:
  - Connected integrations
  - Connection status
  - Last sync

- **Actions**:
  - Trigger rebuild
  - Force audit
  - Publish manually
  - View logs
  - Roll back to previous version
  - Delete website

**Components**:
- `WebsiteOverview`
- `BuildJobsTimeline`
- `LLMExecutionDetails`
- `PagesTable`
- `IntegrationsStatus`

**API Endpoints Needed**:
- `GET /api/admin/websites` (list)
- `GET /api/admin/websites/[id]` (detail)
- `GET /api/admin/websites/[id]/build-jobs`
- `GET /api/admin/websites/[id]/llm-logs`
- `GET /api/admin/websites/[id]/pages`
- `POST /api/admin/websites/[id]/rebuild`
- `DELETE /api/admin/websites/[id]`

---

### 2.5 Build Jobs & LLM Pipeline

**Route**: `/admin/portal/jobs`

**Features**:

#### 2.5.1 Jobs Queue Monitor
- **Real-time Queue Status**:
  - Pending jobs count
  - In-progress jobs count
  - Completed today
  - Failed today
  - Average completion time

- **Active Jobs List**:
  - Job ID
  - Website name
  - Current stage
  - Progress %
  - Started at
  - Estimated completion
  - Actions: Pause, cancel, view logs

- **Queue Health**:
  - Average queue wait time
  - Job success rate
  - Failure rate by stage
  - LLM provider usage distribution

**Components**:
- `JobsQueueMonitor`
- `ActiveJobsList`
- `QueueHealthMetrics`

#### 2.5.2 LLM Providers & Costs
- **Provider Status**:
  - OpenAI (GPT-4, GPT-3.5)
  - Anthropic (Claude)
  - Google (Gemini)
  - Status indicators
  - Latest error/success

- **Cost Analytics**:
  - Total spend (today/week/month/year)
  - Spend per provider
  - Spend per organization
  - Cost trends graph
  - Cost breakdown by operation type

- **Provider Fallback Strategy**:
  - Primary provider
  - Fallback order
  - Failure counts
  - Recovery time

- **Usage Limits**:
  - Daily spend limit
  - Monthly spend limit
  - Per-org spend caps
  - Current usage % of limit

**Components**:
- `ProvidersStatus`
- `CostAnalytics`
- `UsageLimitsPanel`

**API Endpoints Needed**:
- `GET /api/admin/jobs/queue-status`
- `GET /api/admin/jobs/active`
- `POST /api/admin/jobs/[jobId]/cancel`
- `GET /api/admin/llm/providers`
- `GET /api/admin/llm/costs`
- `GET /api/admin/llm/usage`
- `PATCH /api/admin/llm/providers/[provider]` (enable/disable)

---

### 2.6 System Monitoring & Alerts

**Route**: `/admin/portal/monitoring`

**Features**:

#### 2.6.1 Infrastructure Health
- **Service Status Dashboard**:
  ```
  Service               Status    Uptime   Latency   Load
  ─────────────────────────────────────────────────────
  API Server           ✓ UP     99.98%   45ms      60%
  Database (PostgreSQL) ✓ UP     100%     2ms       45%
  Redis Cache          ✓ UP     99.99%   1ms       30%
  Worker Queue         ✓ UP     99.95%   -         85%
  Auth Service         ✓ UP     100%     12ms      20%
  ```

- **Metrics Over Time**:
  - CPU usage
  - Memory usage
  - Disk I/O
  - Network I/O
  - Database connections
  - Redis memory

- **Performance Monitoring**:
  - API response times (p50, p95, p99)
  - Database query performance
  - Worker job processing time
  - LLM API latency

**Components**:
- `ServiceStatusDashboard`
- `MetricsChart`
- `PerformanceMonitor`

#### 2.6.2 Alerts & Notifications
- **Active Alerts**:
  - Alert level (Critical, Warning, Info)
  - Alert type
  - Time triggered
  - Status (New, Acknowledged, Resolved)
  - Actions: Acknowledge, resolve

- **Alert Rules**:
  - CPU > 80%
  - Memory > 85%
  - API error rate > 1%
  - Job failure rate > 5%
  - LLM cost > daily limit
  - Database slow queries
  - Redis evictions
  - Disk space < 10%

- **Alert Channels**:
  - In-app notifications
  - Email alerts
  - Slack webhook
  - PagerDuty integration

**Components**:
- `AlertsList`
- `AlertRulesManager`
- `AlertChannelsConfig`

**API Endpoints Needed**:
- `GET /api/admin/monitoring/health`
- `GET /api/admin/monitoring/metrics`
- `GET /api/admin/monitoring/alerts`
- `PATCH /api/admin/monitoring/alerts/[alertId]`
- `GET /api/admin/monitoring/alert-rules`
- `PATCH /api/admin/monitoring/alert-rules/[ruleId]`

---

### 2.7 Logs & Audit Trail

**Route**: `/admin/portal/logs`

**Features**:

#### 2.7.1 Application Logs
- **Log Viewer**:
  - Log level filter (INFO, WARN, ERROR)
  - Source filter (auth, api, database, worker, startup)
  - Time range filter
  - Search functionality
  - Real-time tail option

- **Log Details**:
  - Timestamp
  - Level
  - Service/source
  - Message
  - Stack trace (if error)
  - Request ID (for tracing)
  - User ID (if auth-related)
  - Metadata JSON

- **Export**:
  - Export logs as CSV
  - Export logs as JSON
  - Custom date range

**Components**:
- `LogViewer`
- `LogFilters`
- `LogExporter`

#### 2.7.2 Audit Trail
- **User Actions Log**:
  - User email
  - Action (create, update, delete, publish, etc.)
  - Resource type and ID
  - Changes made (before/after)
  - IP address
  - Timestamp
  - Success/failure status

- **Admin Actions Log**:
  - Admin email
  - Action (user management, settings change, etc.)
  - Resource affected
  - Timestamp
  - Permission check result

**Components**:
- `AuditTrailTable`
- `AuditFilters`

**API Endpoints Needed**:
- `GET /api/admin/logs/application`
- `GET /api/admin/logs/audit-trail`
- `POST /api/admin/logs/export`

---

### 2.8 System Settings & Configuration

**Route**: `/admin/portal/settings`

**Features**:

#### 2.8.1 Email Configuration
- **SMTP Settings**:
  - SMTP server
  - Port
  - Username/password (encrypted)
  - TLS/SSL toggle
  - Test email button

- **Email Templates**:
  - Transactional emails list
  - Edit template content
  - Preview email
  - Test send

- **Email Logs**:
  - Sent emails history
  - Status (delivered, bounced, failed)
  - Recipient, subject
  - Timestamp

**Components**:
- `SmtpSettings`
- `EmailTemplateEditor`
- `EmailLogsViewer`

#### 2.8.2 API Keys & Webhooks
- **API Keys Management**:
  - List generated keys
  - Create new key
  - Key name, permissions
  - Last used date
  - Revoke button
  - Copy to clipboard

- **Webhooks Management**:
  - List configured webhooks
  - Event types subscribed
  - Target URL
  - Signing secret
  - Delivery logs
  - Test webhook delivery

- **Rate Limiting**:
  - Global rate limit
  - Per-organization limit
  - Per-user limit
  - Whitelist IPs

**Components**:
- `ApiKeysManager`
- `WebhooksManager`
- `RateLimitSettings`

#### 2.8.3 Security Policies
- **Password Policy**:
  - Minimum length
  - Require uppercase
  - Require numbers
  - Require special chars
  - Expiration (days)
  - History (prevent reuse)

- **Session Policy**:
  - Session timeout (minutes)
  - Remember me duration
  - Concurrent sessions limit
  - Force logout on IP change

- **Authentication**:
  - 2FA requirement toggle
  - 2FA methods (TOTP, SMS, Email)
  - Trusted device duration

- **IP Whitelist/Blacklist**:
  - List of trusted IPs for admin access
  - List of blocked IPs

**Components**:
- `PasswordPolicyForm`
- `SessionPolicyForm`
- `AuthenticationSettings`
- `IpManagementList`

#### 2.8.4 Data Retention & Backup
- **Retention Policies**:
  - Deleted websites retention (days)
  - Deleted users retention (days)
  - Logs retention (days)

- **Backup Settings**:
  - Backup frequency
  - Last backup date
  - Backup size
  - Manual backup trigger
  - Restore options

- **GDPR Compliance**:
  - Right to erasure (export/delete user data)
  - Data anonymization

**Components**:
- `RetentionPoliciesForm`
- `BackupSettings`
- `GdprCompliancePanel`

#### 2.8.5 Feature Flags
- **Feature Toggle List**:
  - Feature name
  - Current status (enabled/disabled)
  - Rollout percentage
  - Target audiences
  - Toggle button
  - Last modified

**Components**:
- `FeatureFlagsManager`

**API Endpoints Needed**:
- `GET /api/admin/settings/email`
- `PATCH /api/admin/settings/email`
- `POST /api/admin/settings/email/test`
- `GET /api/admin/settings/api-keys`
- `POST /api/admin/settings/api-keys`
- `DELETE /api/admin/settings/api-keys/[keyId]`
- `GET /api/admin/settings/webhooks`
- `POST /api/admin/settings/webhooks`
- `PATCH /api/admin/settings/webhooks/[webhookId]`
- `POST /api/admin/settings/webhooks/[webhookId]/test`
- `GET /api/admin/settings/security-policies`
- `PATCH /api/admin/settings/security-policies`
- `GET /api/admin/settings/data-retention`
- `PATCH /api/admin/settings/data-retention`
- `GET /api/admin/settings/backups`
- `POST /api/admin/settings/backups/manual`
- `GET /api/admin/settings/feature-flags`
- `PATCH /api/admin/settings/feature-flags/[flagId]`

---

### 2.9 Analytics & Reports

**Route**: `/admin/portal/analytics`

**Features**:

#### 2.9.1 System Analytics
- **Growth Metrics**:
  - Users growth (30-day, YTD)
  - Organizations growth
  - Websites growth
  - Line graphs, growth rate %

- **Usage Metrics**:
  - Daily active users
  - API calls per day
  - Build jobs per day
  - Average build time
  - Success rate by stage

- **Engagement Metrics**:
  - Website republish frequency
  - Integration adoption rate
  - Feature usage

**Components**:
- `GrowthMetrics`
- `UsageAnalytics`
- `EngagementDashboard`

#### 2.9.2 Financial Analytics
- **Cost Breakdown**:
  - Total cost (day/week/month/year)
  - Cost per organization
  - Cost per user
  - Cost per website
  - LLM provider costs breakdown
  - Infrastructure costs

- **Billing**:
  - Invoices list
  - Payment history
  - Outstanding balances
  - Subscription details

**Components**:
- `CostAnalytics`
- `BillingOverview`

#### 2.9.3 Report Generation
- **Pre-built Reports**:
  - Daily summary
  - Weekly report
  - Monthly report
  - Quarterly report

- **Custom Reports**:
  - Select date range
  - Select metrics
  - Select dimensions (org, user, region)
  - Generate and export (PDF, CSV)

**Components**:
- `ReportGenerator`
- `ReportLibrary`

**API Endpoints Needed**:
- `GET /api/admin/analytics/growth`
- `GET /api/admin/analytics/usage`
- `GET /api/admin/analytics/engagement`
- `GET /api/admin/analytics/costs`
- `GET /api/admin/analytics/billing`
- `POST /api/admin/analytics/reports/generate`

---

## 3. Database Schema Additions

The following tables are already defined or need to be added to the Prisma schema:

### Already Defined:
- `User` (with `GLOBAL_ADMIN` role)
- `Organization`
- `OrganizationMember`
- `Website`
- `BuildJob`
- `LLMLog`
- `Integration`
- `ServerLog`

### New Tables Needed:

```prisma
// Admin Audit Trail
model AdminAuditLog {
  id          String   @id @default(cuid())
  adminId     String
  action      String   // create, update, delete, suspend, etc.
  resourceType String  // user, organization, website, settings
  resourceId  String?
  changes     Json?    // before/after values
  ipAddress   String?
  userAgent   String?
  status      String   // success, failure
  errorMessage String?
  createdAt   DateTime @default(now())
  
  admin       User     @relation(fields: [adminId], references: [id])
  
  @@index([adminId])
  @@index([createdAt])
  @@map("admin_audit_logs")
}

// Email Templates
model EmailTemplate {
  id          String   @id @default(cuid())
  key         String   @unique // password_reset, welcome, etc.
  name        String
  subject     String
  htmlContent String   @db.Text
  textContent String?  @db.Text
  variables   String[] // {{email}}, {{name}}, etc.
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@map("email_templates")
}

// Alert Rules
model AlertRule {
  id          String   @id @default(cuid())
  name        String
  type        String   // cpu, memory, error_rate, etc.
  condition   String   // >, <, ==, etc.
  threshold   Float
  enabled     Boolean  @default(true)
  channels    String[] // in_app, email, slack, pagerduty
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@map("alert_rules")
}

// System Settings
model SystemSetting {
  id        String   @id @default(cuid())
  key       String   @unique
  value     String   @db.Text
  type      String   // string, number, boolean, json
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@map("system_settings")
}

// LLM Provider Stats (aggregated)
model LLMProviderStats {
  id          String   @id @default(cuid())
  provider    String   // openai, anthropic, google
  date        DateTime
  requestCount Int
  tokenCount  Int
  cost        Float
  avgLatency  Int // milliseconds
  errorCount  Int
  createdAt   DateTime @default(now())
  
  @@unique([provider, date])
  @@map("llm_provider_stats")
}

// Feature Flags
model FeatureFlag {
  id            String   @id @default(cuid())
  key           String   @unique
  name          String
  enabled       Boolean  @default(false)
  rolloutPercent Int     @default(0) // 0-100
  includeOrgIds String[] // white-list orgs
  excludeOrgIds String[] // black-list orgs
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@map("feature_flags")
}
```

---

## 4. Navigation & Information Architecture

### 4.1 Sidebar Navigation Structure

```
Admin Portal
├── Dashboard
│   └── Overview & metrics
├── Users
│   ├── List
│   ├── Roles
│   └── Permissions
├── Organizations
│   ├── List
│   ├── Settings
│   └── Members
├── Websites
│   ├── List
│   ├── Status
│   └── Builds
├── Build Jobs & LLM
│   ├── Queue Monitor
│   ├── Provider Status
│   └── Cost Analytics
├── System
│   ├── Monitoring
│   ├── Alerts
│   └── Health Check
├── Logs & Audit
│   ├── App Logs
│   └── Audit Trail
├── Settings
│   ├── Email
│   ├── API Keys
│   ├── Security
│   ├── Data Retention
│   └── Feature Flags
├── Analytics
│   ├── Growth
│   ├── Usage
│   └── Reports
└── Integrations
    ├── Third-party Status
    └── Sync Logs
```

---

## 5. API Endpoints Summary

### Auth & Access
- `POST /api/admin/auth/login` - Admin login
- `POST /api/admin/auth/logout` - Admin logout
- `GET /api/admin/auth/verify` - Verify admin session
- `POST /api/admin/auth/2fa/send` - Send 2FA code
- `POST /api/admin/auth/2fa/verify` - Verify 2FA code

### Dashboard
- `GET /api/admin/dashboard/metrics` - Key metrics
- `GET /api/admin/dashboard/health` - System health
- `GET /api/admin/dashboard/activity-feed` - Recent activity
- `GET /api/admin/dashboard/trends` - Trend data

### Users (20+ endpoints)
- `GET /api/admin/users` - List users
- `GET /api/admin/users/[id]` - User detail
- `PATCH /api/admin/users/[id]` - Update user
- `POST /api/admin/users/[id]/reset-password` - Password reset
- `POST /api/admin/users/[id]/suspend` - Suspend user
- `DELETE /api/admin/users/[id]` - Delete user
- `GET /api/admin/users/[id]/activity` - User activity
- `GET /api/admin/users/[id]/api-usage` - API usage stats

### Organizations (15+ endpoints)
- `GET /api/admin/organizations` - List orgs
- `GET /api/admin/organizations/[id]` - Org detail
- `PATCH /api/admin/organizations/[id]` - Update org
- `GET /api/admin/organizations/[id]/members` - Members
- `GET /api/admin/organizations/[id]/websites` - Websites
- `GET /api/admin/organizations/[id]/usage` - Usage stats

### Websites (10+ endpoints)
- `GET /api/admin/websites` - List websites
- `GET /api/admin/websites/[id]` - Website detail
- `GET /api/admin/websites/[id]/build-jobs` - Build history
- `GET /api/admin/websites/[id]/llm-logs` - LLM logs
- `POST /api/admin/websites/[id]/rebuild` - Trigger rebuild
- `DELETE /api/admin/websites/[id]` - Delete website

### Jobs & LLM (10+ endpoints)
- `GET /api/admin/jobs/queue-status` - Queue status
- `GET /api/admin/jobs/active` - Active jobs
- `POST /api/admin/jobs/[jobId]/cancel` - Cancel job
- `GET /api/admin/llm/providers` - Provider status
- `GET /api/admin/llm/costs` - Cost analytics
- `GET /api/admin/llm/usage` - Usage stats

### Monitoring (8+ endpoints)
- `GET /api/admin/monitoring/health` - Health check
- `GET /api/admin/monitoring/metrics` - Metrics
- `GET /api/admin/monitoring/alerts` - Active alerts
- `PATCH /api/admin/monitoring/alerts/[id]` - Update alert
- `GET /api/admin/monitoring/alert-rules` - Alert rules

### Settings (15+ endpoints)
- Email configuration
- API keys management
- Webhooks management
- Security policies
- Data retention
- Backup management
- Feature flags

### Analytics (5+ endpoints)
- `GET /api/admin/analytics/growth` - Growth metrics
- `GET /api/admin/analytics/usage` - Usage metrics
- `GET /api/admin/analytics/costs` - Cost analytics
- `POST /api/admin/analytics/reports/generate` - Generate report

### Logs & Audit (5+ endpoints)
- `GET /api/admin/logs/application` - App logs
- `GET /api/admin/logs/audit-trail` - Audit trail
- `POST /api/admin/logs/export` - Export logs

---

## 6. Frontend Components Structure

### Component Hierarchy

```
/components/admin/
├── shared/
│   ├── AdminLayout.tsx        # Main wrapper
│   ├── AdminNavigation.tsx    # Sidebar nav
│   ├── TopBar.tsx             # Top navigation
│   ├── UserMenu.tsx           # User dropdown
│   ├── Breadcrumbs.tsx        # Page breadcrumbs
│   ├── SearchBar.tsx          # Global search
│   ├── MetricCard.tsx         # Reusable metric card
│   ├── DataTable.tsx          # Reusable table
│   ├── FilterBar.tsx          # Reusable filters
│   ├── Chart.tsx              # Reusable chart
│   └── AlertBanner.tsx        # Alert display
├── dashboard/
│   ├── DashboardPage.tsx
│   ├── MetricsGrid.tsx
│   ├── HealthStatus.tsx
│   ├── ActivityFeed.tsx
│   └── TrendChart.tsx
├── users/
│   ├── UsersList.tsx
│   ├── UsersTable.tsx
│   ├── UserDetail.tsx
│   ├── UserProfile.tsx
│   ├── UserActivityTimeline.tsx
│   ├── PermissionsManager.tsx
│   └── UserActionsPanel.tsx
├── organizations/
│   ├── OrganizationsList.tsx
│   ├── OrganizationsTable.tsx
│   ├── OrganizationDetail.tsx
│   ├── MembersManager.tsx
│   └── OrganizationSettings.tsx
├── websites/
│   ├── WebsitesList.tsx
│   ├── WebsitesTable.tsx
│   ├── WebsiteDetail.tsx
│   ├── BuildJobsTimeline.tsx
│   ├── LLMExecutionDetails.tsx
│   └── WebsiteActions.tsx
├── jobs/
│   ├── JobsMonitor.tsx
│   ├── QueueStatus.tsx
│   ├── ActiveJobsList.tsx
│   ├── LLMProvidersStatus.tsx
│   └── CostAnalytics.tsx
├── monitoring/
│   ├── MonitoringPage.tsx
│   ├── ServiceStatus.tsx
│   ├── HealthMetrics.tsx
│   ├── AlertsList.tsx
│   └── AlertRulesManager.tsx
├── settings/
│   ├── SettingsPage.tsx
│   ├── EmailSettings.tsx
│   ├── ApiKeysManager.tsx
│   ├── WebhooksManager.tsx
│   ├── SecurityPolicies.tsx
│   ├── DataRetention.tsx
│   └── FeatureFlags.tsx
├── logs/
│   ├── LogViewer.tsx
│   ├── AuditTrail.tsx
│   ├── LogFilters.tsx
│   └── LogExporter.tsx
└── analytics/
    ├── AnalyticsPage.tsx
    ├── GrowthMetrics.tsx
    ├── UsageAnalytics.tsx
    ├── CostAnalytics.tsx
    ├── ReportGenerator.tsx
    └── BillingOverview.tsx
```

---

## 7. Implementation Phases

### Phase 1: Core Foundation (Week 1-2)
- [x] Auth middleware for GLOBAL_ADMIN
- [ ] Admin layout and navigation
- [ ] Dashboard with basic metrics
- [ ] Top bar and user menu
- [ ] Basic styling and theme

**Deliverable**: Working admin portal skeleton with navigation

### Phase 2: User Management (Week 3-4)
- [ ] Users list with table
- [ ] User detail view
- [ ] User actions (suspend, delete, role change)
- [ ] Activity timeline for users
- [ ] API endpoints for user management

**Deliverable**: Fully functional user management section

### Phase 3: Organizations & Websites (Week 5-6)
- [ ] Organizations list and detail
- [ ] Websites list and detail
- [ ] Build jobs history
- [ ] LLM execution logs viewer
- [ ] Necessary API endpoints

**Deliverable**: Full visibility into organizations and websites

### Phase 4: System Monitoring (Week 7-8)
- [ ] Health monitoring dashboard
- [ ] Real-time metrics collection
- [ ] Alert system and rules
- [ ] Service status page
- [ ] Monitoring API endpoints

**Deliverable**: Complete system monitoring capabilities

### Phase 5: Settings & Configuration (Week 9-10)
- [ ] Email configuration
- [ ] API keys and webhooks
- [ ] Security policies
- [ ] Feature flags
- [ ] Data retention settings

**Deliverable**: Full system configuration interface

### Phase 6: Analytics & Reporting (Week 11-12)
- [ ] Analytics dashboards
- [ ] Cost analytics
- [ ] Report generation
- [ ] Export functionality
- [ ] Analytics API endpoints

**Deliverable**: Comprehensive analytics and reporting

### Phase 7: Logs & Audit (Week 13)
- [ ] Application logs viewer
- [ ] Audit trail
- [ ] Log filtering and search
- [ ] Export logs

**Deliverable**: Complete logging and audit system

### Phase 8: Polish & Testing (Week 14-15)
- [ ] Performance optimization
- [ ] Security audit
- [ ] E2E testing
- [ ] Documentation
- [ ] User acceptance testing

**Deliverable**: Production-ready admin portal

---

## 8. Security Considerations

### Access Control
- Every admin endpoint requires GLOBAL_ADMIN role verification
- IP whitelisting for admin access (optional but recommended)
- Audit logging for all admin actions
- Session timeout after 30 minutes of inactivity

### Data Protection
- Sensitive data (API keys, passwords) must be encrypted
- Never log sensitive data in plaintext
- Rate limiting on login and API endpoints
- CSRF protection on all state-changing requests

### API Security
- All endpoints require authentication
- Authorization checks on resource access
- Input validation and sanitization
- SQL injection prevention (via Prisma)
- XSS prevention (React's built-in protection)

### Monitoring & Alerting
- Alert on failed login attempts
- Alert on role/permission changes
- Alert on user deletion
- Alert on system configuration changes

---

## 9. Performance Considerations

### Optimization
- Implement row-level pagination for large tables
- Cache frequently accessed data (Redis)
- Lazy load components/modals
- Virtual scrolling for large lists
- Database query optimization with indexes

### Metrics
- Page load time: < 2 seconds
- Table rendering: < 500ms
- API response time: < 200ms
- Search results: < 300ms

### Scalability
- Design for 10,000+ users
- Design for 1,000+ organizations
- Design for 100,000+ websites
- Design for real-time monitoring of 100+ concurrent jobs

---

## 10. Testing Strategy

### Unit Tests
- Component unit tests with React Testing Library
- Utility function tests
- Hook tests

### Integration Tests
- API endpoint tests
- Database interaction tests
- Authentication flow tests

### E2E Tests
- Critical user journeys
- Admin workflows (user management, settings)
- Error scenarios

### Performance Tests
- Load testing for dashboard
- Table rendering performance
- API latency tests

---

## 11. Documentation & Support

### Developer Documentation
- API endpoint documentation
- Component prop documentation
- Database schema documentation
- Setup and deployment guide

### Admin Documentation
- Admin portal user guide
- Feature walkthroughs
- Troubleshooting guide
- Best practices guide

---

## 12. Future Enhancements

1. **Advanced Analytics**:
   - Machine learning-based anomaly detection
   - Predictive cost forecasting
   - User behavior analysis

2. **Automation**:
   - Workflow automation
   - Scheduled reports
   - Auto-remediation of issues

3. **Integrations**:
   - Datadog integration
   - New Relic integration
   - PagerDuty integration
   - Slack integration

4. **Mobile Admin**:
   - Mobile-responsive admin interface
   - Native mobile app

5. **Advanced Security**:
   - Role-based access control (RBAC) per section
   - Requiring approval for destructive actions
   - Temporary elevated permissions

---

## Appendix: Database Relationships Diagram

```
User (GLOBAL_ADMIN)
├── AdminAuditLog
├── OrganizationMember
│   └── Organization
│       ├── Website
│       │   ├── BuildJob
│       │   │   └── LLMLog
│       │   ├── Integration
│       │   ├── Page
│       │   └── Template
│       └── GetStartedIntake
├── Website
├── GetStartedIntake
└── BlogPost

SystemSetting
AlertRule
EmailTemplate
FeatureFlag
LLMProviderStats
```

---

## Appendix: Rough Estimation

| Component | Complexity | Est. Time |
|-----------|-----------|-----------|
| Dashboard | Medium | 3-4 days |
| User Mgmt | High | 5-6 days |
| Org Mgmt | Medium | 3-4 days |
| Websites | Medium | 4-5 days |
| Jobs/LLM | High | 5-6 days |
| Monitoring | High | 5-6 days |
| Settings | High | 6-7 days |
| Analytics | Medium | 4-5 days |
| Logs/Audit | Medium | 3-4 days |
| Testing | High | 5-7 days |
| **Total** | | **44-54 days** |

**Total Development Time**: ~10-12 weeks (with 1-2 week buffer)

