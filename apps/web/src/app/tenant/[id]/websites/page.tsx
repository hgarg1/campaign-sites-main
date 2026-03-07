'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { TenantLayout } from '@/components/tenant/shared';
import { DataTable } from '@/components/admin/shared';
import { useTenantWebsites, TenantWebsite } from '@/hooks/useTenantWebsites';

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

export default function TenantWebsitesPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.id as string;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, loading, pagination, setPage, refetch } = useTenantWebsites(orgId, {
    pageSize: 20,
    search: search || undefined,
    status: statusFilter || undefined,
  });

  const handleRebuild = useCallback(async (websiteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/tenant/${orgId}/websites/${websiteId}/rebuild`, { method: 'POST' });
      refetch();
    } catch {}
  }, [orgId, refetch]);

  const handleDelete = useCallback(async (websiteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this website? This cannot be undone.')) return;
    setDeletingId(websiteId);
    try {
      await fetch(`/api/tenant/${orgId}/websites/${websiteId}`, { method: 'DELETE' });
      refetch();
    } finally {
      setDeletingId(null);
    }
  }, [orgId, refetch]);

  const columns = [
    { key: 'name' as keyof TenantWebsite, label: 'Name', sortable: true },
    {
      key: 'status' as keyof TenantWebsite, label: 'Status',
      render: (val: string) => <StatusBadge status={val} />,
    },
    {
      key: 'domain' as keyof TenantWebsite, label: 'Domain',
      render: (val: string | null) => val || '—',
    },
    {
      key: 'updatedAt' as keyof TenantWebsite, label: 'Last Updated',
      render: (val: string) => val ? new Date(val).toLocaleDateString() : '—',
    },
  ];

  return (
    <TenantLayout title="Websites" subtitle="Manage your campaign websites" orgId={orgId}>
      <div className="space-y-6">
        <div className="flex items-center gap-4 flex-wrap">
          <input
            type="text"
            placeholder="Search websites..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
          />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            {['DRAFT', 'BUILDING', 'AUDITING', 'DEPLOYING', 'PUBLISHED', 'FAILED'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <div className="ml-auto">
            <Link href={`/tenant/${orgId}/websites/new`} className="bg-blue-600 text-white hover:bg-blue-700 rounded-lg px-4 py-2 text-sm font-medium inline-block">
              + Create Website
            </Link>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={data}
          keyField="id"
          loading={loading}
          onRowClick={(w) => router.push(`/tenant/${orgId}/websites/${w.id}`)}
          emptyMessage="No websites found. Create your first website!"
          actions={(w) => (
            <>
              <Link
                href={`/tenant/${orgId}/websites/${w.id}`}
                className="text-blue-600 hover:text-blue-700 text-xs font-medium px-2 py-1 rounded border border-blue-200 hover:bg-blue-50"
                onClick={e => e.stopPropagation()}
              >
                Edit
              </Link>
              <button
                onClick={e => handleRebuild(w.id, e)}
                className="text-gray-600 hover:text-gray-900 text-xs font-medium px-2 py-1 rounded border border-gray-200 hover:bg-gray-50"
              >
                Rebuild
              </button>
              <button
                onClick={e => handleDelete(w.id, e)}
                disabled={deletingId === w.id}
                className="text-red-600 hover:text-red-700 text-xs font-medium px-2 py-1 rounded border border-red-200 hover:bg-red-50 disabled:opacity-50"
              >
                Delete
              </button>
            </>
          )}
          pagination={pagination ? {
            currentPage: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            onPageChange: setPage,
          } : undefined}
        />
      </div>
    </TenantLayout>
  );
}