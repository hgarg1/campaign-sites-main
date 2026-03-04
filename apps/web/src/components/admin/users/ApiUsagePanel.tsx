'use client';

import { motion } from 'framer-motion';

interface ApiUsagePanelProps {
  userId: string;
  apiCallsUsed?: number;
  apiCallsQuota?: number;
  storageUsedMB?: number;
  storageQuotaMB?: number;
  llmCallsUsed?: number;
  llmCallsQuota?: number;
}

const defaultValues = {
  apiCallsUsed: 4250,
  apiCallsQuota: 10000,
  storageUsedMB: 2.4,
  storageQuotaMB: 10,
  llmCallsUsed: 850,
  llmCallsQuota: 2000,
};

interface UsageItem {
  label: string;
  used: number;
  quota: number;
  unit: string;
  icon: string;
  color: string;
  warningThreshold?: number;
}

export function ApiUsagePanel({
  userId,
  apiCallsUsed = defaultValues.apiCallsUsed,
  apiCallsQuota = defaultValues.apiCallsQuota,
  storageUsedMB = defaultValues.storageUsedMB,
  storageQuotaMB = defaultValues.storageQuotaMB,
  llmCallsUsed = defaultValues.llmCallsUsed,
  llmCallsQuota = defaultValues.llmCallsQuota,
}: ApiUsagePanelProps) {
  const usageItems: UsageItem[] = [
    {
      label: 'API Calls',
      used: apiCallsUsed,
      quota: apiCallsQuota,
      unit: 'calls/month',
      icon: '⚡',
      color: 'blue',
      warningThreshold: 0.8,
    },
    {
      label: 'Storage',
      used: storageUsedMB,
      quota: storageQuotaMB,
      unit: 'MB',
      icon: '💾',
      color: 'purple',
      warningThreshold: 0.9,
    },
    {
      label: 'LLM Usage',
      used: llmCallsUsed,
      quota: llmCallsQuota,
      unit: 'calls/month',
      icon: '🤖',
      color: 'orange',
      warningThreshold: 0.8,
    },
  ];

  const getStatusColor = (percentUsed: number, item: UsageItem) => {
    const threshold = item.warningThreshold || 0.8;
    if (percentUsed >= 1) return 'bg-red-500';
    if (percentUsed >= threshold) return 'bg-yellow-500';
    return `bg-${item.color}-500`;
  };

  const getStatusText = (percentUsed: number) => {
    if (percentUsed >= 1) return 'Quota exceeded';
    if (percentUsed >= 0.8) return 'Warning';
    return 'Normal';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.3 }}
      className="bg-white rounded-xl border border-gray-200 p-6"
    >
      <h3 className="text-lg font-bold text-gray-900 mb-6">API Usage & Quotas</h3>

      <div className="space-y-6">
        {usageItems.map((item, idx) => {
          const percentUsed = item.used / item.quota;
          const displayPercent = Math.min(percentUsed * 100, 100);
          const statusColor = getStatusColor(percentUsed, item);
          const statusText = getStatusText(percentUsed);
          const warningLevel = percentUsed >= (item.warningThreshold || 0.8);

          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: 0.05 * idx }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{item.icon}</span>
                  <span className="font-medium text-gray-900">{item.label}</span>
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    warningLevel
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-800'
                  }`}
                >
                  {statusText}
                </span>
              </div>

              {/* Usage Details */}
              <div className="text-xs text-gray-600 mb-2">
                <span className="font-medium text-gray-900">
                  {item.used.toLocaleString()}
                </span>{' '}
                / {item.quota.toLocaleString()} {item.unit}
              </div>

              {/* Progress Bar */}
              <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${displayPercent}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className={`h-full ${statusColor}`}
                />
              </div>

              {/* Percentage */}
              <div className="text-xs text-gray-600 mt-1 text-right">
                {(percentUsed * 100).toFixed(1)}%
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Upgrade CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="mt-6 pt-6 border-t border-gray-200"
      >
        <button className="w-full px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200">
          Upgrade Plan
        </button>
      </motion.div>

      {/* Reset Date Info */}
      <p className="text-xs text-gray-500 mt-4 text-center">
        Usage resets on <span className="font-medium">April 1, 2026</span>
      </p>
    </motion.div>
  );
}
