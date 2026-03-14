/**
 * One-time setup script to configure Global_Admin role and assign to garg.archie@gmail.com
 * Run once after deployment: pnpm setup:admin [password]
 * 
 * This script:
 * 1. Creates Global_Admin and System_Auditor system admin roles
 * 2. Creates all system_admin_portal permission claims
 * 3. Assigns wildcard permission to Global_Admin role
 * 4. Creates/ensures garg.archie@gmail.com user exists
 * 5. Creates/ensures SystemAdmin record exists
 * 6. Assigns Global_Admin role to that user
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();
const scryptAsync = promisify(scrypt);

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

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

async function setupAdmin() {
  try {
    console.log('🔧 Setting up Global Admin permissions and user...\n');

    // Load claims
    const claimsData = loadClaims();
    const flatClaims = flattenClaims(claimsData);
    console.log(`✅ Loaded ${flatClaims.length} permission claims\n`);

    // Step 1: Create roles (if not exist)
    console.log('📋 Creating system admin roles...');
    
    const globalAdminRole = await prisma.systemAdminRole.upsert({
      where: { name: 'Global_Admin' },
      update: {},
      create: {
        name: 'Global_Admin',
        description: 'Full system administrator with all permissions',
        isBuiltIn: true,
      },
    });
    console.log('✅ Global_Admin role created/exists');

    const systemAuditorRole = await prisma.systemAdminRole.upsert({
      where: { name: 'System_Auditor' },
      update: {},
      create: {
        name: 'System_Auditor',
        description: 'View-only access to audit logs and reports',
        isBuiltIn: true,
      },
    });
    console.log('✅ System_Auditor role created/exists');

    // Step 2: Create all permission claims
    console.log('\n📋 Creating permission claims...');
    let createdCount = 0;

    for (const claim of flatClaims) {
      try {
        await prisma.systemAdminPermission.upsert({
          where: { claim: claim.claim },
          update: {},
          create: {
            claim: claim.claim,
            description: claim.description,
            category: claim.category,
            action: claim.type,
            operationType: claim.type === 'READ' ? 'READ' : 'WRITE',
          },
        });
        createdCount++;
      } catch (err) {
        // Ignore duplicate claims
      }
    }
    console.log(`✅ ${createdCount} permission claims created/exist`);

    // Step 3: Assign permissions to Global_Admin role
    console.log('\n📋 Assigning permissions to Global_Admin role...');

    // Assign wildcard permission
    const wildcardPerm = await prisma.systemAdminPermission.upsert({
      where: { claim: 'system_admin_portal:*' },
      update: {},
      create: {
        claim: 'system_admin_portal:*',
        description: 'Full access to all system admin portal features',
        category: 'system_admin_portal',
        action: '*',
        operationType: 'ALL',
      },
    });

    const existingWildcard = await prisma.systemAdminRolePermission.findFirst({
      where: {
        roleId: globalAdminRole.id,
        permissionId: wildcardPerm.id,
      },
    });

    if (!existingWildcard) {
      await prisma.systemAdminRolePermission.create({
        data: {
          roleId: globalAdminRole.id,
          permissionId: wildcardPerm.id,
        },
      });
      console.log('✅ Wildcard permission assigned to Global_Admin');
    } else {
      console.log('✅ Wildcard permission already assigned');
    }

    // Step 4: Create or find garg.archie@gmail.com user
    console.log('\n📋 Setting up garg.archie@gmail.com...');

    let user = await prisma.user.findUnique({
      where: { email: 'garg.archie@gmail.com' },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) {
      console.log('   Creating new user...');
      const password = process.argv[2] || 'ChangeMe@2025';
      const passwordHash = await hashPassword(password);
      
      user = await prisma.user.create({
        data: {
          email: 'garg.archie@gmail.com',
          passwordHash,
          name: 'Archie Garg',
          role: 'GLOBAL_ADMIN',
        },
        select: { id: true, email: true, name: true, role: true },
      });
      console.log(`✅ Created user: ${user.email} (temp password: ${password})`);
    } else {
      console.log(`✅ Found existing user: ${user.email}`);
      
      // Ensure user has GLOBAL_ADMIN role
      if (user.role !== 'GLOBAL_ADMIN') {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: 'GLOBAL_ADMIN' },
        });
        console.log('✅ Updated user role to GLOBAL_ADMIN');
      }
    }

    // Step 5: Create or get SystemAdmin record
    const systemAdmin = await prisma.systemAdmin.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        email: user.email,
        name: user.name || 'System Admin',
      },
    });
    console.log('✅ SystemAdmin record created/exists');

    // Step 6: Assign Global_Admin role
    console.log('\n📋 Assigning Global_Admin role...');

    const existingRole = await prisma.systemAdminRoleAssignment.findFirst({
      where: {
        adminId: systemAdmin.id,
        roleId: globalAdminRole.id,
      },
    });

    if (!existingRole) {
      await prisma.systemAdminRoleAssignment.create({
        data: {
          adminId: systemAdmin.id,
          roleId: globalAdminRole.id,
          assignedBy: user.id,
        },
      });
      console.log('✅ Global_Admin role assigned to user');
    } else {
      console.log('✅ Global_Admin role already assigned');
    }

    // Verify
    console.log('\n✅ Setup verification:');
    const verifyAdmin = await prisma.systemAdmin.findUnique({
      where: { userId: user.id },
      include: {
        roleAssignments: {
          include: {
            role: {
              include: {
                permissions: {
                  select: { permission: { select: { claim: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (verifyAdmin?.roleAssignments.length === 0) {
      console.log('   ⚠️  No roles assigned');
    } else {
      verifyAdmin?.roleAssignments.forEach((ra) => {
        console.log(`   - Role: ${ra.role.name}`);
        console.log(`     Permissions: ${ra.role.permissions.length}`);
      });
    }

    console.log('\n🎉 Setup complete! Admin portal is ready.');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setupAdmin();
