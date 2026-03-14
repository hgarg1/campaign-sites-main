#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnose() {
  try {
    console.log('🔍 Diagnosing production admin permissions...\n');

    // Get Global_Admin role with full details
    const globalAdminRole = await prisma.role.findFirst({
      where: { name: 'Global_Admin' },
      include: {
        permissions: {
          include: { permission: true }
        }
      }
    });

    if (!globalAdminRole) {
      console.log('❌ Global_Admin role NOT FOUND\n');
      return;
    }

    console.log(`✅ Found Global_Admin role (ID: ${globalAdminRole.id})`);
    console.log(`   Permissions assigned: ${globalAdminRole.permissions.length}`);

    if (globalAdminRole.permissions.length === 0) {
      console.log('   ❌ NO PERMISSIONS ASSIGNED!\n');
    } else {
      console.log('   Claims:');
      globalAdminRole.permissions.forEach(p => {
        console.log(`     - ${p.permission.claim}`);
      });
    }

    // Get all permission claims to verify wildcard would match
    const allClaims = await prisma.systemAdminPermission.findMany({
      select: { claim: true },
      orderBy: { claim: 'asc' }
    });

    console.log(`\n📊 Total system permissions: ${allClaims.length}`);
    console.log('   First 5:');
    allClaims.slice(0, 5).forEach(c => {
      console.log(`     - ${c.claim}`);
    });

    // Check if wildcard would match the permissions endpoint
    const hasViewPerms = allClaims.some(c => c.claim === 'system_admin_portal:rbac:view_permissions');
    if (hasViewPerms) {
      console.log('\n   ✅ system_admin_portal:rbac:view_permissions EXISTS');
      
      // Check if wildcard matches it
      if (globalAdminRole.permissions.some(p => p.permission.claim === 'system_admin_portal:*')) {
        console.log('   ✅ Wildcard "system_admin_portal:*" would match it');
      } else {
        console.log('   ❌ Wildcard NOT present in role');
      }
    } else {
      console.log('\n   ❌ system_admin_portal:rbac:view_permissions NOT FOUND in permissions table');
    }

    // Find system admins
    console.log('\n👥 System Admins:');
    const systemAdmins = await prisma.systemAdmin.findMany({
      include: {
        user: { select: { id: true, email: true } },
        roleAssignments: {
          include: { role: true }
        }
      }
    });

    if (systemAdmins.length === 0) {
      console.log('   ❌ NO SYSTEM ADMINS FOUND');
    } else {
      systemAdmins.forEach(sa => {
        console.log(`   - ${sa.user.email} (userId: ${sa.userId})`);
        console.log(`     Roles: ${sa.roleAssignments.map(r => r.role.name).join(', ') || 'NONE'}`);
      });
    }

    // Check if user exists and has role
    const adminUser = await prisma.user.findFirst({
      where: { role: { in: ['ADMIN', 'GLOBAL_ADMIN'] } },
      include: {
        systemAdmin: {
          include: {
            roleAssignments: {
              include: { role: true }
            }
          }
        }
      }
    });

    if (adminUser) {
      console.log(`\n🔑 Found admin user: ${adminUser.email}`);
      console.log(`   Role: ${adminUser.role}`);
      if (adminUser.systemAdmin) {
        console.log(`   SystemAdmin record: EXISTS`);
        console.log(`   Assigned roles: ${adminUser.systemAdmin.roleAssignments.map(r => r.role.name).join(', ') || 'NONE'}`);
      } else {
        console.log(`   SystemAdmin record: MISSING ❌`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

diagnose();
