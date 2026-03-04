'use client';

import { motion } from 'framer-motion';
import { SystemMetrics } from '@/hooks/useMonitoring';
import { useState } from 'react';

interface MetricsChartProps {
  metrics: SystemMetrics[];
  loading: boolean;
  timeRange: '1h' | '24h' | '7d' | '30d';
  onTimeRangeChange: (range: '1h' | '24h' | '7d' | '30d') => void;
}

type MetricType = 'cpu' | 'memory' | 'diskIO' | 'networkIO' | 'databaseConnections' | 'redisMemory';

const metricLabels: Record<MetricType, string> = {
  cpu: 'CPU Usage',
  memory: 'Memory Usage',
  diskIO: 'Disk I/O',
  networkIO: 'Network I/O',
  databaseConnections: 'Database Connections',
  redisMemory: 'Redis Memory',
};

const metricUnits: Record<MetricType, string> = {
  cpu: '%',
  memory: '%',
  diskIO: 'MB/s',
  networkIO: 'MB/s',
  databaseConnections: 'connections',
  redisMemory: 'MB',
};

const metricColors: Record<MetricType, string> = {
  cpu: 'bg-blue-500',
  memory: 'bg-purple-500',
  diskIO: 'bg-green-500',
  networkIO: 'bg-yellow-500',
  databaseConnections: 'bg-pink-500',
  redisMemory: 'bg-orange-500',
};

export function MetricsChart({ metrics, loading, timeRange, onTimeRangeChange }: MetricsChartProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('cpu');

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <div className="flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  const getMetricValue = (metric: SystemMetrics, type: MetricType): number => {
    return metric[type] as number;
  };

  const maxValue = Math.max(...metrics.map((m) => getMetricValue(m, selectedMetric)), 100);
  const minValue = Math.min(...metrics.map((m) => getMetricValue(m, selectedMetric)), 0);

  const currentMetric = metrics[metrics.length - 1];
  const currentValue = currentMetric ? getMetricValue(currentMetric, selectedMetric) : 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">System Metrics</h3>
            <p className="text-sm text-gray-600 mt-1">Historical performance data</p>
          </div>

          {/* Time Range Selector */}
          <div className="flex gap-1 bg-white rounded-lg border border-gray-200 p-1">
            {(['1h', '24h', '7d', '30d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => onTimeRangeChange(range)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Metric Selector */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {(Object.keys(metricLabels) as MetricType[]).map((metric) => {
            const isSelected = selectedMetric === metric;
            const value = currentMetric ? getMetricValue(currentMetric, metric) : 0;

            return (
              <button
                key={metric}
                onClick={() => setSelectedMetric(metric)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="text-xs font-medium text-gray-600 mb-1">
                  {metricLabels[metric]}
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {value.toFixed(metric === 'diskIO' || metric === 'networkIO' ? 1 : 0)}
                </div>
                <div className="text-xs text-gray-500 mt-1">{metricUnits[metric]}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart */}
      <div className="px-6 py-8">
        <div className="h-64 flex items-end gap-1">
          {metrics.map((metric, index) => {
            const value = getMetricValue(metric, selectedMetric);
            const heightPercent = ((value - minValue) / (maxValue - minValue)) * 100;

            return (
              <motion.div
                key={index}
                initial={{ height: 0 }}
                animate={{ height: `${heightPercent}%` }}
                transition={{ duration: 0.5, delay: index * 0.01 }}
                className={`flex-1 min-w-[2px] rounded-t-sm ${metricColors[selectedMetric]} relative group`}
                style={{ minHeight: '2px' }}
              >
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                    <div className="font-medium">
                      {value.toFixed(1)} {metricUnits[selectedMetric]}
                    </div>
                    <div className="text-gray-400">
                      {new Date(metric.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Y-axis labels */}
        <div className="mt-4 flex justify-between text-xs text-gray-500">
          <span>Min: {minValue.toFixed(1)}</span>
          <span>Current: {currentValue.toFixed(1)} {metricUnits[selectedMetric]}</span>
          <span>Max: {maxValue.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
}
