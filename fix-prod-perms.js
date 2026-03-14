#!/usr/bin/env node

/**
 * Fix: Ensure Global_Admin has wildcard permission in production
 */

process.env.DATABASE_URL = 'postgres://52c5e0c5838d4512fdf0dca523c5ba4bf2bfbc9217a32f1625411bb5b04f96d4:sk_kBwnisQIdBUFNIcDf6Nf9@db.prisma.io:5432/postgres?sslmode=require';

// Use @prisma/client from node_modules
const { PrismaClient } = require('./node_modules/@prisma/client');

async function fixPermissions() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });

  try {
    console.log('🔧 Fixing production admin permissions...\n');

    // Step 1: Get or create Global_Admin role
    console.log('Step 1: Get or create Global_Admin role');
    let globalAdminRole = await prisma.systemAdminRole.findFirst({
      where: { name: 'Global_Admin' }
    });

    if (!globalAdminRole) {
      console.log('  Creating Global_Admin role...');
      globalAdminRole = await prisma.systemAdminRole.create({
        data: {
          name: 'Global_Admin',
          description: 'Full system administrator with all permissions',
          isBuiltIn: true
        }
      });
    }
    console.log(`✅ Global_Admin role: ${globalAdminRole.id}`);

    // Step 2: Get or create wildcard permission
    console.log('\nStep 2: Get or create wildcard permission');
    let wildcardPerm = await prisma.systemAdminPermission.findFirst({
      where: { claim: 'system_admin_portal:*' }
    });

    if (!wildcardPerm) {
      console.log('  Creating wildcard permission...');
      wildcardPerm = await prisma.systemAdminPermission.create({
        data: {
          claim: 'system_admin_portal:*',
          description: 'Full system admin access to all portal features',
          category: 'system_admin_portal',
          action: '*',
          operationType: 'ALL'
        }
      });
    }
    console.log(`✅ Wildcard permission: ${wildcardPerm.id}`);

    // Step 3: Assign wildcard to Global_Admin
    console.log('\nStep 3: Assign wildcard permission to Global_Admin');
    const existing = await prisma.systemAdminRolePermission.findFirst({
      where: {
        roleId: globalAdminRole.id,
        permissionId: wildcardPerm.id
      }
    });

    if (!existing) {
      console.log('  Creating assignment...');
      await prisma.systemAdminRolePermission.create({
        data: {
          roleId: globalAdminRole.id,
          permissionId: wildcardPerm.id
        }
      });
    } else {
      console.log('  Assignment already exists');
    }
    console.log('✅ Assignment complete');

    // Step 4: Verify
    console.log('\nStep 4: Verify Global_Admin permissions');
    const verifyRole = await prisma.systemAdminRole.findFirst({
      where: { name: 'Global_Admin' },
      include: {
        permissions: {
          include: { permission: true }
        }
      }
    });

    console.log(`✅ Global_Admin has ${verifyRole.permissions.length} permissions:`);
    verifyRole.permissions.forEach(rp => {
      console.log(`   - ${rp.permission.claim}`);
    });

    // Step 5: List system admins and their roles
    console.log('\nStep 5: System admins');
    const admins = await prisma.systemAdmin.findMany({
      include: {
        roleAssignments: {
          include: { role: true }
        }
      }
    });

    if (admins.length === 0) {
      console.log('   ❌ No system admins');
    } else {
      admins.forEach(admin => {
        console.log(`   - ${admin.email}`);
        if (admin.roleAssignments.length === 0) {
          console.log(`     ❌ NO ROLES`);
        } else {
          console.log(`     Roles: ${admin.roleAssignments.map(r => r.role.name).join(', ')}`);
        }
      });
    }

    console.log('\n✅ Done!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPermissions();
