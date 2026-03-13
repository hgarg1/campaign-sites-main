'use client';

import Link from 'next/link';
import { DataTable } from '../shared/DataTable';
import { Organization } from '@/hooks/useOrganizations';

interface OrganizationsTableProps {
  data: Organization[];
  onRowClick?: (org: Organization) => void;
  onSelectionChange?: (selectedIds: string[]) => void;
  selectable?: boolean;
  pagination?: {
    currentPage: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  loading?: boolean;
}

const statusColors = {
  active: { bg: 'bg-green-100', text: 'text-green-800' },
  suspended: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
};

export function OrganizationsTable({ 
  data, 
  onRowClick, 
  onSelectionChange, 
  selectable = false,
  pagination, 
  loading 
}: OrganizationsTableProps) {
  const columns = [
    {
      key: 'name' as const,
      label: 'Organization Name',
      sortable: true,
      render: (value: string, row: Organization) => (
        <div>
          <div className="font-semibold text-gray-900">{value}</div>
          <div className="text-xs text-gray-500">{row.slug}</div>
        </div>
      ),
    },
    {
      key: 'whiteLabel' as const,
      label: 'White Label',
      render: (value: boolean) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          value ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {value ? 'Yes' : 'No'}
        </span>
      ),
    },
    {
      key: 'memberCount' as const,
      label: 'Members',
      sortable: true,
      render: (value: number) => (
        <span className="text-gray-900">{value}</span>
      ),
    },
    {
      key: 'websiteCount' as const,
      label: 'Websites',
      sortable: true,
      render: (value: number) => (
        <span className="text-gray-900">{value}</span>
      ),
    },
    {
      key: 'status' as const,
      label: 'Status',
      sortable: true,
      render: (value: 'active' | 'suspended') => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          statusColors[value].bg
        } ${statusColors[value].text}`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      ),
    },
    {
      key: 'createdAt' as const,
      label: 'Created',
      sortable: true,
      render: (value: string) => (
        <span className="text-gray-600 text-sm">
          {new Date(value).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
      ),
    },
  ];

  const actions = (row: Organization) => (
    <Link
      href={`/admin/portal/organizations/${row.id}`}
      className="text-blue-600 hover:text-blue-700 font-medium"
    >
      View Details →
    </Link>
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      keyField="id"
      onRowClick={onRowClick}
      actions={actions}
      loading={loading}
      emptyMessage="No organizations found"
      selectable={selectable}
      onSelectionChange={onSelectionChange}
      pagination={pagination}
    />
  );
}
