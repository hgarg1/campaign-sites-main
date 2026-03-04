'use client';

import { useState } from 'react';
import { FilterBar } from '../shared/FilterBar';
import { DateRangePicker } from '../shared/DateRangePicker';
import { motion } from 'framer-motion';

interface UserFiltersProps {
  onSearch?: (query: string) => void;
  onFilterChange?: (filters: Record<string, string>) => void;
}

export function UserFilters({ onSearch, onFilterChange }: UserFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [createdRange, setCreatedRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [lastLoginRange, setLastLoginRange] = useState<{ start: string; end: string }>({ start: '', end: '' });

  const roleOptions = [
    { id: 'user', label: 'User', value: 'USER' },
    { id: 'admin', label: 'Admin', value: 'ADMIN' },
    { id: 'global_admin', label: 'Global Admin', value: 'GLOBAL_ADMIN' },
  ];

  const statusOptions = [
    { id: 'active', label: 'Active', value: 'active' },
    { id: 'suspended', label: 'Suspended', value: 'suspended' },
    { id: 'deleted', label: 'Deleted', value: 'deleted' },
  ];

  const activityOptions = [
    { id: 'active_month', label: 'Active This Month', value: 'active_month' },
    { id: 'active_week', label: 'Active This Week', value: 'active_week' },
    { id: 'dormant', label: 'Dormant (90+ days)', value: 'dormant' },
  ];

  return (
    <div className="space-y-4 mb-6">
      <FilterBar
        placeholder="Search by email or name..."
        onSearch={onSearch}
        onFilterChange={onFilterChange}
        filters={[
          {
            key: 'role',
            label: 'Role',
            options: roleOptions,
          },
          {
            key: 'status',
            label: 'Status',
            options: statusOptions,
          },
          {
            key: 'activity',
            label: 'Activity',
            options: activityOptions,
          },
        ]}
      />

      {/* Advanced Filters Toggle */}
      <motion.button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
      >
        <span>{showAdvanced ? '▼' : '▶'}</span>
        <span>Advanced Filters</span>
      </motion.button>

      {/* Advanced Filters Section */}
      {showAdvanced && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200"
        >
          <DateRangePicker
            label="Created Date"
            onRangeChange={(start, end) => {
              setCreatedRange({ start, end });
              onFilterChange?.({
                createdDateStart: start,
                createdDateEnd: end,
              });
            }}
          />

          <DateRangePicker
            label="Last Login"
            onRangeChange={(start, end) => {
              setLastLoginRange({ start, end });
              onFilterChange?.({
                lastLoginStart: start,
                lastLoginEnd: end,
              });
            }}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Min Organizations
            </label>
            <input
              type="number"
              min="0"
              placeholder="0"
              onChange={(e) => {
                onFilterChange?.({
                  minOrganizations: e.target.value,
                });
              }}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Min Websites
            </label>
            <input
              type="number"
              min="0"
              placeholder="0"
              onChange={(e) => {
                onFilterChange?.({
                  minWebsites: e.target.value,
                });
              }}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </motion.div>
      )}
    </div>
  );
}
