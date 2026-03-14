#!/usr/bin/env node

/**
 * Production setup script - Run once in production to set up admin permissions
 * Usage: DATABASE_URL=postgres://... node setup-admin-prod.js
 */

process.env.DATABASE_URL = 'postgres://52c5e0c5838d4512fdf0dca523c5ba4bf2bfbc9217a32f1625411bb5b04f96d4:sk_kBwnisQIdBUFNIcDf6Nf9@db.prisma.io:5432/postgres?sslmode=require';

const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function setupProduction() {
  try {
    console.log('🔧 Setting up production admin permissions...\n');

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

    // Step 2: Ensure wildcard permission exists and is assigned
    console.log('\n📋 Ensuring wildcard permission...');

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

    // Step 3: Ensure garg.archie@gmail.com has SystemAdmin and role
    console.log('\n📋 Setting up garg.archie@gmail.com...');

    const user = await prisma.user.findUnique({
      where: { email: 'garg.archie@gmail.com' },
    });

    if (!user) {
      console.log('❌ User garg.archie@gmail.com not found in production');
      return;
    }

    console.log(`✅ Found user: ${user.email}`);

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

    // Assign Global_Admin role
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
      console.log('✅ Global_Admin role assigned');
    } else {
      console.log('✅ Global_Admin role already assigned');
    }

    // Verify
    console.log('\n✅ Production verification:');
    const verifyAdmin = await prisma.systemAdmin.findUnique({
      where: { userId: user.id },
      include: {
        roleAssignments: {
          include: {
            role: {
              include: {
                permissions: true,
              },
            },
          },
        },
      },
    });

    console.log(`   Admin: ${verifyAdmin?.email}`);
    console.log(`   Roles: ${verifyAdmin?.roleAssignments.length}`);
    verifyAdmin?.roleAssignments.forEach((ra) => {
      console.log(`     - ${ra.role.name} (${ra.role.permissions.length} permissions)`);
    });

    console.log('\n🎉 Production setup complete!');

  } catch (error) {
    console.error('❌ Setup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupProduction();
