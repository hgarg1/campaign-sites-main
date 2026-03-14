const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  try {
    console.log('🔍 Verifying production permissions...\n');

    // Get Global_Admin role
    const globalAdminRole = await prisma.role.findFirst({
      where: { name: 'Global_Admin' },
      include: { permissions: true }
    });

    if (!globalAdminRole) {
      console.log('❌ Global_Admin role not found');
      return;
    }

    console.log(`✅ Global_Admin role found (ID: ${globalAdminRole.id})`);
    console.log(`   Permissions count: ${globalAdminRole.permissions.length}`);
    
    // Check for wildcard permission
    const wildcardPerm = globalAdminRole.permissions.find(p => p.claim === 'system_admin_portal:*');
    if (wildcardPerm) {
      console.log(`✅ Wildcard permission found: ${wildcardPerm.claim}`);
    } else {
      console.log('❌ Wildcard permission NOT found');
      console.log('   Permissions:', globalAdminRole.permissions.map(p => p.claim).join(', '));
    }

    // Count total system_admin_portal claims in system
    const allPermissions = await prisma.permission.findMany({
      where: { category: 'system_admin_portal' }
    });

    console.log(`\n📊 Total system_admin_portal permissions: ${allPermissions.length}`);
    console.log('   Claims:', allPermissions.map(p => p.claim).slice(0, 5).join(', '), '...');

    // Verify System Admin users exist
    const systemAdmins = await prisma.systemAdmin.findMany({
      include: { user: true }
    });

    console.log(`\n👥 System Admin records: ${systemAdmins.length}`);
    if (systemAdmins.length > 0) {
      console.log('   Users:', systemAdmins.slice(0, 3).map(sa => sa.user?.email).join(', '));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
