'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/shared';
import { BatchActionsToolbar } from '@/components/admin/shared/BatchActionsToolbar';
import { OrganizationsTable, OrganizationFilters } from '@/components/admin/organizations';
import { useOrganizations, Organization } from '@/hooks/useOrganizations';
import { useToast } from '@/components/admin/shared/ToastContext';

export default function OrganizationsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [filters, setFilters] = useState<{
    whiteLabel?: boolean;
    status?: string;
    search?: string;
  }>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data, loading, pagination, setPage, refetch } = useOrganizations({
    ...filters,
    pageSize: 20,
  });

  const handleFilterChange = useCallback((newFilters: typeof filters) => {
    setFilters(newFilters);
  }, []);

  const handleRowClick = useCallback((org: Organization) => {
    router.push(`/admin/portal/organizations/${org.id}`);
  }, [router]);

  const handleBatchDelete = async (justification: string) => {
    const response = await fetch('/api/admin/organizations/batch/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orgIds: selectedIds,
        justification,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete organizations');
    }

    setSelectedIds([]);
    await refetch();
  };

  const handleBatchSuspend = async (justification: string) => {
    const response = await fetch('/api/admin/organizations/batch/suspend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orgIds: selectedIds,
        justification,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to suspend organizations');
    }

    setSelectedIds([]);
    await refetch();
  };

  return (
    <AdminLayout
      title="Organizations"
      subtitle="Manage organizations and memberships"
    >
      <div className="space-y-6">
        {/* Batch Actions Toolbar */}
        <BatchActionsToolbar
          selectedCount={selectedIds.length}
          onDelete={handleBatchDelete}
          onSuspend={handleBatchSuspend}
          onRefresh={() => refetch()}
        />

        {/* Filters */}
        <OrganizationFilters onFilterChange={handleFilterChange} />

        {/* Organizations Table */}
        <OrganizationsTable
          data={data}
          onRowClick={handleRowClick}
          onSelectionChange={setSelectedIds}
          loading={loading}
          selectable={true}
          pagination={pagination ? {
            currentPage: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            onPageChange: setPage,
          } : undefined}
        />
      </div>
    </AdminLayout>
  );
}
