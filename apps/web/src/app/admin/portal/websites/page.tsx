'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/shared';
import { WebsitesTable, WebsiteFilters } from '@/components/admin/websites';
import { useWebsites, Website } from '@/hooks/useWebsites';

export default function WebsitesPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<{
    status?: string;
    organizationId?: string;
    search?: string;
  }>({});

  const { data, loading, pagination, setPage } = useWebsites({
    ...filters,
    pageSize: 20,
  });

  const handleFilterChange = useCallback((newFilters: typeof filters) => {
    setFilters(newFilters);
  }, []);

  const handleRowClick = useCallback((website: Website) => {
    router.push(`/admin/portal/websites/${website.id}`);
  }, [router]);

  return (
    <AdminLayout
      title="Websites"
      subtitle="Manage websites and builds"
    >
      <div className="space-y-6">
        {/* Filters */}
        <WebsiteFilters onFilterChange={handleFilterChange} />

        {/* Websites Table */}
        <WebsitesTable
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
