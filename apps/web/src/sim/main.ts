/**
 * Governance simulation entry point.
 *
 *   pnpm --filter @campaignsites/web sim            # everything
 *   pnpm --filter @campaignsites/web sim -- --seed 42
 *   pnpm --filter @campaignsites/web sim -- --group Proxies
 *   pnpm --filter @campaignsites/web sim -- --no-migrate
 *
 * Import order is load-bearing. `@/lib/database` builds its Prisma singleton
 * from `process.env.DATABASE_URL` at module-init time, so every module that
 * reaches it — which is the entire engine — must be loaded only after
 * `prepareDatabase()` has pointed that variable at the scratch database. Static
 * imports would be hoisted above that call, so the engine is pulled in
 * dynamically below. This is the one file where that matters.
 */

import { prepareDatabase, resetData, SIM_DB_NAME } from './db';

interface Args {
  seed: number;
  group?: string;
  migrate: boolean;
  verbose: boolean;
}

function parseArgs(argv: string[]): Args {
  const out: Args = { seed: 20260810, migrate: true, verbose: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--seed') out.seed = Number(argv[++i]);
    else if (a === '--group') out.group = argv[++i];
    else if (a === '--no-migrate') out.migrate = false;
    else if (a === '--verbose' || a === '-v') out.verbose = true;
  }
  return out;
}

const RESET = '[0m';
const DIM = '[2m';
const RED = '[31m';
const GREEN = '[32m';
const YELLOW = '[33m';
const BOLD = '[1m';

function ms(n: number): string {
  return n < 1000 ? `${Math.round(n)}ms` : `${(n / 1000).toFixed(1)}s`;
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));

  process.stdout.write(`${BOLD}Governance simulation${RESET}\n`);
  process.stdout.write(`${DIM}database ${SIM_DB_NAME} · seed ${args.seed}${RESET}\n\n`);

  const t0 = Date.now();
  await prepareDatabase({ migrate: args.migrate });
  process.stdout.write(`${DIM}schema ready in ${ms(Date.now() - t0)}${RESET}\n\n`);

  // Everything below reaches the engine, so it loads after the env is set.
  const { scenarios, makeCtx, Rng } = await import('./harness');
  const { prisma } = await import('@/lib/database');
  await import('./scenarios-hierarchy');
  await import('./scenarios-core');
  await import('./scenarios-fuzz');
  const { resetCounter } = await import('./world');

  const all = scenarios().filter((s) => !args.group || s.group === args.group);
  if (all.length === 0) {
    process.stdout.write(`${RED}No scenarios matched --group ${args.group}${RESET}\n`);
    return 1;
  }

  const results = [];
  let currentGroup = '';

  for (const s of all) {
    if (s.group !== currentGroup) {
      currentGroup = s.group;
      process.stdout.write(`\n${BOLD}${currentGroup}${RESET}\n`);
    }

    await resetData(prisma);
    resetCounter();

    // One RNG per scenario, derived from the run seed and the scenario name, so
    // adding a scenario does not reshuffle every other scenario's draws.
    const localSeed =
      args.seed ^ [...s.name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);
    const { ctx, finish, crash } = makeCtx(s.name, s.group, new Rng(localSeed));

    const start = Date.now();
    let result;
    try {
      await s.run(ctx);
      result = finish(Date.now() - start);
    } catch (e) {
      result = crash(e, Date.now() - start);
    }
    results.push(result);

    const bad = result.failures.length > 0;
    const mark = bad ? `${RED}✗${RESET}` : `${GREEN}✓${RESET}`;
    process.stdout.write(
      `  ${mark} ${result.name} ${DIM}(${result.checks} checks, ${ms(result.ms)})${RESET}\n`
    );
    for (const n of result.notes) {
      process.stdout.write(`      ${DIM}${n}${RESET}\n`);
    }
    for (const f of result.failures) {
      const colour = f.severity === 'invariant' ? YELLOW : RED;
      process.stdout.write(`      ${colour}${f.severity}${RESET} ${f.message}\n`);
      if (f.detail) {
        for (const line of f.detail.split('\n')) {
          process.stdout.write(`        ${DIM}${line}${RESET}\n`);
        }
      }
    }
  }

  await prisma.$disconnect();

  const failures = results.flatMap((r) => r.failures);
  const checks = results.reduce((s, r) => s + r.checks, 0);
  const failedScenarios = results.filter((r) => r.failures.length > 0);

  process.stdout.write(`\n${BOLD}Summary${RESET}\n`);
  process.stdout.write(
    `  ${results.length - failedScenarios.length}/${results.length} scenarios · ` +
      `${checks} checks · ${ms(Date.now() - t0)}\n`
  );

  const byKind = {
    assertion: failures.filter((f) => f.severity === 'assertion').length,
    invariant: failures.filter((f) => f.severity === 'invariant').length,
    crash: failures.filter((f) => f.severity === 'crash').length,
  };

  if (failures.length === 0) {
    process.stdout.write(`  ${GREEN}no failures${RESET}\n`);
    return 0;
  }

  process.stdout.write(
    `  ${RED}${byKind.assertion} assertion${RESET} · ` +
      `${YELLOW}${byKind.invariant} invariant${RESET} · ` +
      `${RED}${byKind.crash} crash${RESET}\n`
  );
  process.stdout.write(`\n${DIM}Replay a failure with --seed ${args.seed}${RESET}\n`);
  return 1;
}

main().then(
  (code) => process.exit(code),
  (e) => {
    process.stderr.write(`${RED}simulation failed to start${RESET}\n${String(e?.stack ?? e)}\n`);
    process.exit(2);
  }
);
