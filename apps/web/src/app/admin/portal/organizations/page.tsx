'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/shared';
import { OrganizationsTable, OrganizationFilters } from '@/components/admin/organizations';
import { useOrganizations, Organization } from '@/hooks/useOrganizations';

export default function OrganizationsPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<{
    whiteLabel?: boolean;
    status?: string;
    search?: string;
  }>({});

  const { data, loading, pagination, setPage } = useOrganizations({
    ...filters,
    pageSize: 20,
  });

  const handleFilterChange = useCallback((newFilters: typeof filters) => {
    setFilters(newFilters);
  }, []);

  const handleRowClick = useCallback((org: Organization) => {
    router.push(`/admin/portal/organizations/${org.id}`);
  }, [router]);

  return (
    <AdminLayout
      title="Organizations"
      subtitle="Manage organizations and memberships"
    >
      <div className="space-y-6">
        {/* Filters */}
        <OrganizationFilters onFilterChange={handleFilterChange} />

        {/* Organizations Table */}
        <OrganizationsTable
          data={data}
          onRowClick={handleRowClick}
          loading={loading}
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
