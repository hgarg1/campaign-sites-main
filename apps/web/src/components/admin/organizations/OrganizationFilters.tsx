'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface OrganizationFiltersProps {
  onFilterChange: (filters: {
    whiteLabel?: boolean;
    status?: string;
    search?: string;
  }) => void;
}

export function OrganizationFilters({ onFilterChange }: OrganizationFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [search, setSearch] = useState('');
  const [whiteLabel, setWhiteLabel] = useState<string>('');
  const [status, setStatus] = useState<string>('');

  const handleSearchChange = (value: string) => {
    setSearch(value);
    applyFilters({ search: value });
  };

  const handleWhiteLabelChange = (value: string) => {
    setWhiteLabel(value);
    applyFilters({ whiteLabel: value });
  };

  const handleStatusChange = (value: string) => {
    setStatus(value);
    applyFilters({ status: value });
  };

  const applyFilters = ({ search: s, whiteLabel: wl, status: st }: { search?: string; whiteLabel?: string; status?: string }) => {
    const filters: { whiteLabel?: boolean; status?: string; search?: string } = {};

    const searchValue = s !== undefined ? s : search;
    const whiteLabelValue = wl !== undefined ? wl : whiteLabel;
    const statusValue = st !== undefined ? st : status;

    if (searchValue) filters.search = searchValue;
    if (whiteLabelValue) filters.whiteLabel = whiteLabelValue === 'true';
    if (statusValue) filters.status = statusValue;

    onFilterChange(filters);
  };

  const clearFilters = () => {
    setSearch('');
    setWhiteLabel('');
    setStatus('');
    onFilterChange({});
  };

  const hasActiveFilters = search || whiteLabel || status;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <label htmlFor="f469f63" className="block text-sm font-medium text-gray-700 mb-2">
            Search
          </label>
          <input id="f469f63"
            type="text"
            placeholder="Search by name or slug..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          />
        </div>

        {/* Advanced Filters Toggle */}
        <div className="flex items-end">
          <button type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="px-6 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            {showAdvanced ? 'Hide' : 'Show'} Advanced Filters
          </button>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <div className="flex items-end">
            <button type="button"
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
          transition={{ duration: 0.2 }}
          className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {/* White Label Filter */}
          <div>
            <label htmlFor="f469f109" className="block text-sm font-medium text-gray-700 mb-2">
              White Label
            </label>
            <select id="f469f109"
              value={whiteLabel}
              onChange={(e) => handleWhiteLabelChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All</option>
              <option value="true">White Label Only</option>
              <option value="false">Standard Only</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label htmlFor="f469f125" className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select id="f469f125"
              value={status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </motion.div>
      )}
    </div>
  );
}
