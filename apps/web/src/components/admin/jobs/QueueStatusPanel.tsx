'use client';

import { motion } from 'framer-motion';
import { QueueStatus } from '@/hooks/useBuildJobs';

interface QueueStatusPanelProps {
  status: QueueStatus | null;
  loading: boolean;
}

export function QueueStatusPanel({ status, loading }: QueueStatusPanelProps) {
  if (loading || !status) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Queue Status</h3>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-xl border border-gray-200 p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Queue Status</h3>
        <span className="text-xs text-gray-500">Auto-refreshes every 30s</span>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-yellow-50 p-4 rounded-lg border border-yellow-200"
        >
          <p className="text-sm text-yellow-700 font-medium mb-1">Pending</p>
          <p className="text-3xl font-bold text-yellow-900">{status.pending}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-blue-50 p-4 rounded-lg border border-blue-200"
        >
          <p className="text-sm text-blue-700 font-medium mb-1">In Progress</p>
          <p className="text-3xl font-bold text-blue-900">{status.inProgress}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="bg-green-50 p-4 rounded-lg border border-green-200"
        >
          <p className="text-sm text-green-700 font-medium mb-1">Completed Today</p>
          <p className="text-3xl font-bold text-green-900">{status.completedToday}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="bg-red-50 p-4 rounded-lg border border-red-200"
        >
          <p className="text-sm text-red-700 font-medium mb-1">Failed Today</p>
          <p className="text-3xl font-bold text-red-900">{status.failedToday}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          className="bg-purple-50 p-4 rounded-lg border border-purple-200"
        >
          <p className="text-sm text-purple-700 font-medium mb-1">Avg. Time</p>
          <p className="text-3xl font-bold text-purple-900">{status.averageCompletionTime}m</p>
        </motion.div>
      </div>
    </motion.div>
  );
}
