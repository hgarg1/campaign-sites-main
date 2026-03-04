'use client';

import { motion } from 'framer-motion';
import { PerformanceMetrics } from '@/hooks/useMonitoring';

interface PerformanceMonitorProps {
  metrics: PerformanceMetrics | null;
  loading: boolean;
}

const performanceCategories = [
  {
    key: 'apiResponseTime' as const,
    label: 'API Response Time',
    description: 'HTTP request latency',
    icon: '🌐',
    color: 'blue' as const,
  },
  {
    key: 'databaseQueryTime' as const,
    label: 'Database Query Time',
    description: 'SQL query execution',
    icon: '🗄️',
    color: 'purple' as const,
  },
  {
    key: 'workerJobTime' as const,
    label: 'Worker Job Time',
    description: 'Background job processing',
    icon: '⚙️',
    color: 'green' as const,
  },
  {
    key: 'llmApiLatency' as const,
    label: 'LLM API Latency',
    description: 'AI provider response time',
    icon: '🤖',
    color: 'orange' as const,
  },
] as const;

const colorClasses = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', badge: 'bg-purple-100' },
  green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-100' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badge: 'bg-orange-100' },
};

function getLatencyStatus(p99: number): { label: string; color: string } {
  if (p99 < 100) return { label: 'Excellent', color: 'text-green-600' };
  if (p99 < 500) return { label: 'Good', color: 'text-blue-600' };
  if (p99 < 1000) return { label: 'Fair', color: 'text-yellow-600' };
  return { label: 'Poor', color: 'text-red-600' };
}

export function PerformanceMonitor({ metrics, loading }: PerformanceMonitorProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <div className="flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-gray-600">No performance metrics available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900">Performance Metrics</h3>
        <p className="text-sm text-gray-600 mt-1">Latency percentiles across system components</p>
      </div>

      {/* Metrics Grid */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {performanceCategories.map((category, index) => {
          const categoryMetrics = metrics[category.key];
          const colors = colorClasses[category.color as keyof typeof colorClasses];
          const status = getLatencyStatus(categoryMetrics.p99);

          return (
            <motion.div
              key={category.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className={`rounded-lg border-2 ${colors.border} ${colors.bg} p-6`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{category.icon}</div>
                  <div>
                    <h4 className={`font-semibold ${colors.text}`}>{category.label}</h4>
                    <p className="text-sm text-gray-600 mt-0.5">{category.description}</p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                  {status.label}
                </span>
              </div>

              {/* Percentile Metrics */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-xs font-medium text-gray-600 mb-1">P50 (Median)</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {categoryMetrics.p50}
                    <span className="text-sm font-normal text-gray-500 ml-1">ms</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-600 mb-1">P95</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {categoryMetrics.p95}
                    <span className="text-sm font-normal text-gray-500 ml-1">ms</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-600 mb-1">P99</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {categoryMetrics.p99}
                    <span className="text-sm font-normal text-gray-500 ml-1">ms</span>
                  </div>
                </div>
              </div>

              {/* Visual Bar */}
              <div className="mt-4">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="flex h-full">
                    <div
                      className="bg-green-500"
                      style={{ width: `${(categoryMetrics.p50 / categoryMetrics.p99) * 100}%` }}
                    />
                    <div
                      className="bg-yellow-500"
                      style={{
                        width: `${((categoryMetrics.p95 - categoryMetrics.p50) / categoryMetrics.p99) * 100}%`,
                      }}
                    />
                    <div
                      className="bg-red-500"
                      style={{
                        width: `${((categoryMetrics.p99 - categoryMetrics.p95) / categoryMetrics.p99) * 100}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <span>Fast</span>
                  <span>Slow</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Auto-refreshes every minute · Percentiles calculated over last 5 minutes
        </p>
      </div>
    </div>
  );
}
