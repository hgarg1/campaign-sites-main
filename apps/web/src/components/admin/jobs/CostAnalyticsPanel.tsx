'use client';

import { motion } from 'framer-motion';
import { CostAnalytics } from '@/hooks/useBuildJobs';

interface CostAnalyticsPanelProps {
  analytics: CostAnalytics | null;
  loading: boolean;
}

export function CostAnalyticsPanel({ analytics, loading }: CostAnalyticsPanelProps) {
  if (loading || !analytics) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Analytics</h3>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  const formatCost = (cost: number) => `$${cost.toFixed(2)}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="bg-white rounded-xl border border-gray-200 p-6"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Cost Analytics</h3>
      
      {/* Time Period Costs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-700 font-medium mb-1">Today</p>
          <p className="text-2xl font-bold text-blue-900">{formatCost(analytics.today)}</p>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <p className="text-sm text-purple-700 font-medium mb-1">This Week</p>
          <p className="text-2xl font-bold text-purple-900">{formatCost(analytics.week)}</p>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm text-green-700 font-medium mb-1">This Month</p>
          <p className="text-2xl font-bold text-green-900">{formatCost(analytics.month)}</p>
        </div>

        <div className="bg-orange-50 p-4 rounded-lg">
          <p className="text-sm text-orange-700 font-medium mb-1">This Year</p>
          <p className="text-2xl font-bold text-orange-900">{formatCost(analytics.year)}</p>
        </div>
      </div>

      {/* By Provider */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">By Provider</h4>
        <div className="space-y-2">
          {analytics.byProvider.map((item, index) => (
            <motion.div
              key={item.provider}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <span className="text-sm font-medium text-gray-900 capitalize">{item.provider}</span>
              <span className="text-sm font-bold text-gray-900">{formatCost(item.cost)}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* By Organization */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Top Organizations by Cost</h4>
        <div className="space-y-2">
          {analytics.byOrganization.slice(0, 5).map((item, index) => (
            <motion.div
              key={item.organizationId}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <span className="text-sm font-medium text-gray-900">{item.organizationName}</span>
              <span className="text-sm font-bold text-gray-900">{formatCost(item.cost)}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
