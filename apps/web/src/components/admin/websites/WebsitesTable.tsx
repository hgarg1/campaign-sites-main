'use client';

import Link from 'next/link';
import { DataTable } from '../shared/DataTable';
import { Website } from '@/hooks/useWebsites';

interface WebsitesTableProps {
  data: Website[];
  onRowClick?: (website: Website) => void;
  pagination?: {
    currentPage: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  loading?: boolean;
}

const statusColors = {
  DRAFT: { bg: 'bg-gray-100', text: 'text-gray-800' },
  BUILDING: { bg: 'bg-blue-100', text: 'text-blue-800' },
  AUDITING: { bg: 'bg-purple-100', text: 'text-purple-800' },
  DEPLOYING: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  PUBLISHED: { bg: 'bg-green-100', text: 'text-green-800' },
  FAILED: { bg: 'bg-red-100', text: 'text-red-800' },
};

export function WebsitesTable({ data, onRowClick, pagination, loading }: WebsitesTableProps) {
  const columns = [
    {
      key: 'name' as const,
      label: 'Website Name',
      sortable: true,
      render: (value: string, row: Website) => (
        <div>
          <div className="font-semibold text-gray-900">{value}</div>
          <div className="text-xs text-gray-500 font-mono">{row.slug}</div>
          {row.domain && <div className="text-xs text-blue-600 mt-1">{row.domain}</div>}
        </div>
      ),
    },
    {
      key: 'organization' as const,
      label: 'Organization',
      render: (value: Website['organization']) => (
        <div>
          <div className="text-gray-900">{value.name}</div>
          <div className="text-xs text-gray-500">{value.slug}</div>
        </div>
      ),
    },
    {
      key: 'owner' as const,
      label: 'Owner',
      render: (value: Website['owner']) => (
        <div>
          <div className="text-gray-900">{value.name || 'Unnamed'}</div>
          <div className="text-xs text-gray-500">{value.email}</div>
        </div>
      ),
    },
    {
      key: 'status' as const,
      label: 'Status',
      sortable: true,
      render: (value: Website['status']) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          statusColors[value].bg
        } ${statusColors[value].text}`}>
          {value}
        </span>
      ),
    },
    {
      key: 'publishedAt' as const,
      label: 'Published',
      sortable: true,
      render: (value: string | null) => (
        <span className="text-gray-600 text-sm">
          {value ? new Date(value).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }) : 'Not published'}
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

  const actions = (row: Website) => (
    <Link
      href={`/admin/portal/websites/${row.id}`}
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
      emptyMessage="No websites found"
      pagination={pagination}
    />
  );
}
