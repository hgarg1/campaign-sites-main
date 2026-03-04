'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LLMLog } from '@/hooks/useBuildJobs';

interface LLMLogsViewerProps {
  logs: LLMLog[];
  loading: boolean;
}

export function LLMLogsViewer({ logs, loading }: LLMLogsViewerProps) {
  const [selectedLog, setSelectedLog] = useState<LLMLog | null>(null);
  const [filterProvider, setFilterProvider] = useState<string>('');

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">LLM Execution Logs</h3>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  const providers = Array.from(new Set(logs.map(log => log.provider)));
  const filteredLogs = filterProvider 
    ? logs.filter(log => log.provider === filterProvider)
    : logs;

  const totalTokens = logs.reduce((sum, log) => sum + (log.tokenCount || 0), 0);
  const avgLatency = logs.length > 0 
    ? Math.round(logs.reduce((sum, log) => sum + (log.latency || 0), 0) / logs.length)
    : 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          LLM Execution Logs ({filteredLogs.length})
        </h3>

        {/* Filter */}
        <select
          value={filterProvider}
          onChange={(e) => setFilterProvider(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">All Providers</option>
          {providers.map(provider => (
            <option key={provider} value={provider} className="capitalize">
              {provider}
            </option>
          ))}
        </select>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-700 font-medium mb-1">Total Calls</p>
          <p className="text-2xl font-bold text-blue-900">{filteredLogs.length}</p>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <p className="text-sm text-purple-700 font-medium mb-1">Total Tokens</p>
          <p className="text-2xl font-bold text-purple-900">{totalTokens.toLocaleString()}</p>
        </div>

        <div className="bg-orange-50 p-4 rounded-lg">
          <p className="text-sm text-orange-700 font-medium mb-1">Avg. Latency</p>
          <p className="text-2xl font-bold text-orange-900">{avgLatency}ms</p>
        </div>
      </div>

      {/* Logs List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredLogs.map((log, index) => (
          <motion.div
            key={log.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.02 }}
            className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors cursor-pointer"
            onClick={() => setSelectedLog(log)}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900 capitalize">{log.provider}</span>
                  <span className="text-xs text-gray-500">•</span>
                  <span className="text-sm text-gray-600">{log.model}</span>
                </div>
                <p className="text-xs text-gray-500 font-mono">{log.id}</p>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedLog(log);
                }}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                View Details
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              {log.tokenCount && (
                <div>
                  <span className="text-gray-600">Tokens:</span>
                  <span className="text-gray-900 ml-2 font-medium">{log.tokenCount.toLocaleString()}</span>
                </div>
              )}

              {log.latency && (
                <div>
                  <span className="text-gray-600">Latency:</span>
                  <span className="text-gray-900 ml-2 font-medium">{log.latency}ms</span>
                </div>
              )}

              <div>
                <span className="text-gray-600">Time:</span>
                <span className="text-gray-900 ml-2">
                  {new Date(log.createdAt).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          </motion.div>
        ))}

        {filteredLogs.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No LLM execution logs found
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedLog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedLog(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 capitalize">
                      {selectedLog.provider} - {selectedLog.model}
                    </h3>
                    <p className="text-sm text-gray-500 font-mono mt-1">{selectedLog.id}</p>
                  </div>
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                {/* Metadata */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-700 font-medium mb-1">Tokens</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {selectedLog.tokenCount?.toLocaleString() || 'N/A'}
                    </p>
                  </div>

                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-purple-700 font-medium mb-1">Latency</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {selectedLog.latency ? `${selectedLog.latency}ms` : 'N/A'}
                    </p>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-green-700 font-medium mb-1">Timestamp</p>
                    <p className="text-lg font-bold text-green-900">
                      {new Date(selectedLog.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                {/* Prompt */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Prompt</h4>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 max-h-60 overflow-y-auto">
                    <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                      {selectedLog.prompt}
                    </pre>
                  </div>
                </div>

                {/* Response */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Response</h4>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 max-h-60 overflow-y-auto">
                    <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                      {selectedLog.response}
                    </pre>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
