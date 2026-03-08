'use client';

import { motion } from 'framer-motion';
import { GrowthStats } from '@/hooks/useAnalytics';

interface GrowthMetricsProps {
  data: GrowthStats | null;
  loading: boolean;
}

export function GrowthMetrics({ data, loading }: GrowthMetricsProps) {
  if (loading) {
    return <div className="animate-pulse bg-gray-200 h-96 rounded-lg" />;
  }

  if (!data) {
    return <div className="text-center py-8 text-gray-600">No growth data available</div>;
  }

  const metrics = [
    { label: 'Users Growth', value: data.usersGrowth, color: 'bg-blue-100 text-blue-900' },
    { label: 'Orgs Growth', value: data.organizationsGrowth, color: 'bg-purple-100 text-purple-900' },
    { label: 'Websites Growth', value: data.websitesGrowth, color: 'bg-green-100 text-green-900' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Growth Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`${metric.color} rounded-lg p-6 border border-current border-opacity-20`}
          >
            <div className="text-sm font-medium opacity-75">{metric.label}</div>
            <div className="text-3xl font-bold mt-2">
              {metric.value >= 0 ? '+' : ''}{metric.value}%
            </div>
          </motion.div>
        ))}
      </div>

      {/* Growth Chart */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-lg border border-gray-200 p-6"
      >
        <h3 className="text-lg font-semibold mb-4">Growth Trend (30 days)</h3>
        
        {/* Simple ASCII chart visualization */}
        <div className="space-y-4">
          {data.metrics.slice(-7).map((metric, index) => {
            const maxValue = Math.max(
              ...data.metrics.map(m => Math.max(m.users, m.organizations, m.websites))
            );
            const userWidth = (metric.users / maxValue) * 100;
            const orgWidth = (metric.organizations / maxValue) * 100;
            const websiteWidth = (metric.websites / maxValue) * 100;

            return (
              <div key={metric.date}>
                <div className="text-xs font-medium text-gray-600 mb-2">
                  {new Date(metric.date).toLocaleDateString()}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-10 shrink-0 text-xs text-gray-600">Users</div>
                    <div className="flex-1 min-w-0 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${userWidth}%` }}
                      />
                    </div>
                    <div className="w-10 shrink-0 text-xs text-right text-gray-600">{metric.users}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-10 shrink-0 text-xs text-gray-600">Orgs</div>
                    <div className="flex-1 min-w-0 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-purple-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${orgWidth}%` }}
                      />
                    </div>
                    <div className="w-10 shrink-0 text-xs text-right text-gray-600">{metric.organizations}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-10 shrink-0 text-xs text-gray-600">Sites</div>
                    <div className="flex-1 min-w-0 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-green-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${websiteWidth}%` }}
                      />
                    </div>
                    <div className="w-10 shrink-0 text-xs text-right text-gray-600">{metric.websites}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
