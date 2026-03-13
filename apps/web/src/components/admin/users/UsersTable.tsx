'use client';

import Link from 'next/link';
import { DataTable } from '../shared/DataTable';
import { motion } from 'framer-motion';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: 'USER' | 'ADMIN' | 'GLOBAL_ADMIN';
  status: 'active' | 'suspended' | 'deleted';
  organizationCount: number;
  websiteCount: number;
  createdAt: string;
  lastLogin?: string;
}

interface UsersTableProps {
  data: User[];
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  onRowClick?: (user: User) => void;
  pagination?: {
    currentPage: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  loading?: boolean;
}

const roleColors = {
  USER: { bg: 'bg-blue-100', text: 'text-blue-800' },
  ADMIN: { bg: 'bg-purple-100', text: 'text-purple-800' },
  GLOBAL_ADMIN: { bg: 'bg-red-100', text: 'text-red-800' },
};

const statusColors = {
  active: { bg: 'bg-green-100', text: 'text-green-800' },
  suspended: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  deleted: { bg: 'bg-gray-100', text: 'text-gray-800' },
};

export function UsersTable({ data, selectedIds = [], onSelectionChange, onRowClick, pagination, loading }: UsersTableProps) {
  const toggleRow = (userId: string) => {
    const newSelected = selectedIds.includes(userId)
      ? selectedIds.filter((id) => id !== userId)
      : [...selectedIds, userId];
    onSelectionChange?.(newSelected);
  };

  const columns: any[] = [
    {
      key: '__select__' as any,
      label: '✓',
      width: '50px',
      sortable: false,
      render: (_: any, row: User) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(row.id)}
          onChange={() => toggleRow(row.id)}
          className="w-4 h-4 rounded border-gray-300 cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      key: 'email' as const,
      label: 'Email',
      width: '25%',
      sortable: true,
      render: (value: string, row: User) => (
        <div>
          <p className="font-medium text-gray-900">{value}</p>
          <p className="text-xs text-gray-600">{row.name || 'No name'}</p>
        </div>
      ),
    },
    {
      key: 'role' as const,
      label: 'Role',
      width: '15%',
      sortable: true,
      render: (value: string) => (
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            roleColors[value as keyof typeof roleColors].bg
          } ${roleColors[value as keyof typeof roleColors].text}`}
        >
          {value}
        </span>
      ),
    },
    {
      key: 'status' as const,
      label: 'Status',
      width: '12%',
      sortable: true,
      render: (value: string) => (
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            statusColors[value as keyof typeof statusColors].bg
          } ${statusColors[value as keyof typeof statusColors].text}`}
        >
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      ),
    },
    {
      key: 'organizationCount' as const,
      label: 'Organizations',
      width: '10%',
      sortable: true,
    },
    {
      key: 'websiteCount' as const,
      label: 'Websites',
      width: '10%',
      sortable: true,
    },
    {
      key: 'createdAt' as const,
      label: 'Created',
      width: '15%',
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'lastLogin' as const,
      label: 'Last Login',
      width: '13%',
      sortable: true,
      render: (value?: string) => value ? new Date(value).toLocaleDateString() : 'Never',
    },
  ];

  const actions = (row: User) => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="flex gap-2"
    >
      <Link
        href={`/admin/portal/users/${row.id}`}
        className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
      >
        View
      </Link>
      <Link
        href={`/admin/portal/users/${row.id}?edit=true`}
        className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
      >
        Edit
      </Link>
    </motion.div>
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      keyField="id"
      actions={actions}
      onRowClick={onRowClick}
      loading={loading}
      emptyMessage="No users found"
      pagination={pagination}
    />
  );
}
