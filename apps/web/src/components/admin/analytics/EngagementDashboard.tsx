'use client';

import { motion } from 'framer-motion';
import { EngagementMetric } from '@/hooks/useAnalytics';

interface EngagementDashboardProps {
  data: EngagementMetric[];
  loading: boolean;
}

export function EngagementDashboard({ data, loading }: EngagementDashboardProps) {
  if (loading) {
    return <div className="animate-pulse bg-gray-200 h-96 rounded-lg" />;
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    return <div className="text-center py-8 text-gray-600">No engagement data available</div>;
  }

  const getColorByTrend = (trend: number) => {
    if (trend >= 10) return 'text-green-600 bg-green-50';
    if (trend >= 0) return 'text-blue-600 bg-blue-50';
    return 'text-red-600 bg-red-50';
  };

  const getIconByMetric = (metric: string) => {
    const icons: { [key: string]: string } = {
      'republish_frequency': '🔄',
      'integration_adoption': '🔗',
      'feature_usage': '⚙️',
      'template_usage': '📋',
      'api_usage': '📡',
      'automation_usage': '🤖',
      'export_usage': '📤',
      'collaboration_activity': '👥',
      default: '📊',
    };
    return icons[metric.toLowerCase().replace(/\s+/g, '_')] || icons.default;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Engagement Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((metric, index) => {
          const colorClass = getColorByTrend(metric.trend ?? 0);
          const icon = getIconByMetric(metric.metric);

          return (
            <motion.div
              key={metric.metric}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`${colorClass} rounded-lg p-4 border border-current border-opacity-20`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium opacity-75 truncate">{metric.metric}</div>
                  <div className="text-2xl font-bold mt-2">{(metric.value ?? 0).toFixed(1)}</div>
                  <div className={`text-xs mt-2 font-semibold ${(metric.trend ?? 0) >= 0 ? '' : 'opacity-75'}`}>
                    {(metric.trend ?? 0) >= 0 ? '📈' : '📉'} {(metric.trend ?? 0) >= 0 ? '+' : ''}{(metric.trend ?? 0).toFixed(1)}%
                  </div>
                </div>
                <div className="text-2xl shrink-0">{icon}</div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Engagement Score */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-lg border border-gray-200 p-6"
      >
        <h3 className="text-lg font-semibold mb-4">Overall Engagement Score</h3>
        
        {/* Calculate average engagement */}
        {(() => {
          const n = data.length || 1;
          const avgValue = data.reduce((sum, m) => sum + (m.value ?? 0), 0) / n;
          const avgTrend = data.reduce((sum, m) => sum + (m.trend ?? 0), 0) / n;
          const scorePercentage = Math.min(100, Math.round(isFinite(avgValue) ? avgValue : 0));

          return (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="text-4xl font-bold text-gray-900">{scorePercentage}</div>
                <div className={`text-lg font-semibold ${avgTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {avgTrend >= 0 ? '↑' : '↓'} {Math.abs(avgTrend).toFixed(1)}%
                </div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    scorePercentage >= 75
                      ? 'bg-green-500'
                      : scorePercentage >= 50
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                  }`}
                  style={{ width: `${scorePercentage}%` }}
                />
              </div>
              <div className="text-sm text-gray-600 mt-2">
                {scorePercentage >= 75
                  ? '🎉 Excellent engagement'
                  : scorePercentage >= 50
                    ? '👍 Good engagement'
                    : '⚠️ Needs improvement'}
              </div>
            </div>
          );
        })()}
      </motion.div>

      {/* Metric Details */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-lg border border-gray-200 p-6"
      >
        <h3 className="text-lg font-semibold mb-4">Detailed Breakdown</h3>
        
        <div className="space-y-3">
          {data
            .sort((a, b) => b.value - a.value)
            .map((metric) => (
              <div key={metric.metric} className="flex items-center justify-between gap-2 pb-3 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="text-xl shrink-0">{getIconByMetric(metric.metric)}</div>
                  <div className="text-sm font-medium text-gray-700 truncate">{metric.metric}</div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">{(metric.value ?? 0).toFixed(1)}</div>
                    <div className={`text-xs ${(metric.trend ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {(metric.trend ?? 0) >= 0 ? '+' : ''}{(metric.trend ?? 0).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
