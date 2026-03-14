#!/usr/bin/env node

process.env.DATABASE_URL = 'postgres://52c5e0c5838d4512fdf0dca523c5ba4bf2bfbc9217a32f1625411bb5b04f96d4:sk_kBwnisQIdBUFNIcDf6Nf9@db.prisma.io:5432/postgres?sslmode=require';

const path = require('path');
try {
  // Try to load from apps/web first since it has the app
  const prisma = require(path.join(__dirname, 'apps/web/src/lib/database.ts')).prisma;
  console.log('Using prisma from apps/web/src/lib/database.ts');
  
  async function test() {
    const role = await prisma.role.findFirst({
      where: { name: 'Global_Admin' }
    });
    console.log('Global_Admin:', role);
  }
  
  test().finally(() => prisma.$disconnect());
} catch (e) {
  console.log('Direct approach failed, trying alternative...');
  
  // Fallback: use CLI
  const { execSync } = require('child_process');
  try {
    const result = execSync('npx prisma query --stdin', {
      input: `
        SELECT r.name, COUNT(p.id) as perm_count FROM "Role" r 
        LEFT JOIN "_RoleToSystemAdminPermission" rp ON r.id = rp."A"
        LEFT JOIN "SystemAdminPermission" p ON rp."B" = p.id
        WHERE r.name = 'Global_Admin'
        GROUP BY r.id, r.name
      `,
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    console.log('Prisma query result:', result);
  } catch (err) {
    console.log('Prisma query failed:', err.message);
  }
}
