'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface WebsiteFiltersProps {
  onFilterChange: (filters: {
    status?: string;
    organizationId?: string;
    search?: string;
  }) => void;
  organizations?: { id: string; name: string }[];
}

export function WebsiteFilters({ onFilterChange, organizations = [] }: WebsiteFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [organizationId, setOrganizationId] = useState<string>('');

  const handleSearchChange = (value: string) => {
    setSearch(value);
    applyFilters({ search: value });
  };

  const handleStatusChange = (value: string) => {
    setStatus(value);
    applyFilters({ status: value });
  };

  const handleOrganizationChange = (value: string) => {
    setOrganizationId(value);
    applyFilters({ organizationId: value });
  };

  const applyFilters = ({ search: s, status: st, organizationId: org }: { search?: string; status?: string; organizationId?: string }) => {
    const filters: { status?: string; organizationId?: string; search?: string } = {};

    const searchValue = s !== undefined ? s : search;
    const statusValue = st !== undefined ? st : status;
    const orgValue = org !== undefined ? org : organizationId;

    if (searchValue) filters.search = searchValue;
    if (statusValue) filters.status = statusValue;
    if (orgValue) filters.organizationId = orgValue;

    onFilterChange(filters);
  };

  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setOrganizationId('');
    onFilterChange({});
  };

  const hasActiveFilters = search || status || organizationId;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search
          </label>
          <input
            type="text"
            placeholder="Search by name, slug, or domain..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Advanced Filters Toggle */}
        <div className="flex items-end">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="px-6 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            {showAdvanced ? 'Hide' : 'Show'} Advanced Filters
          </button>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="px-6 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All</option>
              <option value="DRAFT">Draft</option>
              <option value="BUILDING">Building</option>
              <option value="AUDITING">Auditing</option>
              <option value="DEPLOYING">Deploying</option>
              <option value="PUBLISHED">Published</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          {/* Organization Filter */}
          {organizations.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Organization
              </label>
              <select
                value={organizationId}
                onChange={(e) => handleOrganizationChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Organizations</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
