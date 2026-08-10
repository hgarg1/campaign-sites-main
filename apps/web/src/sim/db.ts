/**
 * Scratch-database plumbing for the governance simulation.
 *
 * The simulation drives the real engine against a real PostgreSQL server,
 * because the things most worth testing here are not arithmetic — they are
 * transactions, `updateMany` status guards, partial unique indexes and cascade
 * semantics. A mocked Prisma would test the mock.
 *
 * It provisions its own database (`campaignsites_sim` by default) from the
 * committed migrations and never touches the developer's own. Credentials come
 * from `packages/database/.env`, and a hostname guard makes this incapable of
 * pointing at anything hosted.
 *
 * This module must not import `@/lib/database`: that singleton reads
 * `DATABASE_URL` at module-init time, so it has to be loaded *after*
 * `prepareDatabase()` has set it. `main.ts` enforces the ordering with dynamic
 * imports.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const DATABASE_PKG = path.join(REPO_ROOT, 'packages', 'database');

export const SIM_DB_NAME = process.env.SIM_DB_NAME ?? 'campaignsites_sim';

function devUrl(): URL {
  const env = readFileSync(path.join(DATABASE_PKG, '.env'), 'utf8');
  const m = /^DATABASE_URL="?([^"\n\r]+)"?/m.exec(env);
  if (!m) throw new Error('No DATABASE_URL in packages/database/.env');
  const url = new URL(m[1]);

  // A guard, not a formality: this file drops and truncates schemas.
  const host = url.hostname.toLowerCase();
  if (!['localhost', '127.0.0.1', '::1'].includes(host)) {
    throw new Error(
      `Refusing to run the simulation against a non-local host (${host}). It truncates tables.`
    );
  }
  return url;
}

/**
 * `connection_limit` is set deliberately.
 *
 * `lib/database.ts` appends `connection_limit=1` when the URL does not already
 * carry one — correct for Vercel's isolates, fatal here: it would serialise the
 * concurrency scenarios at the pool and they would pass without ever racing.
 */
export function simUrl(): string {
  const url = devUrl();
  url.pathname = `/${SIM_DB_NAME}`;
  url.searchParams.set('connection_limit', '16');
  url.searchParams.set('pool_timeout', '20');
  return url.toString();
}

/**
 * Provision the scratch database and apply the committed migrations, then point
 * `DATABASE_URL` at it so the engine's own Prisma singleton picks it up.
 *
 * Running the real migration folder rather than `prisma db push` is the point:
 * it proves the migrations build a working schema from nothing. That is the
 * check that would have caught the 42P17 immutable-index failure locally
 * instead of in a production deploy.
 */
export async function prepareDatabase(opts: { migrate?: boolean } = {}): Promise<void> {
  const admin = devUrl();
  admin.pathname = '/postgres';

  const client = new PrismaClient({ datasources: { db: { url: admin.toString() } } });
  try {
    const rows = await client.$queryRawUnsafe<Array<{ datname: string }>>(
      'SELECT datname FROM pg_database WHERE datname = $1',
      SIM_DB_NAME
    );
    if (rows.length === 0) {
      // CREATE DATABASE takes an identifier, not a bind parameter, so the name
      // is validated rather than escaped.
      if (!/^[a-z_][a-z0-9_]*$/.test(SIM_DB_NAME)) {
        throw new Error(`Unsafe database name: ${SIM_DB_NAME}`);
      }
      await client.$executeRawUnsafe(`CREATE DATABASE "${SIM_DB_NAME}"`);
    }
  } finally {
    await client.$disconnect();
  }

  process.env.DATABASE_URL = simUrl();

  if (opts.migrate !== false) {
    writeFileSync(path.join(DATABASE_PKG, '.env.sim'), `DATABASE_URL="${simUrl()}"\n`);

    // Invoke Prisma's JS entry point through node rather than shelling out to
    // `npx`: spawnSync raises EINVAL for .cmd shims on Windows unless a shell is
    // involved, and running through a shell would mean quoting a connection
    // string on the command line.
    execFileSync(
      process.execPath,
      [
        path.join(REPO_ROOT, 'node_modules', 'prisma', 'build', 'index.js'),
        'migrate',
        'deploy',
        '--schema',
        path.join(DATABASE_PKG, 'prisma', 'schema.prisma'),
      ],
      {
        cwd: DATABASE_PKG,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, DATABASE_URL: simUrl() },
      }
    );
  }
}

/**
 * Empty every table between scenarios.
 *
 * TRUNCATE ... CASCADE over the live table list, rather than deleting models in
 * dependency order: the schema has enough self-referential foreign keys —
 * ancestry, ownership, admin hierarchy — that a hand-maintained order is a
 * reliable source of silent partial resets, and a scenario inheriting rows from
 * its predecessor is the worst possible failure mode for a simulation.
 */
export async function resetData(prisma: PrismaClient): Promise<void> {
  const tables = await prisma.$queryRawUnsafe<Array<{ tablename: string }>>(
    `SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`
  );
  if (tables.length === 0) return;
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}
