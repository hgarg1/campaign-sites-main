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
      className="space-y-6"
    >
      {/* Report Type Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-lg border border-gray-200 p-6"
      >
        <h3 className="text-lg font-semibold mb-4">Report Type</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {(['daily', 'weekly', 'monthly', 'quarterly', 'custom'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setReportType(type)}
              className={`p-4 rounded-lg border-2 font-medium text-center transition-all ${
                reportType === type
                  ? 'border-blue-600 bg-blue-50 text-blue-900'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Custom Date Range (if custom is selected) */}
      <AnimatePresence>
        {reportType === 'custom' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-lg border border-gray-200 p-6"
          >
            <h3 className="text-lg font-semibold mb-4">Date Range</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Metrics Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-lg border border-gray-200 p-6"
      >
        <h3 className="text-lg font-semibold mb-4">Metrics to Include</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {metrics.map((metric) => (
            <button
              key={metric.id}
              onClick={() => toggleMetric(metric.id)}
              className={`p-4 rounded-lg border-2 text-center transition-all ${
                selectedMetrics.includes(metric.id)
                  ? 'border-purple-600 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-2xl mb-2">{metric.icon}</div>
              <div className="text-xs font-medium">{metric.label}</div>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Dimensions Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-lg border border-gray-200 p-6"
      >
        <h3 className="text-lg font-semibold mb-4">Dimensions</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {dimensions.map((dimension) => (
            <button
              key={dimension.id}
              onClick={() => toggleDimension(dimension.id)}
              className={`p-4 rounded-lg border-2 text-center transition-all ${
                selectedDimensions.includes(dimension.id)
                  ? 'border-green-600 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-2xl mb-2">{dimension.icon}</div>
              <div className="text-xs font-medium">{dimension.label}</div>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Export Format */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-lg border border-gray-200 p-6"
      >
        <h3 className="text-lg font-semibold mb-4">Export Format</h3>
        
        <div className="grid grid-cols-2 gap-3">
          {(['pdf', 'csv'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={`p-4 rounded-lg border-2 font-medium transition-all ${
                format === f
                  ? 'border-orange-600 bg-orange-50 text-orange-900'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Generate Button */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        onClick={handleGenerate}
        disabled={loading}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold py-3 px-6 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Generating Report...
          </span>
        ) : (
          <span>🚀 Generate Report</span>
        )}
      </motion.button>
    </motion.div>
  );
}
