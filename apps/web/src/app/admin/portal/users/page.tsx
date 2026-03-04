'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/shared';
import { UserFilters, UsersTable, BulkActionsToolbar } from '@/components/admin/users';
import { useUsers } from '@/hooks/useUsers';

export default function UsersPage() {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const pageSize = 20;

  const [filters, setFilters] = useState<{
    role?: string;
    status?: string;
    search?: string;
  }>({});

  const { data, loading, pagination, setPage } = useUsers({
    ...filters,
    pageSize,
  });

  const handleFilterChange = useCallback((newFilters: typeof filters) => {
    setFilters(newFilters);
    setPage(1);
  }, [setPage]);

  // Bulk operations
  const handleBulkSuspend = async (userIds: string[]): Promise<void> => {
    try {
      await Promise.all(
        userIds.map((id) =>
          fetch('/api/admin/users/suspend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: id }),
          })
        )
      );
      setSelectedIds([]);
      // Refetch users after action
    } catch (error) {
      console.error('Failed to suspend users:', error);
    }
  };

  const handleBulkUnsuspend = async (userIds: string[]): Promise<void> => {
    try {
      await Promise.all(
        userIds.map((id) =>
          fetch('/api/admin/users/unsuspend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: id }),
          })
        )
      );
      setSelectedIds([]);
    } catch (error) {
      console.error('Failed to unsuspend users:', error);
    }
  };

  const handleBulkDelete = async (userIds: string[]): Promise<void> => {
    try {
      await Promise.all(
        userIds.map((id) =>
          fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
        )
      );
      setSelectedIds([]);
    } catch (error) {
      console.error('Failed to delete users:', error);
    }
  };

  const handleExport = (userIds: string[]) => {
    const selectedUsers = data.filter((u) => userIds.includes(u.id));
    const csv = [
      ['ID', 'Email', 'Name', 'Role', 'Status', 'Organizations', 'Websites'],
      ...selectedUsers.map((u) => [
        u.id,
        u.email,
        u.name || '',
        u.role,
        u.status,
        u.organizationCount || 0,
        u.websiteCount || 0,
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout
      title="Users Management"
      subtitle="Manage system users and permissions"
    >
      <UserFilters
        onSearch={(search) => setFilters({ ...filters, search })}
        onFilterChange={(newFilters) => handleFilterChange(newFilters)}
      />

      <BulkActionsToolbar
        selectedCount={selectedIds.length}
        selectedUserIds={selectedIds}
        onSuspend={handleBulkSuspend}
        onUnsuspend={handleBulkUnsuspend}
        onDelete={handleBulkDelete}
        onExport={handleExport}
        onClearSelection={() => setSelectedIds([])}
      />

      <UsersTable
        data={data}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        loading={loading}
        pagination={pagination ? {
          currentPage: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onPageChange: setPage,
        } : undefined}
      />
    </AdminLayout>
  );
}
