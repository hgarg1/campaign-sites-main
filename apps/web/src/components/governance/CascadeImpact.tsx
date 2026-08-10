'use client';

/**
 * Shows what a status cascade will reach, before it runs.
 *
 * Intended to sit inside a confirmation, so the count is visible at the moment
 * of the decision rather than discovered afterwards.
 */

import { useEffect, useState } from 'react';

interface Row {
  id: string;
  name: string;
  status: string;
  reason?: string;
}

interface Preview {
  organization: { id: string; name: string };
  action: string;
  descendantCount: number;
  affected: Row[];
  untouched: Row[];
}

export function CascadeImpact({
  orgId,
  action,
}: {
  orgId: string;
  action: 'SUSPEND' | 'DEACTIVATE' | 'REACTIVATE';
}) {
  const [data, setData] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    setLoading(true);
    fetch(`/api/admin/organizations/${orgId}/cascade-preview?action=${action}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('failed'))))
      .then((d) => live && setData(d))
      .catch(() => live && setFailed(true))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [orgId, action]);

  if (loading) return <div className="skeleton h-10 rounded" />;

  // Never imply a cascade is small just because the preview failed to load.
  if (failed || !data) {
    return (
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
        Could not work out what this will affect. It may reach organizations beneath this one.
      </p>
    );
  }

  const verb = action.toLowerCase();

  if (data.affected.length === 0) {
    return (
      <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
        This affects <strong>{data.organization.name}</strong> only.
        {data.descendantCount > 0 &&
          ` Its ${data.descendantCount} descendant ${
            data.descendantCount === 1 ? 'organization is' : 'organizations are'
          } already in a state this would not change.`}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
        This will {verb} <strong>{data.organization.name}</strong> and cascade to{' '}
        <strong>
          {data.affected.length} other{' '}
          {data.affected.length === 1 ? 'organization' : 'organizations'}
        </strong>{' '}
        beneath it.
      </p>

      <details className="rounded-lg border">
        <summary className="cursor-pointer px-3 py-2 text-sm text-gray-700">
          Which organizations
        </summary>
        <ul className="max-h-48 divide-y overflow-y-auto border-t text-sm">
          {data.affected.map((d) => (
            <li key={d.id} className="flex justify-between gap-3 px-3 py-1.5">
              <span className="truncate text-gray-900">{d.name}</span>
              <span className="shrink-0 text-xs text-gray-500">{d.status.toLowerCase()}</span>
            </li>
          ))}
        </ul>
      </details>

      {data.untouched.length > 0 && (
        <details className="rounded-lg border">
          <summary className="cursor-pointer px-3 py-2 text-sm text-gray-500">
            {data.untouched.length} will not change
          </summary>
          <ul className="max-h-48 divide-y overflow-y-auto border-t text-sm">
            {data.untouched.map((d) => (
              <li key={d.id} className="px-3 py-1.5">
                <div className="truncate text-gray-700">{d.name}</div>
                <div className="text-xs text-gray-500">{d.reason}</div>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
