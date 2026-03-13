import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

// Load claims from the JSON file
function loadClaims() {
  const claimsPath = path.join(__dirname, '../../../apps/web/public/system-admin-portal-claims.json');
  const claimsContent = fs.readFileSync(claimsPath, 'utf-8');
  const claimsData = JSON.parse(claimsContent);
  return claimsData;
}

// Extract flat list of all claims from the nested structure
function flattenClaims(claimsData: any) {
  const flatClaims: Array<{
    claim: string;
    description: string;
    type: string;
    category: string;
  }> = [];

  const categories = claimsData.claims.system_admin_portal.categories;
  for (const [categoryKey, categoryValue] of Object.entries(categories)) {
    const category = categoryValue as any;
    for (const claimObj of category.claims || []) {
      flatClaims.push({
        claim: claimObj.claim,
        description: claimObj.description,
        type: claimObj.type,
        category: categoryKey,
      });
    }
  }

  return flatClaims;
}

// Default role definitions
const DEFAULT_ROLES = [
  {
    name: 'Global_Admin',
    description: 'Full system administrator with all permissions',
    claims: ['system_admin_portal:*'], // Wildcard - all claims
  },
  {
    name: 'System_Auditor',
    description: 'View-only access to all audit logs and reports',
    claimPatterns: ['system_admin_portal:logs:*', 'system_admin_portal:analytics:*'],
  },
  {
    name: 'Organization_Manager',
    description: 'Manage organizations and hierarchy',
    claimPatterns: [
      'system_admin_portal:organizations:*',
      'system_admin_portal:hierarchy:*',
    ],
  },
  {
    name: 'User_Manager',
    description: 'Manage system users and their assignments',
    claimPatterns: ['system_admin_portal:users:*'],
  },
  {
    name: 'Policy_Manager',
    description: 'Manage policies and governance',
    claimPatterns: [
      'system_admin_portal:policies:*',
      'system_admin_portal:governance:*',
    ],
  },
  {
    name: 'Security_Manager',
    description: 'Manage security and monitoring settings',
    claimPatterns: [
      'system_admin_portal:security:*',
      'system_admin_portal:monitoring:*',
    ],
  },
];

async function main() {
  console.log('Starting RBAC seed...');

  // Load claims from JSON
  const claimsData = loadClaims();
  const flatClaims = flattenClaims(claimsData);

  console.log(`Found ${flatClaims.length} claims to seed`);

  // Clear existing RBAC data (order matters for FK constraints)
  await prisma.systemAdminPermissionOverride.deleteMany();
  await prisma.systemAdminAuditLog.deleteMany();
  await prisma.systemAdminRolePermission.deleteMany();
  await prisma.systemAdminRoleAssignment.deleteMany();
  await prisma.systemAdminDelegation.deleteMany();
  await prisma.systemAdminAncestry.deleteMany();
  await prisma.systemAdminPermission.deleteMany();
  await prisma.systemAdminRole.deleteMany();
  await prisma.systemAdmin.deleteMany();

  console.log('Cleared existing RBAC data');

  // Create all permissions/claims
  const createdPermissions = await Promise.all(
    flatClaims.map((claimObj) =>
      prisma.systemAdminPermission.create({
        data: {
          claim: claimObj.claim,
          description: claimObj.description,
          category: claimObj.category,
          action: claimObj.claim.split(':').pop() || '',
          operationType: claimObj.type,
        },
      })
    )
  );

  console.log(`Created ${createdPermissions.length} permissions`);

  // Create default roles and assign permissions
  for (const roleDefn of DEFAULT_ROLES) {
    const role = await prisma.systemAdminRole.create({
      data: {
        name: roleDefn.name,
        description: roleDefn.description,
        isBuiltIn: true,
      },
    });

    // Resolve which claims belong to this role
    const roleClaims = roleDefn.claims || [];
    const claimPatterns = roleDefn.claimPatterns || [];

    // Get all matching permissions
    const rolePermissions = createdPermissions.filter((perm) => {
      // Direct claim match
      if (roleClaims.includes(perm.claim)) return true;

      // Wildcard match
      if (roleClaims.includes('system_admin_portal:*')) return true;

      // Pattern match (e.g., 'system_admin_portal:organizations:*')
      for (const pattern of claimPatterns) {
        if (pattern.endsWith(':*')) {
          const prefix = pattern.slice(0, -2); // Remove the '*'
          if (perm.claim.startsWith(prefix)) return true;
        }
      }

      return false;
    });

    // Create M:M relationships
    await Promise.all(
      rolePermissions.map((perm) =>
        prisma.systemAdminRolePermission.create({
          data: {
            roleId: role.id,
            permissionId: perm.id,
          },
        })
      )
    );

    console.log(`Created role '${role.name}' with ${rolePermissions.length} permissions`);
  }

  console.log('RBAC seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
