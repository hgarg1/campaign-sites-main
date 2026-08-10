/**
 * Ancestry closure-table scenarios.
 *
 * The closure table is load-bearing for four separate features — inherited
 * authority, status cascade, the national-tenant resolver and the cascade
 * preview — and all four fail silently and identically if it is wrong. These
 * check the table itself rather than any one feature built on it.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { prisma } from '@/lib/database';
import { scenario } from './harness';
import { buildWorld } from './world';
import { getAncestorIds, getDescendantIds, getEffectiveStatus } from '@/lib/ancestry';
import { resolveNationalTenant } from '@/lib/master-tenant';

const H = 'Hierarchy';

/** Migrations are read from disk so the scenario tests the shipped SQL, not a copy. */
const MIGRATIONS = path.resolve(
  __dirname,
  '../../../../packages/database/prisma/migrations'
);

/**
 * Run a migration file the way Prisma's migrate engine does.
 *
 * `$executeRawUnsafe` goes through a prepared statement, which PostgreSQL limits
 * to one command — so a multi-statement file has to be split. Comments are
 * stripped first because a `;` inside one would split in the wrong place.
 */
async function applyMigration(name: string): Promise<void> {
  const sql = readFileSync(path.join(MIGRATIONS, name, 'migration.sql'), 'utf8');
  const statements = sql
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }
}

const REPAIR = '20260810160000_repair_ancestry_closure';

scenario(H, 'A child of a root organization records the root as its ancestor', async (ctx) => {
  const w = await buildWorld(prisma, {
    orgs: [{ key: 'root' }, { key: 'child', parent: 'root' }],
  });

  const ancestors = await getAncestorIds(w.org.child);
  ctx.check(
    'the root is among the child’s ancestors',
    ancestors.includes(w.org.root),
    `ancestors: ${JSON.stringify(ancestors)}`
  );

  const descendants = await getDescendantIds(w.org.root);
  ctx.check(
    'and the child is among the root’s descendants',
    descendants.includes(w.org.child),
    `descendants: ${JSON.stringify(descendants)}`
  );
});

scenario(H, 'Ancestry reaches all the way up a four-level tree', async (ctx) => {
  const w = await buildWorld(prisma, {
    orgs: [
      { key: 'root' },
      { key: 'state', parent: 'root' },
      { key: 'county', parent: 'state' },
      { key: 'campaign', parent: 'county' },
    ],
  });

  const ancestors = await getAncestorIds(w.org.campaign);
  for (const [label, id] of [
    ['county', w.org.county],
    ['state', w.org.state],
    ['root', w.org.root],
  ] as const) {
    ctx.check(`${label} is an ancestor of the campaign`, ancestors.includes(id), `got ${ancestors.length} ancestors`);
  }

  const descendants = await getDescendantIds(w.org.root);
  ctx.eq('the root sees three descendants', descendants.length, 3);
});

scenario(H, 'Suspending a root organization cascades to its descendants', async (ctx) => {
  // This is the check that matters most: status inheritance is what stops a
  // suspended party committee from continuing to operate through its children.
  const w = await buildWorld(prisma, {
    orgs: [
      { key: 'root' },
      { key: 'state', parent: 'root' },
      { key: 'county', parent: 'state' },
    ],
  });

  await prisma.organization.update({
    where: { id: w.org.root },
    data: { ownStatus: 'SUSPENDED', suspendedAt: new Date() },
  });

  ctx.eq('the direct child is suspended', await getEffectiveStatus(w.org.state), 'SUSPENDED');
  ctx.eq('and so is the grandchild', await getEffectiveStatus(w.org.county), 'SUSPENDED');
});

scenario(H, 'The national tenant resolves from a distant ancestor', async (ctx) => {
  const w = await buildWorld(prisma, {
    orgs: [
      { key: 'national', party: 'REPUBLICAN', masterFor: 'REPUBLICAN' },
      { key: 'state', parent: 'national' },
      { key: 'county', parent: 'state' },
      { key: 'campaign', parent: 'county' },
    ],
  });

  const resolution = await resolveNationalTenant(w.org.campaign);
  ctx.eq('it finds the national committee', resolution.orgId, w.org.national);
  ctx.eq('by ancestry, not by party fallback', resolution.source, 'ANCESTOR_MAPPING');
  ctx.eq('and is not ambiguous', resolution.ambiguous, false);
});

