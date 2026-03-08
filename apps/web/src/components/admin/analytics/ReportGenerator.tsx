'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ReportOptions } from '@/hooks/useAnalytics';
import { useToast } from '@/components/admin/shared/ToastContext';

interface ReportGeneratorProps {
  loading: boolean;
  onGenerate: (options: ReportOptions) => Promise<void>;
}

export function ReportGenerator({ loading, onGenerate }: ReportGeneratorProps) {
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly' | 'custom'>('monthly');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['growth', 'usage']);
  const [selectedDimensions, setSelectedDimensions] = useState<string[]>(['org']);
  const [format, setFormat] = useState<'pdf' | 'csv'>('pdf');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { error: showError } = useToast();

  const metrics = [
    { id: 'growth', label: 'Growth Metrics', icon: '📈' },
    { id: 'usage', label: 'Usage Analytics', icon: '📊' },
    { id: 'engagement', label: 'Engagement', icon: '👥' },
    { id: 'costs', label: 'Cost Analysis', icon: '💰' },
  ];

  const dimensions = [
    { id: 'org', label: 'By Organization', icon: '🏢' },
    { id: 'user', label: 'By User', icon: '👤' },
    { id: 'region', label: 'By Region', icon: '🌍' },
  ];

  const toggleMetric = (id: string) => {
    setSelectedMetrics((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const toggleDimension = (id: string) => {
    setSelectedDimensions((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const handleGenerate = async () => {
    if (selectedMetrics.length === 0) {
      showError('Error', 'Please select at least one metric');
      return;
    }

    if (selectedDimensions.length === 0) {
      showError('Error', 'Please select at least one dimension');
      return;
    }

    if (reportType === 'custom' && (!startDate || !endDate)) {
      showError('Error', 'Please select date range for custom reports');
      return;
    }

    const options: ReportOptions = {
      type: reportType,
      metrics: selectedMetrics,
      dimensions: selectedDimensions,
      format,
      ...(reportType === 'custom' && { startDate, endDate }),
    };

    await onGenerate(options);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100"
    >
      {/* Report Type Selection */}
      <div className="p-5">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Report Type</h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {(['daily', 'weekly', 'monthly', 'quarterly', 'custom'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setReportType(type)}
              className={`py-2 px-3 rounded-lg border-2 font-medium text-sm text-center transition-all ${
                reportType === type
                  ? 'border-blue-600 bg-blue-50 text-blue-900'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Range */}
      <AnimatePresence>
        {reportType === 'custom' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-5">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Date Range</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Start</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">End</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Metrics Selection */}
      <div className="p-5">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Metrics</h3>
        <div className="grid grid-cols-2 gap-2">
          {metrics.map((metric) => (
            <button
              key={metric.id}
              onClick={() => toggleMetric(metric.id)}
              className={`p-3 rounded-lg border-2 text-center transition-all ${
                selectedMetrics.includes(metric.id)
                  ? 'border-purple-600 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-xl mb-1">{metric.icon}</div>
              <div className="text-xs font-medium leading-tight">{metric.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Dimensions Selection */}
      <div className="p-5">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Dimensions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {dimensions.map((dimension) => (
            <button
              key={dimension.id}
              onClick={() => toggleDimension(dimension.id)}
              className={`p-3 rounded-lg border-2 text-center transition-all ${
                selectedDimensions.includes(dimension.id)
                  ? 'border-green-600 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-xl mb-1">{dimension.icon}</div>
              <div className="text-xs font-medium leading-tight">{dimension.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Export Format */}
      <div className="p-5">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Format</h3>
        <div className="grid grid-cols-2 gap-2">
          {(['pdf', 'csv'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={`py-2 px-3 rounded-lg border-2 font-semibold text-sm transition-all ${
                format === f
                  ? 'border-orange-600 bg-orange-50 text-orange-900'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Generate Button */}
      <div className="p-5">
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold py-2.5 px-6 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Generating...
            </span>
          ) : (
            <span>🚀 Generate Report</span>
          )}
        </button>
      </div>
    </motion.div>
  );
}
