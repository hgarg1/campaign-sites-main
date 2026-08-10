'use client';

import { useMemo, useState } from 'react';

/**
 * Allocates voting weight across co-owners.
 *
 * Replaces a JSON textarea. Stakes are entered as percentages because that is
 * how people think about ownership, and converted to basis points on submit —
 * the engine stores basis points so a three-way split can total exactly 100%.
 */

export interface OwnerRow {
  parentOrgId: string;
  orgName: string;
  stakeBps: number;
}

const TOTAL_BPS = 10000;

/** Largest-remainder even split, so the result always totals exactly 100%. */
function splitEven(n: number): number[] {
  if (n <= 0) return [];
  const base = Math.floor(TOTAL_BPS / n);
  const remainder = TOTAL_BPS - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < remainder ? 1 : 0));
}

export function StakeAllocationEditor({
  owners,
  onChange,
}: {
  owners: OwnerRow[];
  onChange: (stakes: Array<{ parentOrgId: string; stakeBps: number }>) => void;
}) {
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(owners.map((o) => [o.parentOrgId, o.stakeBps]))
  );

  const total = useMemo(
    () => Object.values(values).reduce((sum, v) => sum + (Number.isFinite(v) ? v : 0), 0),
    [values]
  );
  const balanced = total === TOTAL_BPS;

  function update(next: Record<string, number>) {
    setValues(next);
    onChange(
      owners.map((o) => ({ parentOrgId: o.parentOrgId, stakeBps: next[o.parentOrgId] ?? 0 }))
    );
  }

  function setOne(orgId: string, percent: string) {
    // Percent in, basis points out — 12.5% becomes 1250, exactly.
    const parsed = Math.round(Number(percent) * 100);
    update({ ...values, [orgId]: Number.isFinite(parsed) ? Math.max(0, parsed) : 0 });
  }

  function distributeEvenly() {
    const split = splitEven(owners.length);
    update(Object.fromEntries(owners.map((o, i) => [o.parentOrgId, split[i]])));
  }

  function giveRemainderTo(orgId: string) {
    const others = total - (values[orgId] ?? 0);
    update({ ...values, [orgId]: Math.max(0, TOTAL_BPS - others) });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">Voting stake per owner</label>
        <button
          type="button"
          onClick={distributeEvenly}
          className="text-xs text-brand hover:underline"
        >
          Split evenly
        </button>
      </div>

      <div className="border rounded-lg divide-y">
        {owners.map((o) => (
          <div key={o.parentOrgId} className="flex items-center gap-3 px-3 py-2">
            <span className="flex-1 truncate text-sm text-gray-900">{o.orgName}</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={100}
                step="0.01"
                aria-label={`Stake for ${o.orgName}, percent`}
                value={((values[o.parentOrgId] ?? 0) / 100).toString()}
                onChange={(e) => setOne(o.parentOrgId, e.target.value)}
                className="w-24 rounded border px-2 py-1 text-right text-sm"
              />
              <span className="text-sm text-gray-500">%</span>
            </div>
            {!balanced && (
              <button
                type="button"
                onClick={() => giveRemainderTo(o.parentOrgId)}
                className="text-xs text-brand hover:underline whitespace-nowrap"
                title="Give this owner whatever is left over"
              >
                take rest
              </button>
            )}
          </div>
        ))}
      </div>

      <div
        className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
          balanced ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-900'
        }`}
        role="status"
      >
        <span>Total</span>
        <span className="font-medium tabular-nums">
          {(total / 100).toFixed(2)}%
          {!balanced && (
            <span className="ml-2 font-normal">
              — {total > TOTAL_BPS ? 'over' : 'under'} by{' '}
              {(Math.abs(TOTAL_BPS - total) / 100).toFixed(2)}%
            </span>
          )}
        </span>
      </div>

      <p className="text-xs text-gray-500">
        Reallocating stake normally needs every owner&apos;s approval, since it changes how much
        each owner&apos;s vote counts. An owner set to 0% keeps a seat and still counts where a rule
        requires everyone to approve, but carries no weight in a stake-based vote.
      </p>
    </div>
  );
}
