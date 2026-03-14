#!/usr/bin/env node

// Force use of production database
process.env.DATABASE_URL = 'postgres://52c5e0c5838d4512fdf0dca523c5ba4bf2bfbc9217a32f1625411bb5b04f96d4:sk_kBwnisQIdBUFNIcDf6Nf9@db.prisma.io:5432/postgres?sslmode=require';

const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function diagnose() {
  try {
    console.log('🔍 Diagnosing PRODUCTION admin permissions...\n');

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

    // Get all permission claims
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
      
      if (globalAdminRole.permissions.some(p => p.permission.claim === 'system_admin_portal:*')) {
        console.log('   ✅ Wildcard "system_admin_portal:*" IS assigned to Global_Admin');
      } else {
        console.log('   ❌ Wildcard NOT assigned to Global_Admin');
      }
    } else {
      console.log('\n   ❌ system_admin_portal:rbac:view_permissions NOT FOUND');
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
      console.log('   ❌ NO SYSTEM ADMINS');
    } else {
      systemAdmins.forEach(sa => {
        console.log(`   - ${sa.user.email}`);
        console.log(`     Roles: ${sa.roleAssignments.map(r => r.role.name).join(', ') || 'NONE ❌'}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnose();
