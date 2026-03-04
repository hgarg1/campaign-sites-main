'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Alert } from '@/hooks/useMonitoring';
import { useState } from 'react';
import { useToast } from '../shared/ToastContext';

interface AlertsListProps {
  alerts: Alert[];
  loading: boolean;
  onAcknowledge: (alertId: string) => Promise<void>;
  onResolve: (alertId: string) => Promise<void>;
}

const levelColors = {
  CRITICAL: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', icon: '🚨' },
  WARNING: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300', icon: '⚠️' },
  INFO: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', icon: 'ℹ️' },
};

const statusColors = {
  NEW: { bg: 'bg-red-100', text: 'text-red-800' },
  ACKNOWLEDGED: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  RESOLVED: { bg: 'bg-green-100', text: 'text-green-800' },
};

export function AlertsList({ alerts, loading, onAcknowledge, onResolve }: AlertsListProps) {
  const { showToast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleAcknowledge = async (alertId: string) => {
    try {
      setProcessingId(alertId);
      await onAcknowledge(alertId);
      showToast('success', 'Alert acknowledged');
    } catch (error) {
      showToast('error', 'Failed to acknowledge alert');
    } finally {
      setProcessingId(null);
    }
  };

  const handleResolve = async (alertId: string) => {
    try {
      setProcessingId(alertId);
      await onResolve(alertId);
      showToast('success', 'Alert resolved');
    } catch (error) {
      showToast('error', 'Failed to resolve alert');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <div className="flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  const activeAlerts = alerts.filter((a) => a.status !== 'RESOLVED');
  const resolvedAlerts = alerts.filter((a) => a.status === 'RESOLVED');

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Active Alerts</h3>
            <p className="text-sm text-gray-600 mt-1">
              {activeAlerts.length} active alert{activeAlerts.length !== 1 ? 's' : ''}
            </p>
          </div>
          {activeAlerts.length > 0 && (
            <div className="flex gap-2">
              {['CRITICAL', 'WARNING', 'INFO'].map((level) => {
                const count = activeAlerts.filter((a) => a.level === level).length;
                if (count === 0) return null;
                const colors = levelColors[level as Alert['level']];
                return (
                  <div
                    key={level}
                    className={`px-3 py-1 rounded-full text-xs font-medium border ${colors.bg} ${colors.text} ${colors.border}`}
                  >
                    {colors.icon} {count}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Alerts List */}
      <div className="divide-y divide-gray-200">
        {activeAlerts.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="text-5xl mb-4">✅</div>
            <p className="text-gray-600">No active alerts</p>
            <p className="text-sm text-gray-500 mt-1">All systems operating normally</p>
          </div>
        ) : (
          activeAlerts.map((alert, index) => {
            const levelColor = levelColors[alert.level];
            const statusColor = statusColors[alert.status];
            const isExpanded = expandedId === alert.id;
            const isProcessing = processingId === alert.id;

            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="p-6 hover:bg-gray-50"
              >
                <div className="flex items-start gap-4">
                  {/* Level Icon */}
                  <div className="flex-shrink-0 text-2xl">{levelColor.icon}</div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${levelColor.bg} ${levelColor.text} ${levelColor.border}`}
                          >
                            {alert.level}
                          </span>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor.bg} ${statusColor.text}`}
                          >
                            {alert.status}
                          </span>
                          <span className="text-sm text-gray-500">{alert.type}</span>
                        </div>
                        <p className="text-gray-900 font-medium">{alert.message}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Triggered {new Date(alert.triggeredAt).toLocaleString()}
                        </p>
                        {alert.acknowledgedAt && (
                          <p className="text-xs text-gray-500 mt-1">
                            Acknowledged by {alert.acknowledgedBy} at{' '}
                            {new Date(alert.acknowledgedAt).toLocaleString()}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        {alert.status === 'NEW' && (
                          <button
                            onClick={() => handleAcknowledge(alert.id)}
                            disabled={isProcessing}
                            className="px-3 py-1.5 text-sm font-medium text-yellow-700 bg-yellow-100 hover:bg-yellow-200 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {isProcessing ? 'Processing...' : 'Acknowledge'}
                          </button>
                        )}
                        {alert.status !== 'RESOLVED' && (
                          <button
                            onClick={() => handleResolve(alert.id)}
                            disabled={isProcessing}
                            className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {isProcessing ? 'Processing...' : 'Resolve'}
                          </button>
                        )}
                        {alert.metadata && (
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : alert.id)}
                            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                          >
                            {isExpanded ? 'Hide Details' : 'Show Details'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Metadata (Expanded) */}
                    <AnimatePresence>
                      {isExpanded && alert.metadata && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="mt-3 overflow-hidden"
                        >
                          <div className="bg-gray-100 rounded-lg p-4">
                            <div className="text-xs font-medium text-gray-600 mb-2">Metadata:</div>
                            <pre className="text-xs text-gray-800 overflow-x-auto">
                              {JSON.stringify(alert.metadata, null, 2)}
                            </pre>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Resolved Alerts Section */}
      {resolvedAlerts.length > 0 && (
        <div className="border-t-2 border-gray-300">
          <div className="px-6 py-3 bg-gray-50">
            <h4 className="text-sm font-semibold text-gray-700">
              Recently Resolved ({resolvedAlerts.length})
            </h4>
          </div>
          <div className="divide-y divide-gray-200 max-h-64 overflow-y-auto">
            {resolvedAlerts.slice(0, 5).map((alert) => (
              <div key={alert.id} className="px-6 py-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span className="text-gray-900">{alert.message}</span>
                  <span className="text-gray-500 text-xs ml-auto">
                    {new Date(alert.resolvedAt!).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
