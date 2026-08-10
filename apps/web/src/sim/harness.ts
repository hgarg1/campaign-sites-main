/**
 * Scenario harness.
 *
 * Deliberately not jest: the simulation needs a real database, sequential
 * execution with a truncate between cases, a seeded random source shared across
 * property runs, and a report that distinguishes a failed *assertion* from a
 * failed *invariant*. Those are different kinds of news — an assertion says a
 * specific case behaves wrongly, an invariant says something is wrong that no
 * one wrote a case for.
 */

export type Severity = 'assertion' | 'invariant' | 'crash';

export interface Failure {
  scenario: string;
  severity: Severity;
  message: string;
  detail?: string;
}

export interface ScenarioResult {
  name: string;
  group: string;
  ms: number;
  failures: Failure[];
  notes: string[];
  checks: number;
}

export interface Ctx {
  /** Assert a condition. `detail` is printed only on failure. */
  check(label: string, condition: boolean, detail?: string): void;
  /** Assert equality with a readable diff. */
  eq<T>(label: string, actual: T, expected: T): void;
  /** Assert that a promise rejects, optionally matching the message. */
  rejects(label: string, p: Promise<unknown>, match?: RegExp): Promise<void>;
  /** Record something worth reading in the report even when everything passes. */
  note(text: string): void;
  /** An invariant breach — reported separately from an expected-value miss. */
  violation(label: string, detail?: string): void;
  rng: Rng;
}

export interface Scenario {
  group: string;
  name: string;
  run: (ctx: Ctx) => Promise<void>;
}

const registry: Scenario[] = [];

export function scenario(group: string, name: string, run: (ctx: Ctx) => Promise<void>): void {
  registry.push({ group, name, run });
}

export function scenarios(): Scenario[] {
  return registry;
}

/**
 * Seeded xorshift128. Deterministic so a failing property run can be replayed
 * from its seed alone — a fuzz failure that cannot be reproduced is barely a
 * finding.
 */
export class Rng {
  private a: number;
  private b: number;
  private c: number;
  private d: number;

  constructor(readonly seed: number) {
    this.a = seed | 0 || 0x9e3779b9;
    this.b = (seed * 0x85ebca6b) | 0 || 0x243f6a88;
    this.c = (seed * 0xc2b2ae35) | 0 || 0xb7e15162;
    this.d = (seed * 0x27d4eb2f) | 0 || 0x9e3779b1;
  }

  next(): number {
    let t = this.a ^ (this.a << 11);
    this.a = this.b;
    this.b = this.c;
    this.c = this.d;
    this.d = (this.d ^ (this.d >>> 19) ^ (t ^ (t >>> 8))) | 0;
    return (this.d >>> 0) / 0x100000000;
  }

  int(minInclusive: number, maxInclusive: number): number {
    return minInclusive + Math.floor(this.next() * (maxInclusive - minInclusive + 1));
  }

  pick<T>(items: readonly T[]): T {
    return items[this.int(0, items.length - 1)];
  }

  bool(pTrue = 0.5): boolean {
    return this.next() < pTrue;
  }

  /** Fisher-Yates, in place. */
  shuffle<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i -= 1) {
      const j = this.int(0, i);
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }
}

function show(v: unknown): string {
  if (typeof v === 'string') return JSON.stringify(v);
  if (v instanceof Date) return v.toISOString();
  if (v && typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export function makeCtx(name: string, group: string, rng: Rng) {
  const failures: Failure[] = [];
  const notes: string[] = [];
  let checks = 0;

  const ctx: Ctx = {
    rng,
    check(label, condition, detail) {
      checks += 1;
      if (!condition) failures.push({ scenario: name, severity: 'assertion', message: label, detail });
    },
    eq(label, actual, expected) {
      checks += 1;
      if (!Object.is(actual, expected)) {
        failures.push({
          scenario: name,
          severity: 'assertion',
          message: label,
          detail: `expected ${show(expected)}, got ${show(actual)}`,
        });
      }
    },
    async rejects(label, p, match) {
      checks += 1;
      try {
        await p;
        failures.push({
          scenario: name,
          severity: 'assertion',
          message: label,
          detail: 'expected a rejection, but it resolved',
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (match && !match.test(msg)) {
          failures.push({
            scenario: name,
            severity: 'assertion',
            message: label,
            detail: `rejected with ${JSON.stringify(msg)}, expected to match ${match}`,
          });
        }
      }
    },
    note(text) {
      notes.push(text);
    },
    violation(label, detail) {
      checks += 1;
      failures.push({ scenario: name, severity: 'invariant', message: label, detail });
    },
  };

  return {
    ctx,
    finish(ms: number): ScenarioResult {
      return { name, group, ms, failures, notes, checks };
    },
    crash(e: unknown, ms: number): ScenarioResult {
      const err = e instanceof Error ? e : new Error(String(e));
      failures.push({
        scenario: name,
        severity: 'crash',
        message: err.message,
        detail: (err.stack ?? '').split('\n').slice(1, 4).join('\n'),
      });
      return { name, group, ms, failures, notes, checks };
    },
  };
}
