#!/usr/bin/env node

/**
 * Fix script: Ensure Global_Admin role has wildcard permission in production
 * This directly manipulates the production database to fix permission issues
 */

process.env.DATABASE_URL = 'postgres://52c5e0c5838d4512fdf0dca523c5ba4bf2bfbc9217a32f1625411bb5b04f96d4:sk_kBwnisQIdBUFNIcDf6Nf9@db.prisma.io:5432/postgres?sslmode=require';

const { Client } = require('pg');

async function fixPermissions() {
  const client = new Client();

  try {
    console.log('🔧 Connecting to production database...');
    await client.connect();

    // Step 1: Verify Global_Admin role exists
    console.log('\n📋 Step 1: Check if Global_Admin role exists');
    const roleRes = await client.query(
      `SELECT id, name FROM "system_admin_roles" WHERE name = $1`,
      ['Global_Admin']
    );

    if (roleRes.rows.length === 0) {
      console.log('❌ Global_Admin role NOT found. Creating it...');
      const createRes = await client.query(
        `INSERT INTO "system_admin_roles" (id, name, description, "isBuiltIn", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, true, now(), now())
         RETURNING id`,
        ['Global_Admin', 'Full system administrator with all permissions']
      );
      var globalAdminRoleId = createRes.rows[0].id;
      console.log('✅ Created Global_Admin role:', globalAdminRoleId);
    } else {
      var globalAdminRoleId = roleRes.rows[0].id;
      console.log('✅ Found Global_Admin role:', globalAdminRoleId);
    }

    // Step 2: Check if wildcard permission exists
    console.log('\n📋 Step 2: Check if wildcard permission exists');
    const wildcardRes = await client.query(
      `SELECT id FROM "system_admin_permissions" WHERE claim = $1`,
      ['system_admin_portal:*']
    );

    let wildcardPermId;
    if (wildcardRes.rows.length === 0) {
      console.log('❌ Wildcard permission NOT found. Creating it...');
      const createRes = await client.query(
        `INSERT INTO "system_admin_permissions" 
         (id, claim, description, category, action, "operationType", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, now(), now())
         RETURNING id`,
        [
          'system_admin_portal:*',
          'Full system admin access to all portal features',
          'system_admin_portal',
          '*',
          'ALL'
        ]
      );
      wildcardPermId = createRes.rows[0].id;
      console.log('✅ Created wildcard permission:', wildcardPermId);
    } else {
      wildcardPermId = wildcardRes.rows[0].id;
      console.log('✅ Found wildcard permission:', wildcardPermId);
    }

    // Step 3: Assign wildcard permission to Global_Admin role
    console.log('\n📋 Step 3: Assign wildcard permission to Global_Admin');
    const assignRes = await client.query(
      `SELECT id FROM "system_admin_role_permissions" 
       WHERE "roleId" = $1 AND "permissionId" = $2`,
      [globalAdminRoleId, wildcardPermId]
    );

    if (assignRes.rows.length === 0) {
      console.log('   Adding assignment...');
      await client.query(
        `INSERT INTO "system_admin_role_permissions" 
         (id, "roleId", "permissionId", "createdAt")
         VALUES (gen_random_uuid(), $1, $2, now())`,
        [globalAdminRoleId, wildcardPermId]
      );
      console.log('✅ Assigned wildcard permission to Global_Admin');
    } else {
      console.log('✅ Assignment already exists');
    }

    // Step 4: Verify the assignment
    console.log('\n📋 Step 4: Verify Global_Admin permissions');
    const verifyRes = await client.query(
      `SELECT sp.claim FROM "system_admin_role_permissions" srp
       JOIN "system_admin_permissions" sp ON srp."permissionId" = sp.id
       WHERE srp."roleId" = $1
       ORDER BY sp.claim`,
      [globalAdminRoleId]
    );

    console.log(`✅ Global_Admin now has ${verifyRes.rows.length} permissions:`);
    verifyRes.rows.forEach(row => {
      console.log(`   - ${row.claim}`);
    });

    // Step 5: Check system admins and their role assignments
    console.log('\n📋 Step 5: System admins and their roles');
    const adminsRes = await client.query(
      `SELECT sa.email, sa."userId", COUNT(DISTINCT sar."roleId") as role_count,
              STRING_AGG(DISTINCT sar2.name, ', ') as roles
       FROM "system_admins" sa
       LEFT JOIN "system_admin_role_assignments" sar ON sa.id = sar."adminId"
       LEFT JOIN "system_admin_roles" sar2 ON sar."roleId" = sar2.id
       GROUP BY sa.id, sa.email, sa."userId"
       ORDER BY sa.email`
    );

    if (adminsRes.rows.length === 0) {
      console.log('   ❌ No system admins found');
    } else {
      adminsRes.rows.forEach(row => {
        console.log(`   - ${row.email}`);
        if (row.roles) {
          console.log(`     Roles: ${row.roles}`);
        } else {
          console.log(`     ❌ NO ROLES ASSIGNED`);
        }
      });
    }

    // Step 6: Check users with ADMIN/GLOBAL_ADMIN role and if they have SystemAdmin record
    console.log('\n📋 Step 6: Users with ADMIN/GLOBAL_ADMIN role');
    const usersRes = await client.query(
      `SELECT u.email, u.role, sa.id as system_admin_id,
              STRING_AGG(DISTINCT sar2.name, ', ') as admin_roles
       FROM users u
       LEFT JOIN system_admins sa ON u.id = sa."userId"
       LEFT JOIN system_admin_role_assignments sar ON sa.id = sar."adminId"
       LEFT JOIN system_admin_roles sar2 ON sar."roleId" = sar2.id
       WHERE u.role IN ('ADMIN', 'GLOBAL_ADMIN')
       GROUP BY u.id, u.email, u.role, sa.id
       ORDER BY u.email`
    );

    if (usersRes.rows.length === 0) {
      console.log('   ❌ No admin users found');
    } else {
      usersRes.rows.forEach(row => {
        console.log(`   - ${row.email} (User.role: ${row.role})`);
        if (row.system_admin_id) {
          if (row.admin_roles) {
            console.log(`     ✅ SystemAdmin roles: ${row.admin_roles}`);
          } else {
            console.log(`     ⚠️  SystemAdmin exists but NO ROLES`);
          }
        } else {
          console.log(`     ⚠️  NO SystemAdmin record`);
        }
      });
    }

    console.log('\n✅ Fix complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

fixPermissions();
