'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CostBreakdown } from '@/hooks/useAnalytics';

interface CostAnalyticsProps {
  data: CostBreakdown | null;
  loading: boolean;
  onPeriodChange: (period: 'day' | 'week' | 'month' | 'year') => void;
}

export function CostAnalytics({ data, loading, onPeriodChange }: CostAnalyticsProps) {
  const [selectedBreakdown, setSelectedBreakdown] = useState<'organization' | 'user' | 'website' | 'provider'>('organization');

  if (loading) {
    return <div className="animate-pulse bg-gray-200 h-96 rounded-lg" />;
  }

  if (!data) {
    return <div className="text-center py-8 text-gray-600">No cost data available</div>;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const topByOrg = [...(data.byOrganization ?? [])].sort((a, b) => b.cost - a.cost).slice(0, 5);
  const topByProvider = [...(data.byProvider ?? [])].sort((a, b) => b.cost - a.cost);

  const selectedData =
    selectedBreakdown === 'organization'
      ? topByOrg
      : selectedBreakdown === 'user'
        ? (data.byUser ?? []).slice(0, 5)
        : selectedBreakdown === 'website'
          ? (data.byWebsite ?? []).slice(0, 5)
          : topByProvider;

  const maxCost = Math.max(...selectedData.map((item) => ('cost' in item ? item.cost : 0)));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Period Selection */}
      <div className="flex flex-wrap gap-2">
        {(['day', 'week', 'month', 'year'] as const).map((period) => (
          <button
            key={period}
            onClick={() => onPeriodChange(period)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              data.period === period
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {period.charAt(0).toUpperCase() + period.slice(1)}
          </button>
        ))}
      </div>

      {/* Total Cost Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-8 text-white"
      >
        <div className="text-sm font-medium opacity-90">Total Cost ({data.period === 'day' ? 'Today' : `This ${data.period}`})</div>
        <div className="text-4xl font-bold mt-2">{formatCurrency(data.totalCost)}</div>
        <div className="text-sm opacity-75 mt-2">Infrastructure: {formatCurrency(data.infrastructure)}</div>
      </motion.div>

      {/* Cost Breakdown Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {topByProvider.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Cost by Provider</h3>
            <div className="space-y-3">
              {topByProvider.map((item) => (
                <div key={item.provider} className="flex items-center justify-between pb-3 border-b border-gray-100 last:border-0">
                  <div className="text-sm font-medium text-gray-700">{item.provider}</div>
                  <div className="text-sm font-semibold text-gray-900">{formatCurrency(item.cost)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Infrastructure</h3>
          <div className="text-3xl font-bold text-blue-600">{formatCurrency(data.infrastructure)}</div>
          <div className="text-sm text-gray-600 mt-2">
            {((data.infrastructure / data.totalCost) * 100).toFixed(1)}% of total
          </div>
        </div>
      </motion.div>

      {/* Breakdown Selection */}
      <div className="flex flex-wrap gap-2">
        {(['organization', 'user', 'website', 'provider'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setSelectedBreakdown(type)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              selectedBreakdown === type
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Top Breakdown View */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-lg border border-gray-200 p-6"
      >
        <h3 className="text-lg font-semibold mb-4">
          Top 5 by {selectedBreakdown.charAt(0).toUpperCase() + selectedBreakdown.slice(1)}
        </h3>

        <div className="space-y-4">
          {selectedData.map((item, index) => {
            const cost = 'cost' in item ? item.cost : 0;
            const percentage = (cost / maxCost) * 100;
            const name: string = 'organizationName' in item ? item.organizationName : 'userName' in item ? item.userName : 'websiteName' in item ? item.websiteName : item.provider;

            return (
              <div key={`${selectedBreakdown}-${index}`}>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="text-sm font-medium text-gray-700 truncate min-w-0 flex-1">{name}</div>
                  <div className="text-sm font-semibold text-gray-900 shrink-0">{formatCurrency(cost)}</div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-blue-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">{((cost / data.totalCost) * 100).toFixed(1)}% of total</div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
