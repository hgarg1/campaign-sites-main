'use client';

import { motion } from 'framer-motion';
import { UsageMetric } from '@/hooks/useAnalytics';

interface UsageAnalyticsProps {
  data: UsageMetric[];
  loading: boolean;
}

export function UsageAnalytics({ data, loading }: UsageAnalyticsProps) {
  if (loading) {
    return <div className="animate-pulse bg-gray-200 h-96 rounded-lg" />;
  }

  if (!data || data.length === 0) {
    return <div className="text-center py-8 text-gray-600">No usage data available</div>;
  }

  const latest = data[data.length - 1];
  const previous = data[data.length - 2] || latest;

  const calculateTrend = (current: number, previous: number) => {
    const change = ((current - previous) / previous) * 100;
    return change;
  };

  const metrics = [
    {
      label: 'Active Users',
      value: latest.dailyActiveUsers,
      icon: '👥',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      trend: calculateTrend(latest.dailyActiveUsers, previous.dailyActiveUsers),
    },
    {
      label: 'API Calls',
      value: latest.apiCalls.toLocaleString(),
      icon: '📡',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      trend: calculateTrend(latest.apiCalls, previous.apiCalls),
    },
    {
      label: 'Build Jobs',
      value: latest.buildJobs,
      icon: '🔨',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      trend: calculateTrend(latest.buildJobs, previous.buildJobs),
    },
    {
      label: 'Avg Build',
      value: `${(latest.averageBuildTime / 60).toFixed(1)}m`,
      icon: '⏱️',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      trend: calculateTrend(latest.averageBuildTime, previous.averageBuildTime),
    },
    {
      label: 'Success',
      value: `${latest.successRate}%`,
      icon: '✅',
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
      trend: calculateTrend(latest.successRate, previous.successRate),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`${metric.bgColor} rounded-lg p-4 border border-gray-200`}
          >
            <div className="flex items-start justify-between gap-1">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-gray-600 truncate">{metric.label}</div>
                <div className={`${metric.color} text-xl font-bold mt-1 truncate`}>{metric.value}</div>
                <div className={`text-xs mt-2 ${metric.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {metric.trend >= 0 ? '↑' : '↓'} {Math.abs(metric.trend).toFixed(1)}%
                </div>
              </div>
              <div className="text-xl shrink-0">{metric.icon}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Usage Timeline */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-lg border border-gray-200 p-6"
      >
        <h3 className="text-lg font-semibold mb-4">Activity Timeline (Last 7 Days)</h3>
        
        <div className="space-y-4">
          {data.slice(-7).map((metric, index) => {
            const maxApiCalls = Math.max(...data.map(m => m.apiCalls));
            const apiCallsWidth = (metric.apiCalls / maxApiCalls) * 100;

            return (
              <div key={metric.date} className="border-b border-gray-100 pb-4 last:border-0">
                <div className="flex items-center justify-between mb-2 gap-2">
                  <div className="text-sm font-medium shrink-0">
                    {new Date(metric.date).toLocaleDateString()}
                  </div>
                  <div className="text-sm text-gray-600 truncate">
                    {metric.dailyActiveUsers} DAU · {metric.buildJobs} jobs
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${apiCallsWidth}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {metric.apiCalls.toLocaleString()} API calls • {metric.successRate}% success
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
