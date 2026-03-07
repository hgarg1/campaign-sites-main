'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { TenantLayout } from '@/components/tenant/shared';
import { useTenantWebsite } from '@/hooks/useTenantWebsites';

function StatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    PUBLISHED: 'bg-green-100 text-green-700',
    DRAFT: 'bg-yellow-100 text-yellow-700',
    BUILDING: 'bg-blue-100 text-blue-700',
    AUDITING: 'bg-blue-100 text-blue-700',
    DEPLOYING: 'bg-blue-100 text-blue-700',
    FAILED: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${classes[status] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}

export default function WebsiteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.id as string;
  const websiteId = params.websiteId as string;

  const { data: website, loading, updateWebsite, triggerRebuild, deleteWebsite, publish, unpublish } = useTenantWebsite(orgId, websiteId);

  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [saving, setSaving] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  if (website && !initialized) {
    setName(website.name);
    setDomain(website.domain || '');
    setInitialized(true);
  }

  const handleSave = async () => {
    setSaving(true); setMsg(null); setErr(null);
    try {
      await updateWebsite({ name, domain: domain || null });
      setMsg('Saved successfully.');
      setTimeout(() => setMsg(null), 3000);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleRebuild = async () => {
    if (!confirm('Trigger a rebuild for this website?')) return;
    setRebuilding(true);
    try { await triggerRebuild(); } catch {} finally { setRebuilding(false); }
  };

  const handleTogglePublish = async () => {
    setToggling(true);
    try {
      if (website?.status === 'PUBLISHED') {
        await unpublish();
      } else {
        await publish();
      }
    } catch {} finally {
      setToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this website? This cannot be undone.')) return;
    if (prompt('Type DELETE to confirm:') !== 'DELETE') return;
    await deleteWebsite();
    router.push(`/tenant/${orgId}/websites`);
  };

  const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  if (loading) {
    return (
      <TenantLayout title="Loading..." orgId={orgId}>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </TenantLayout>
    );
  }

  if (!website) {
    return (
      <TenantLayout title="Not Found" orgId={orgId}>
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-600">Website not found</p>
          <button onClick={() => router.push(`/tenant/${orgId}/websites`)} className="mt-4 text-blue-600 hover:text-blue-700 font-medium">
            ← Back to Websites
          </button>
        </div>
      </TenantLayout>
    );
  }

  return (
    <TenantLayout title={website.name} subtitle="Website Details" orgId={orgId}>
      <button onClick={() => router.push(`/tenant/${orgId}/websites`)} className="mb-6 text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2 text-sm">
        ← Back to Websites
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{website.name}</h2>
                <p className="text-sm text-gray-500">Slug: {website.slug}</p>
                {website.domain && <p className="text-sm text-gray-500">Domain: {website.domain}</p>}
              </div>
              <StatusBadge status={website.status} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Website</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Custom Domain</label>
                <input type="text" value={domain} onChange={e => setDomain(e.target.value)} className={inputClass} placeholder="e.g. www.mycampaign.com" />
              </div>
              {msg && <p className="text-sm text-green-700">{msg}</p>}
              {err && <p className="text-sm text-red-700">{err}</p>}
              <button onClick={handleSave} disabled={saving} className="bg-blue-600 text-white hover:bg-blue-700 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-red-200 p-6">
            <h3 className="text-lg font-semibold text-red-700 mb-2">Danger Zone</h3>
            <p className="text-sm text-gray-600 mb-4">Permanently delete this website and all its content.</p>
            <button onClick={handleDelete} className="bg-red-600 text-white hover:bg-red-700 rounded-lg px-4 py-2 text-sm font-medium">
              Delete Website
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Status</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Current</span><StatusBadge status={website.status} /></div>
              <div className="flex justify-between"><span className="text-gray-600">Created</span><span className="font-medium">{new Date(website.createdAt).toLocaleDateString()}</span></div>
              {website.publishedAt && <div className="flex justify-between"><span className="text-gray-600">Published</span><span className="font-medium">{new Date(website.publishedAt).toLocaleDateString()}</span></div>}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Actions</h3>
            <div className="space-y-2">
              <button onClick={handleRebuild} disabled={rebuilding} className="w-full bg-blue-600 text-white hover:bg-blue-700 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50">
                {rebuilding ? 'Rebuilding...' : 'Rebuild'}
              </button>
              <button
                onClick={handleTogglePublish}
                disabled={toggling}
                className={`w-full rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 ${
                  website.status === 'PUBLISHED'
                    ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border border-yellow-200'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {toggling ? 'Processing...' : website.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Links</h3>
            <div className="space-y-2">
              <Link href={`/tenant/${orgId}/websites/${websiteId}/pages`} className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium">
                Manage Pages →
              </Link>
              <Link href={`/tenant/${orgId}/websites/${websiteId}/integrations`} className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium">
                Manage Integrations →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </TenantLayout>
  );
}