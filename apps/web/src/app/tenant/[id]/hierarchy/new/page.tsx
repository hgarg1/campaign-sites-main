'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { TenantLayout } from '@/components/tenant/shared';

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export default function NewChildOrgPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.id as string;

  const [canCreate, setCanCreate] = useState<boolean | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManual, setSlugManual] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    globalThis.fetch(`/api/tenant/${orgId}/hierarchy`)
      .then(r => r.ok ? r.json() : null)
      .then(data => setCanCreate(data?.tree?.canCreateChildren ?? false))
      .catch(() => setCanCreate(false));
  }, [orgId]);

  useEffect(() => {
    if (!slugManual) {
      setSlug(slugify(name));
    }
  }, [name, slugManual]);

  const validateSlug = (value: string) => {
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(value) && value.length > 1) {
      return 'Slug must be lowercase letters, numbers, and hyphens only (no leading/trailing hyphens)';
    }
    if (value.length === 1 && !/^[a-z0-9]$/.test(value)) {
      return 'Slug must start with a letter or number';
    }
    return null;
  };

  const handleSlugChange = (val: string) => {
    setSlugManual(true);
    const lower = val.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSlug(lower);
    setSlugError(validateSlug(lower));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ve = validateSlug(slug);
    if (ve) { setSlugError(ve); return; }
    setSubmitting(true);
    setError(null);
    try {
      const res = await globalThis.fetch(`/api/tenant/${orgId}/children`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string; message?: string }).error || (body as { error?: string; message?: string }).message || `HTTP ${res.status}`);
      }
      router.push(`/tenant/${orgId}/hierarchy`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  if (canCreate === null) {
    return (
      <TenantLayout title="Create Child Organization" orgId={orgId}>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </TenantLayout>
    );
  }

  if (canCreate === false) {
    return (
      <TenantLayout title="Create Child Organization" orgId={orgId}>
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <span className="text-4xl mb-3 block">🚫</span>
          <h2 className="text-xl font-bold text-red-700 mb-2">Permission Denied</h2>
          <p className="text-red-600 text-sm mb-4">Your organization does not have permission to create child organizations.</p>
          <Link href={`/tenant/${orgId}/hierarchy`} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            ← Back to Hierarchy
          </Link>
        </div>
      </TenantLayout>
    );
  }

  return (
    <TenantLayout title="Create Child Organization" orgId={orgId}>
      <div className="max-w-xl">
        <Link href={`/tenant/${orgId}/hierarchy`} className="text-sm text-blue-600 hover:text-blue-700 font-medium mb-6 inline-block">
          ← Back to Hierarchy
        </Link>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">New Child Organization</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder="e.g. State Republican Party"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={slug}
                onChange={e => handleSlugChange(e.target.value)}
                required
                placeholder="e.g. state-republican-party"
                className={`${inputClass} ${slugError ? 'border-red-400 focus:ring-red-500' : ''}`}
              />
              {slugError && <p className="text-xs text-red-600 mt-1">{slugError}</p>}
              <p className="text-xs text-gray-500 mt-1">Lowercase letters, numbers, and hyphens only. Auto-generated from name.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-gray-400 font-normal">(optional)</span></label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                placeholder="Brief description of this organization..."
                className={inputClass}
              />
            </div>

            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting || !name || !slug || !!slugError}
                className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {submitting && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                {submitting ? 'Creating...' : 'Create Organization'}
              </button>
              <Link href={`/tenant/${orgId}/hierarchy`} className="bg-white border border-gray-300 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50">
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </TenantLayout>
  );
}
