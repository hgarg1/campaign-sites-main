'use client';

/**
 * Policy simulator.
 *
 * Answers whether an organization may take an action, and which layer decides,
 * without having to provoke a real 403 and read the logs.
 */

import { useState } from 'react';
import { AdminLayout } from '@/components/admin/shared';
import { Button } from '@/components/ui/Button';
import { TextField, SelectField } from '@/components/ui/Field';

const RESOURCES = [
  'members',
  'branding',
  'integrations',
  'websites',
  'settings',
  'governance',
  'hierarchy',
];

const ACTIONS = ['create', 'read', 'update', 'delete', 'publish', 'invite', 'propose'];

interface Gate {
  name: string;
  passed: boolean;
  detail: string;
  policyId?: string | null;
  policyName?: string | null;
  source?: string | null;
}

interface Result {
  organization: { id: string; name: string };
  query: { resource: string; action: string };
  allowed: boolean;
  decidedBy: string | null;
  gates: Gate[];
  effectiveRules: Array<{ resource: string; actions: string[]; allow: boolean }>;
  appliedPolicies: Array<{ id: string; name: string }>;
}

export default function PolicySimulatorPage() {
  const [orgId, setOrgId] = useState('');
  const [resource, setResource] = useState(RESOURCES[0]);
  const [action, setAction] = useState(ACTIONS[0]);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/admin/policies/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: orgId.trim(), resource, action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Simulation failed');
        return;
      }
      setResult(data);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminLayout
      title="Policy simulator"
      subtitle="Check whether an organization may take an action, and which layer decides"
    >
      <form onSubmit={run} className="mb-8 max-w-2xl space-y-4 rounded-xl border bg-white p-5">
        <TextField
          label="Organization ID"
          required
          value={orgId}
          onChange={(e) => setOrgId(e.target.value)}
          placeholder="cm..."
          hint="Copy it from the organizations list."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Resource"
            value={resource}
            onChange={(e) => setResource(e.target.value)}
          >
            {RESOURCES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </SelectField>
          <SelectField label="Action" value={action} onChange={(e) => setAction(e.target.value)}>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </SelectField>
        </div>
        <Button type="submit" variant="primary" loading={loading} disabled={!orgId.trim()}>
          Run simulation
        </Button>
      </form>

      {error && (
        <div role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="max-w-2xl space-y-6">
          <div
            className={`rounded-xl border-2 p-4 ${
              result.allowed ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
            }`}
          >
            <p
              className={`text-sm font-bold ${result.allowed ? 'text-green-900' : 'text-red-900'}`}
            >
              {result.organization.name} {result.allowed ? 'may' : 'may not'} {result.query.action}{' '}
              {result.query.resource}
            </p>
            {result.decidedBy && (
              <p className="mt-1 text-sm text-red-900">Decided by: {result.decidedBy}</p>
            )}
          </div>

          <section>
            <h2 className="mb-2 text-sm font-semibold text-gray-900">
              Each gate, in the order the request path evaluates them
            </h2>
            <ol className="divide-y rounded-lg border bg-white">
              {result.gates.map((g) => (
                <li key={g.name} className="flex items-start gap-3 px-4 py-3">
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 text-sm ${g.passed ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {g.passed ? '✓' : '✗'}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900">
                      {g.name}
                      <span className="sr-only">{g.passed ? ' passed' : ' blocked'}</span>
                    </div>
                    <div className="text-sm text-gray-600">{g.detail}</div>
                    {g.policyName && (
                      <div className="mt-0.5 text-xs text-gray-500">
                        Policy: {g.policyName}
                        {g.policyId && <span className="font-mono"> ({g.policyId})</span>}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {result.effectiveRules.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold text-gray-900">
                Everything else in force for this organization
              </h2>
              <ul className="divide-y rounded-lg border bg-white text-sm">
                {result.effectiveRules.map((r, i) => (
                  <li key={i} className="px-4 py-2">
                    <span className={r.allow ? 'text-green-700' : 'text-red-700'}>
                      {r.allow ? 'Allow' : 'Deny'}
                    </span>{' '}
                    <span className="text-gray-700">
                      {r.actions.join(', ')} on {r.resource}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
