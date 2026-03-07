-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'GLOBAL_ADMIN');

-- CreateEnum
CREATE TYPE "PartyAffiliation" AS ENUM ('REPUBLICAN', 'DEMOCRAT', 'LIBERTARIAN', 'GREEN', 'INDEPENDENT', 'NONPARTISAN', 'OTHER');

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "WebsiteStatus" AS ENUM ('DRAFT', 'BUILDING', 'AUDITING', 'DEPLOYING', 'PUBLISHED', 'FAILED');

-- CreateEnum
CREATE TYPE "BuildStage" AS ENUM ('BUILDER', 'AUDITOR_1', 'CICD_BUILDER', 'AUDITOR_2', 'DEPLOYMENT');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "IntegrationType" AS ENUM ('FUNDRAISING', 'CRM', 'EMAIL', 'ANALYTICS');

-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('INFO', 'WARN', 'ERROR');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "whiteLabel" BOOLEAN NOT NULL DEFAULT false,
    "customDomain" TEXT,
    "branding" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "parentId" TEXT,
    "partyAffiliation" "PartyAffiliation",
    "ownStatus" "OrganizationStatus" NOT NULL DEFAULT 'ACTIVE',
    "canCreateChildren" BOOLEAN NOT NULL DEFAULT false,
    "maxChildDepth" INTEGER,
    "setupCompletedAt" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "suspendedByOrgId" TEXT,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_ancestry" (
    "ancestorId" TEXT NOT NULL,
    "descendantId" TEXT NOT NULL,
    "depth" INTEGER NOT NULL,

    CONSTRAINT "organization_ancestry_pkey" PRIMARY KEY ("ancestorId","descendantId")
);

-- CreateTable
CREATE TABLE "master_tenant_mappings" (
    "id" TEXT NOT NULL,
    "partyAffiliation" "PartyAffiliation" NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "master_tenant_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_members" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'MEMBER',

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "websites" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "domain" TEXT,
    "templateId" TEXT,
    "status" "WebsiteStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "websites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "thumbnail" TEXT,
    "category" TEXT NOT NULL,
    "tags" TEXT[],
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "sourceCode" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "build_jobs" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "stage" "BuildStage" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "input" JSONB,
    "output" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "build_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "llm_logs" (
    "id" TEXT NOT NULL,
    "buildJobId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "tokenCount" INTEGER,
    "latency" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "llm_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integrations" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "type" "IntegrationType" NOT NULL,
    "provider" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pages" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "seo" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_posts" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "coverImage" TEXT,
    "tags" TEXT[],
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_openings" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "responsibilities" TEXT[],
    "qualifications" TEXT[],
    "salary" TEXT,
    "applyUrl" TEXT NOT NULL,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_openings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_applications" (
    "id" TEXT NOT NULL,
    "jobOpeningId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "location" TEXT,
    "linkedInUrl" TEXT,
    "portfolioUrl" TEXT,
    "yearsExperience" INTEGER,
    "currentCompany" TEXT,
    "currentTitle" TEXT,
    "expectedSalary" TEXT,
    "startDate" TEXT,
    "workAuthorization" TEXT,
    "coverLetter" TEXT,
    "additionalInfo" TEXT,
    "resumeFileName" TEXT NOT NULL,
    "resumeFilePath" TEXT NOT NULL,
    "resumeMimeType" TEXT NOT NULL,
    "cvFileName" TEXT NOT NULL,
    "cvFilePath" TEXT NOT NULL,
    "cvMimeType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_subscribers" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_subscribers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "get_started_intakes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "campaignName" TEXT NOT NULL,
    "officeSought" TEXT NOT NULL,
    "electionDate" TEXT,
    "timeline" TEXT NOT NULL,
    "teamSize" TEXT NOT NULL,
    "budgetRange" TEXT NOT NULL,
    "donationPlatform" TEXT,
    "crmPlatform" TEXT,
    "emailPlatform" TEXT,
    "goals" TEXT[],
    "privacyContact" TEXT,
    "incidentContact" TEXT,
    "dataResidency" TEXT,
    "teamInvites" TEXT[],
    "notes" TEXT,
    "brandLogoFileName" TEXT,
    "brandLogoFilePath" TEXT,
    "brandLogoMimeType" TEXT,
    "campaignBriefFileName" TEXT NOT NULL,
    "campaignBriefFilePath" TEXT NOT NULL,
    "campaignBriefMimeType" TEXT NOT NULL,
    "complianceFileName" TEXT,
    "complianceFilePath" TEXT,
    "complianceMimeType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "get_started_intakes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "server_logs" (
    "id" TEXT NOT NULL,
    "level" "LogLevel" NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "source" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "server_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "organization_ancestry_descendantId_idx" ON "organization_ancestry"("descendantId");

-- CreateIndex
CREATE INDEX "organization_ancestry_ancestorId_idx" ON "organization_ancestry"("ancestorId");

-- CreateIndex
CREATE UNIQUE INDEX "master_tenant_mappings_partyAffiliation_key" ON "master_tenant_mappings"("partyAffiliation");

-- CreateIndex
CREATE UNIQUE INDEX "master_tenant_mappings_organizationId_key" ON "master_tenant_mappings"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "organization_members_organizationId_userId_key" ON "organization_members"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "websites_slug_key" ON "websites"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "pages_websiteId_path_key" ON "pages"("websiteId", "path");

-- CreateIndex
CREATE UNIQUE INDEX "blog_posts_slug_key" ON "blog_posts"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "job_openings_slug_key" ON "job_openings"("slug");

-- CreateIndex
CREATE INDEX "job_applications_jobOpeningId_idx" ON "job_applications"("jobOpeningId");

-- CreateIndex
CREATE INDEX "job_applications_email_idx" ON "job_applications"("email");

-- CreateIndex
CREATE UNIQUE INDEX "blog_subscribers_email_key" ON "blog_subscribers"("email");

-- CreateIndex
CREATE INDEX "get_started_intakes_userId_idx" ON "get_started_intakes"("userId");

-- CreateIndex
CREATE INDEX "get_started_intakes_organizationId_idx" ON "get_started_intakes"("organizationId");

-- CreateIndex
CREATE INDEX "get_started_intakes_campaignName_idx" ON "get_started_intakes"("campaignName");

-- CreateIndex
CREATE INDEX "server_logs_level_idx" ON "server_logs"("level");

-- CreateIndex
CREATE INDEX "server_logs_source_idx" ON "server_logs"("source");

-- CreateIndex
CREATE INDEX "server_logs_createdAt_idx" ON "server_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_ancestry" ADD CONSTRAINT "organization_ancestry_ancestorId_fkey" FOREIGN KEY ("ancestorId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_ancestry" ADD CONSTRAINT "organization_ancestry_descendantId_fkey" FOREIGN KEY ("descendantId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_tenant_mappings" ADD CONSTRAINT "master_tenant_mappings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "websites" ADD CONSTRAINT "websites_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "websites" ADD CONSTRAINT "websites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "websites" ADD CONSTRAINT "websites_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "build_jobs" ADD CONSTRAINT "build_jobs_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "llm_logs" ADD CONSTRAINT "llm_logs_buildJobId_fkey" FOREIGN KEY ("buildJobId") REFERENCES "build_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pages" ADD CONSTRAINT "pages_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_jobOpeningId_fkey" FOREIGN KEY ("jobOpeningId") REFERENCES "job_openings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "get_started_intakes" ADD CONSTRAINT "get_started_intakes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "get_started_intakes" ADD CONSTRAINT "get_started_intakes_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
