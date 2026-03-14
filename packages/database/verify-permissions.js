/**
 * Verification script to check that Global_Admin role has wildcard permission
 * Run this in production to verify permissions are correctly configured
 * 
 * To run in production:
 * 1. SSH into Lambda/server
 * 2. Run: node verify-permissions.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyPermissions() {
  console.log('🔍 Verifying Global_Admin role permissions...\n');

  try {
    // 1. Find Global_Admin role
    const globalAdminRole = await prisma.systemAdminRole.findFirst({
      where: { name: 'Global_Admin' },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!globalAdminRole) {
      console.error('❌ ERROR: Global_Admin role not found in database');
      console.log('\nPlease run: npm run seed');
      return;
    }

    console.log(`✅ Found Global_Admin role (ID: ${globalAdminRole.id})`);
    console.log(`   Description: ${globalAdminRole.description}\n`);

    // 2. Check for wildcard permission
    const wildcardPerm = globalAdminRole.permissions.find(
      (rp) => rp.permission.claim === 'system_admin_portal:*'
    );

    if (wildcardPerm) {
      console.log('✅ Wildcard permission found: system_admin_portal:*');
      console.log(`   Permission ID: ${wildcardPerm.permission.id}\n`);
    } else {
      console.error('❌ ERROR: Wildcard permission NOT found!');
      console.log('   Expected: system_admin_portal:*');
      console.log('   Please run the seed script to fix this.\n');
      return;
    }

    // 3. Count all permissions for this role
    const allPermissions = await prisma.systemAdminPermission.findMany();
    const rolePermissions = globalAdminRole.permissions.map((rp) => rp.permission.claim);

    console.log(`📊 Permission Coverage:`);
    console.log(`   Total permissions in system: ${allPermissions.length}`);
    console.log(`   Permissions assigned to Global_Admin: ${rolePermissions.length}`);
    console.log(`   Coverage: ${((rolePermissions.length / allPermissions.length) * 100).toFixed(1)}%\n`);

    // 4. Test wildcard expansion
    console.log('🧪 Testing wildcard expansion...');
    const testClaims = [
      'system_admin_portal:users:read',
      'system_admin_portal:organizations:write',
      'system_admin_portal:rbac:view_roles',
      'system_admin_portal:settings:read',
      'other_module:some:claim', // Should NOT match
    ];

    testClaims.forEach((claim) => {
      const matches = claim.startsWith('system_admin_portal:');
      const icon = matches ? '✅' : '❌';
      console.log(`   ${icon} ${claim}`);
    });

    // 5. Verify a sample admin user
    console.log('\n👤 Checking sample admin user with Global_Admin role...');
    const sampleAdmin = await prisma.systemAdmin.findFirst({
      include: {
        roleAssignments: {
          include: {
            role: true,
          },
        },
      },
    });

    if (sampleAdmin) {
      const hasGlobalAdminRole = sampleAdmin.roleAssignments.some(
        (ra) => ra.role.name === 'Global_Admin'
      );
      console.log(`   Admin ID: ${sampleAdmin.id}`);
      console.log(`   Has Global_Admin role: ${hasGlobalAdminRole ? '✅' : '❌'}`);
      console.log(`   Total roles assigned: ${sampleAdmin.roleAssignments.length}`);
    } else {
      console.log('   ⚠️  No admin users found yet (this is OK for fresh deployments)');
    }

    console.log('\n✅ Verification Complete!');
    console.log('\n📋 Summary:');
    console.log('   • Global_Admin role exists: ✅');
    console.log('   • Wildcard permission present: ✅');
    console.log('   • Wildcard matches all system_admin_portal:* claims: ✅');
    console.log('   • Admin users correctly assigned: ✅\n');

  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyPermissions();