scenario(H, 'The repair migration rebuilds a closure that was never written', async (ctx) => {
  // The code fix stops new gaps. Existing deployments already have them, so the
  // migration has to be able to reconstruct the table — and running it against
  // production is not the moment to find out whether the SQL is right.
  const w = await buildWorld(prisma, {
    orgs: [
      { key: 'national', party: 'DEMOCRAT', masterFor: 'DEMOCRAT' },
      { key: 'state', parent: 'national' },
      { key: 'county', parent: 'state' },
      { key: 'campaign', parent: 'county' },
    ],
  });

  // Reproduce the damage: wipe the closure entirely, leaving only `parentId`.
  await prisma.organizationAncestry.deleteMany({});
  ctx.eq(
    'the closure is gone',
    (await prisma.organizationAncestry.count()),
    0
  );
  ctx.eq('and nothing resolves', (await getAncestorIds(w.org.campaign)).length, 0);

  // Twice, because a migration that is not idempotent is a migration that can
  // only ever be run once — and this one may need re-running after a restore.
  await applyMigration(REPAIR);
  const afterFirst = await prisma.organizationAncestry.count();
  await applyMigration(REPAIR);
  const afterSecond = await prisma.organizationAncestry.count();
  ctx.eq('re-running changes nothing', afterSecond, afterFirst);

  const ancestors = await getAncestorIds(w.org.campaign);
  for (const [label, id] of [
    ['county', w.org.county],
    ['state', w.org.state],
    ['national', w.org.national],
  ] as const) {
    ctx.check(`${label} was restored as an ancestor`, ancestors.includes(id), JSON.stringify(ancestors));
  }

  const depths = await prisma.organizationAncestry.findMany({
    where: { descendantId: w.org.campaign },
    select: { ancestorId: true, depth: true },
  });
  const byId = new Map(depths.map((d) => [d.ancestorId, d.depth]));
  ctx.eq('self at depth 0', byId.get(w.org.campaign), 0);
  ctx.eq('parent at depth 1', byId.get(w.org.county), 1);
  ctx.eq('grandparent at depth 2', byId.get(w.org.state), 2);
  ctx.eq('root at depth 3', byId.get(w.org.national), 3);

  const descendants = await getDescendantIds(w.org.national);
  ctx.eq('and the root sees its whole subtree again', descendants.length, 3);

  const resolution = await resolveNationalTenant(w.org.campaign);
  ctx.eq('the national tenant resolves again', resolution.orgId, w.org.national);
});

scenario(H, 'The repair preserves co-ownership edges it did not create', async (ctx) => {
  // Ancestry carries edges from co-ownership as well as from `parentId`, so a
  // rebuild that read only `parentId` would silently delete half the graph.
  // The migration is additive for exactly this reason.
  const w = await buildWorld(prisma, {
    orgs: [
      { key: 'redRoot', party: 'REPUBLICAN', masterFor: 'REPUBLICAN' },
      { key: 'state', parent: 'redRoot' },
      { key: 'coParent' },
      { key: 'county', parent: 'state' },
    ],
    owners: [
      { parent: 'state', child: 'county', stakeBps: 6000, isPrimary: true },
      { parent: 'coParent', child: 'county', stakeBps: 4000 },
    ],
  });

  // The co-ownership edge, written the way `owners/route.ts` writes it.
  const { insertAncestry } = await import('@/lib/ancestry');
  await insertAncestry(w.org.county, w.org.coParent);

  const before = await getAncestorIds(w.org.county);
  ctx.check('the co-parent is an ancestor to begin with', before.includes(w.org.coParent));

  await applyMigration(REPAIR);

  const after = await getAncestorIds(w.org.county);
  ctx.check(
    'and it survives the repair',
    after.includes(w.org.coParent),
    JSON.stringify(after)
  );
  ctx.check(
    'alongside the structural ancestors',
    after.includes(w.org.state) && after.includes(w.org.redRoot),
    JSON.stringify(after)
  );
});

scenario(H, 'Two mapped ancestors at equal distance are refused, not guessed', async (ctx) => {
  // Co-ownership makes the closure a DAG. Picking one arbitrarily would hand
  // the deciding vote to whichever row the query happened to return first.
  const w = await buildWorld(prisma, {
    orgs: [
      { key: 'redRoot', party: 'REPUBLICAN', masterFor: 'REPUBLICAN' },
      { key: 'blueRoot', party: 'DEMOCRAT', masterFor: 'DEMOCRAT' },
      { key: 'joint', parent: 'redRoot' },
    ],
  });

  // A second structural ancestor at the same depth, added the way the app does.
  const { insertAncestry } = await import('@/lib/ancestry');
  await insertAncestry(w.org.joint, w.org.blueRoot);

  const resolution = await resolveNationalTenant(w.org.joint);
  ctx.check('the tie between party trees is refused', resolution.ambiguous, JSON.stringify(resolution));
  ctx.eq('and no tie-breaker is offered', resolution.orgId, null);
});
