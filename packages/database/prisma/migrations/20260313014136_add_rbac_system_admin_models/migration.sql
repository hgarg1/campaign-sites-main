-- CreateTable
CREATE TABLE "system_admin_roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_admin_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_admin_permissions" (
    "id" TEXT NOT NULL,
    "claim" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "operationType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_admin_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_admin_role_permissions" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_admin_role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_admins" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_admin_role_assignments" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_admin_role_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_admin_delegations" (
    "id" TEXT NOT NULL,
    "delegatingAdminId" TEXT NOT NULL,
    "delegatedToAdminId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_admin_delegations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_admin_ancestry" (
    "ancestorId" TEXT NOT NULL,
    "descendantId" TEXT NOT NULL,
    "depth" INTEGER NOT NULL,

    CONSTRAINT "system_admin_ancestry_pkey" PRIMARY KEY ("ancestorId","descendantId")
);

-- CreateTable
CREATE TABLE "system_admin_permission_overrides" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_admin_permission_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_admin_audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "resourceName" TEXT,
    "changes" JSONB,
    "performedBy" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "justification" TEXT,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "system_admin_roles_name_key" ON "system_admin_roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "system_admin_permissions_claim_key" ON "system_admin_permissions"("claim");

-- CreateIndex
CREATE INDEX "system_admin_permissions_category_action_idx" ON "system_admin_permissions"("category", "action");

-- CreateIndex
CREATE UNIQUE INDEX "system_admin_role_permissions_roleId_permissionId_key" ON "system_admin_role_permissions"("roleId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "system_admins_userId_key" ON "system_admins"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "system_admins_email_key" ON "system_admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "system_admin_role_assignments_adminId_roleId_key" ON "system_admin_role_assignments"("adminId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "system_admin_delegations_delegatingAdminId_delegatedToAdmin_key" ON "system_admin_delegations"("delegatingAdminId", "delegatedToAdminId");

-- CreateIndex
CREATE UNIQUE INDEX "system_admin_permission_overrides_adminId_permissionId_key" ON "system_admin_permission_overrides"("adminId", "permissionId");

-- CreateIndex
CREATE INDEX "system_admin_audit_logs_performedBy_performedAt_idx" ON "system_admin_audit_logs"("performedBy", "performedAt");

-- CreateIndex
CREATE INDEX "system_admin_audit_logs_action_resourceType_idx" ON "system_admin_audit_logs"("action", "resourceType");

-- AddForeignKey
ALTER TABLE "system_admin_role_permissions" ADD CONSTRAINT "system_admin_role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "system_admin_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_admin_role_permissions" ADD CONSTRAINT "system_admin_role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "system_admin_permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_admin_role_assignments" ADD CONSTRAINT "system_admin_role_assignments_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "system_admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_admin_role_assignments" ADD CONSTRAINT "system_admin_role_assignments_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "system_admin_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_admin_delegations" ADD CONSTRAINT "system_admin_delegations_delegatingAdminId_fkey" FOREIGN KEY ("delegatingAdminId") REFERENCES "system_admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_admin_delegations" ADD CONSTRAINT "system_admin_delegations_delegatedToAdminId_fkey" FOREIGN KEY ("delegatedToAdminId") REFERENCES "system_admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_admin_permission_overrides" ADD CONSTRAINT "system_admin_permission_overrides_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "system_admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_admin_permission_overrides" ADD CONSTRAINT "system_admin_permission_overrides_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "system_admin_permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
