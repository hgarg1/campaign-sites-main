-- AlterTable
ALTER TABLE "organization_members" ADD COLUMN     "customRoleId" TEXT;

-- CreateTable
CREATE TABLE "org_custom_roles" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "permissions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_custom_roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "org_custom_roles_organizationId_name_key" ON "org_custom_roles"("organizationId", "name");

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_customRoleId_fkey" FOREIGN KEY ("customRoleId") REFERENCES "org_custom_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_custom_roles" ADD CONSTRAINT "org_custom_roles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
