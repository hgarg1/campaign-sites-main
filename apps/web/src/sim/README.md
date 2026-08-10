# Governance simulation

Drives the real governance engine against a real PostgreSQL database and checks
that the guarantees the design makes actually hold.

```bash
pnpm --filter @campaignsites/web sim                      # everything
pnpm --filter @campaignsites/web sim -- --group Hierarchy  # one group
pnpm --filter @campaignsites/web sim -- --seed 777         # a different draw
pnpm --filter @campaignsites/web sim -- --no-migrate        # skip schema setup
```

## Why it exists rather than more unit tests

The unit suite already covers the arithmetic — thresholds, largest-remainder
stake splitting, policy validation. What it cannot cover is the part that
actually broke: transactions, `updateMany` status guards, partial unique
indexes, closure-table maintenance, cascade semantics. Those only exist in
PostgreSQL, and a mocked Prisma tests the mock.

It found four real bugs on its first run, three of them in shipped code:

- **`insertAncestry` wrote nothing when the parent had no self-link.** A root
  organization is created without a parent, so nothing ever seeded its
  `(root, root, 0)` row — which made "ancestors of the parent" empty, made the
  cross product empty, and made the whole call a silent no-op. Every child of a
  root had no ancestry to it. Suspending a root cascaded to nobody,
  `getDescendantIds` returned an empty list, and the national-tenant resolver
  could never find a party committee, so tie-breaking never engaged at all.
- **`createProposal` discarded two-thirds of a per-child rule.** It resolved the
  policy correctly and then overwrote `votingMode` and `rejectMode` from the
  global rule set one line later. Since `evaluateOutcome` branches on both, a
  child configured `SUPERMAJORITY 2/3` was judged `UNANIMOUS`, and one
  configured `MAJORITY_VETO` was judged `SINGLE_VETO` — which also made ties
  impossible to reach.
- **Re-admitting a removed parent restored its old stake**, handing back voting
  power without the `SET_OWNERSHIP_STAKES` proposal that is supposed to be the
  only way to change one.
- And one bug in the simulation itself, which is the point of writing the
  expectation down: a scenario asserted a 1% owner could veto a 99% owner *after*
  the 99% owner had already carried a stake majority. The engine was right.

## Layout

| File | What it does |
| --- | --- |
| `db.ts` | Provisions `campaignsites_sim` from the committed migrations. Refuses to run against a non-local host. |
| `world.ts` | Builds orgs, users, memberships, ownership edges and rules. Populates ancestry through the application's own `insertAncestry`, never by hand. |
| `harness.ts` | Scenario registry, assertions, seeded xorshift RNG. |
| `scenarios-hierarchy.ts` | The closure table, and the repair migration that rebuilds it. |
| `scenarios-core.ts` | Scripted governance cases: weighting, electorate, ties, self-amendment, proxies, concurrency. |
| `scenarios-fuzz.ts` | Property and chaos runs over randomly generated elections. |

## The three layers

**Scripted scenarios** state a claim the design makes and make the engine honour
it. Where a case exists because of a specific decision — "a suspended co-owner
keeps its vote", so that suspending whoever disagrees with you is not a way to
win a vote — the comment says which.

**Properties** run ~120 randomly generated elections per seed: random electorate
size, stake vector, policy and ballot order. They assert invariants rather than
outcomes:

- a terminal status is terminal
- approval never happens after it becomes arithmetically unreachable
- the org's status changed if and only if the proposal was approved
- an escalation to a tie-break requires full turnout, an assigned tie-breaker,
  and its own deadline
- no organization votes twice, and no result is announced twice
- frozen stakes never change for the life of a proposal
- with every stake at zero, a weighted tally agrees with a headcount tally —
  the compatibility guarantee behind shipping the stake column with no backfill

**Chaos** interleaves structural mutation with voting — removing owners,
suspending them, deactivating them, rewriting stakes mid-ballot — because
ownership is editable outside governance today, and asserts the outcome stays
coherent through it.

## Notes

- Generators are deliberately skewed. Drawing reject modes uniformly produced
  **zero** tie escalations in 120 elections, because `SINGLE_VETO` and `DERIVED`
  both make "everyone voted and nothing fired" unreachable by construction. The
  generator over-weights `WEIGHTED_VETO`, and the run fails if no election
  reaches the tie path — a branch that is never reached has not been tested.
- Every scenario gets its own RNG derived from the run seed and the scenario
  name, so adding a scenario does not reshuffle every other scenario's draws.
- `main.ts` imports the engine dynamically. `@/lib/database` builds its Prisma
  singleton from `DATABASE_URL` at module-init time, so it must load *after* the
  scratch database has been provisioned. Static imports would be hoisted above
  that.
- The sim database is truncated between scenarios and is never the developer's
  own. `db.ts` refuses any host that is not localhost.
