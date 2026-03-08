/**
 * seed-master-tenants.ts
 *
 * Creates the 7 party master tenant organizations, assigns each a MasterTenantMapping,
 * creates an OWNER user for each, adds the global admin (garg.archie@gmail.com) as OWNER
 * of every master tenant org, and writes all credentials to a JSON file.
 *
 * Run from packages/database:
 *   npx ts-node --skip-project prisma/seed-master-tenants.ts
 */

import { PrismaClient } from '@prisma/client';
import { promisify } from 'util';
import { scrypt, randomBytes } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString('hex')}`;
}

function generatePassword(prefix: string): string {
  const suffix = randomBytes(6).toString('hex');
  return `${prefix}@CS2025!${suffix}`;
}

const PARTY_TENANTS = [
  {
    party: 'REPUBLICAN' as const,
    orgName: 'Republican National Tenant',
    slug: 'master-republican',
    ownerEmail: 'owner.republican@campaignsites.io',
    ownerName: 'Republican Master Owner',
  },
  {
    party: 'DEMOCRAT' as const,
    orgName: 'Democrat National Tenant',
    slug: 'master-democrat',
    ownerEmail: 'owner.democrat@campaignsites.io',
    ownerName: 'Democrat Master Owner',
  },
  {
    party: 'LIBERTARIAN' as const,
    orgName: 'Libertarian National Tenant',
    slug: 'master-libertarian',
    ownerEmail: 'owner.libertarian@campaignsites.io',
    ownerName: 'Libertarian Master Owner',
  },
  {
    party: 'GREEN' as const,
    orgName: 'Green Party National Tenant',
    slug: 'master-green',
    ownerEmail: 'owner.green@campaignsites.io',
    ownerName: 'Green Party Master Owner',
  },
  {
    party: 'INDEPENDENT' as const,
    orgName: 'Independent National Tenant',
    slug: 'master-independent',
    ownerEmail: 'owner.independent@campaignsites.io',
    ownerName: 'Independent Master Owner',
  },
  {
    party: 'NONPARTISAN' as const,
    orgName: 'Nonpartisan National Tenant',
    slug: 'master-nonpartisan',
    ownerEmail: 'owner.nonpartisan@campaignsites.io',
    ownerName: 'Nonpartisan Master Owner',
  },
  {
    party: 'OTHER' as const,
    orgName: 'Other Party National Tenant',
    slug: 'master-other',
    ownerEmail: 'owner.other@campaignsites.io',
    ownerName: 'Other Party Master Owner',
  },
];

async function main() {
  console.log('🌱  Seeding master tenant organizations...\n');

  // Find the global admin
  const globalAdmin = await prisma.user.findUnique({
    where: { email: 'garg.archie@gmail.com' },
  });
  if (!globalAdmin) {
    throw new Error('Global admin user (garg.archie@gmail.com) not found. Run the main seed first.');
  }
  console.log(`✓ Found global admin: ${globalAdmin.email} (${globalAdmin.id})\n`);

  const credentialsList: Array<{
    party: string;
    orgName: string;
    orgId: string;
    orgSlug: string;
    ownerEmail: string;
    ownerPassword: string;
    mappingId: string;
  }> = [];

  for (const tenant of PARTY_TENANTS) {
    console.log(`── Processing ${tenant.party}...`);

    // 1. Upsert organization
    let org = await prisma.organization.findUnique({ where: { slug: tenant.slug } });
    if (!org) {
      org = await prisma.organization.create({
        data: {
          name: tenant.orgName,
          slug: tenant.slug,
          partyAffiliation: tenant.party,
          ownStatus: 'ACTIVE',
          canCreateChildren: true,
          whiteLabel: false,
        },
      });
      console.log(`   ✓ Created org: ${org.name} (${org.id})`);
    } else {
      console.log(`   · Org already exists: ${org.name} (${org.id})`);
    }

    // 2. Upsert MasterTenantMapping
    let mapping = await prisma.masterTenantMapping.findUnique({
      where: { partyAffiliation: tenant.party },
    });
    if (!mapping) {
      mapping = await prisma.masterTenantMapping.create({
        data: {
          partyAffiliation: tenant.party,
          organizationId: org.id,
        },
      });
      console.log(`   ✓ Created master tenant mapping for ${tenant.party}`);
    } else if (mapping.organizationId !== org.id) {
      mapping = await prisma.masterTenantMapping.update({
        where: { partyAffiliation: tenant.party },
        data: { organizationId: org.id },
      });
      console.log(`   ✓ Updated master tenant mapping to point to ${org.id}`);
    } else {
      console.log(`   · Mapping already correct`);
    }

    // 3. Upsert owner user
    const password = generatePassword(tenant.party.toLowerCase());
    let ownerUser = await prisma.user.findUnique({ where: { email: tenant.ownerEmail } });
    if (!ownerUser) {
      const hash = await hashPassword(password);
      ownerUser = await prisma.user.create({
        data: {
          email: tenant.ownerEmail,
          passwordHash: hash,
          name: tenant.ownerName,
          role: 'USER',
        },
      });
      console.log(`   ✓ Created owner user: ${ownerUser.email}`);
    } else {
      // Update password so we have a known credential
      const hash = await hashPassword(password);
      ownerUser = await prisma.user.update({
        where: { id: ownerUser.id },
        data: { passwordHash: hash },
      });
      console.log(`   · Owner user exists, refreshed password: ${ownerUser.email}`);
    }

    // 4. Add owner as OWNER member of org
    const existingOwnerMember = await prisma.organizationMember.findFirst({
      where: { organizationId: org.id, userId: ownerUser.id },
    });
    if (!existingOwnerMember) {
      await prisma.organizationMember.create({
        data: {
          organizationId: org.id,
          userId: ownerUser.id,
          role: 'OWNER',
        },
      });
      console.log(`   ✓ Added ${ownerUser.email} as OWNER`);
    } else if (existingOwnerMember.role !== 'OWNER') {
      await prisma.organizationMember.update({
        where: { id: existingOwnerMember.id },
        data: { role: 'OWNER' },
      });
      console.log(`   ✓ Promoted ${ownerUser.email} to OWNER`);
    } else {
      console.log(`   · ${ownerUser.email} is already OWNER`);
    }

    // 5. Add global admin as OWNER member
    const existingAdminMember = await prisma.organizationMember.findFirst({
      where: { organizationId: org.id, userId: globalAdmin.id },
    });
    if (!existingAdminMember) {
      await prisma.organizationMember.create({
        data: {
          organizationId: org.id,
          userId: globalAdmin.id,
          role: 'OWNER',
        },
      });
      console.log(`   ✓ Added global admin as OWNER`);
    } else if (existingAdminMember.role !== 'OWNER') {
      await prisma.organizationMember.update({
        where: { id: existingAdminMember.id },
        data: { role: 'OWNER' },
      });
      console.log(`   ✓ Promoted global admin to OWNER`);
    } else {
      console.log(`   · Global admin already OWNER`);
    }

    // 6. Also add global admin as ADMIN system user (role on User model stays USER,
    //    they access via GLOBAL_ADMIN system session — the org membership is what matters)

    credentialsList.push({
      party: tenant.party,
      orgName: org.name,
      orgId: org.id,
      orgSlug: org.slug,
      ownerEmail: tenant.ownerEmail,
      ownerPassword: password,
      mappingId: mapping.id,
    });

    console.log('');
  }

  // Write credentials file
  const outputPath = path.join(__dirname, '..', '..', '..', 'master-tenant-credentials.json');
  const outputData = {
    generated: new Date().toISOString(),
    note: 'Keep this file secure. These are live database credentials.',
    globalAdmin: {
      email: globalAdmin.email,
      note: 'Uses existing password from main seed',
    },
    masterTenants: credentialsList,
  };
  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));

  console.log('═══════════════════════════════════════════════════');
  console.log(`✅  Done! ${credentialsList.length} master tenants seeded.`);
  console.log(`📄  Credentials saved to: ${outputPath}`);
  console.log('═══════════════════════════════════════════════════\n');

  // Also print summary table
  console.log('Party           Email                                    Password');
  console.log('─────────────── ──────────────────────────────────────── ────────────────────────');
  for (const c of credentialsList) {
    console.log(`${c.party.padEnd(16)} ${c.ownerEmail.padEnd(41)} ${c.ownerPassword}`);
  }
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌  Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
