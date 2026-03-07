'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { TenantLayout } from '@/components/tenant/shared';
import { useTenantWebsitePages, TenantWebsitePage } from '@/hooks/useTenantWebsites';

export default function WebsitePagesPage() {
  const params = useParams();
  const orgId = params.id as string;
  const websiteId = params.websiteId as string;

  const { data, loading, updatePage } = useTenantWebsitePages(orgId, websiteId);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPath, setEditPath] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const startEdit = (page: TenantWebsitePage) => {
    setEditingId(page.id);
    setEditTitle(page.title);
    setEditPath(page.path);
    setMsg(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditPath('');
  };

  const handleSave = async (pageId: string) => {
    setSaving(true);
    try {
      await updatePage(pageId, { title: editTitle, path: editPath });
      setMsg('Page updated successfully.');
      setEditingId(null);
      setTimeout(() => setMsg(null), 3000);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <TenantLayout title="Pages" subtitle="Manage website pages" orgId={orgId}>
      <div className="mb-4 flex items-center gap-4">
        <Link href={`/tenant/${orgId}/websites/${websiteId}`} className="text-blue-600 hover:text-blue-700 font-medium text-sm">
          ← Back to Website
        </Link>
        {msg && <p className="text-sm text-green-700">{msg}</p>}
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : data.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
          No pages found for this website.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {data.map(page => (
              <div key={page.id}>
                <div
                  className={`flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors ${editingId === page.id ? 'bg-blue-50' : ''}`}
                  onClick={() => editingId === page.id ? cancelEdit() : startEdit(page)}
                >
                  <div>
                    <p className="font-medium text-gray-900">{page.title}</p>
                    <p className="text-xs text-gray-500">{page.path}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">{page.updatedAt ? new Date(page.updatedAt).toLocaleDateString() : ''}</span>
                    <button
                      onClick={e => { e.stopPropagation(); editingId === page.id ? cancelEdit() : startEdit(page); }}
                      className="text-blue-600 hover:text-blue-700 text-xs font-medium px-2 py-1 rounded border border-blue-200 hover:bg-blue-50"
                    >
                      {editingId === page.id ? 'Cancel' : 'Edit'}
                    </button>
                  </div>
                </div>

                {editingId === page.id && (
                  <div className="px-6 py-4 bg-blue-50 border-t border-blue-100">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Page Title</label>
                        <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Path</label>
                        <input type="text" value={editPath} onChange={e => setEditPath(e.target.value)} className={inputClass} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSave(page.id)}
                        disabled={saving}
                        className="bg-blue-600 text-white hover:bg-blue-700 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button onClick={cancelEdit} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </TenantLayout>
  );
}