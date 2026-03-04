'use client';

import { motion } from 'framer-motion';
import { AlertChannel } from '@/hooks/useMonitoring';
import { useState } from 'react';
import { useToast } from '../shared/ToastContext';

interface AlertChannelsConfigProps {
  channels: AlertChannel[];
  loading: boolean;
  onToggleChannel: (channelId: string, enabled: boolean) => Promise<void>;
}

const channelIcons = {
  EMAIL: '📧',
  SLACK: '💬',
  PAGERDUTY: '📟',
  WEBHOOK: '🔗',
};

const channelColors = {
  EMAIL: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
  SLACK: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
  PAGERDUTY: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
  WEBHOOK: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
};

export function AlertChannelsConfig({ channels, loading, onToggleChannel }: AlertChannelsConfigProps) {
  const { showToast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleToggle = async (channelId: string, currentEnabled: boolean) => {
    try {
      setProcessingId(channelId);
      await onToggleChannel(channelId, !currentEnabled);
      showToast('success', `Channel ${!currentEnabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      showToast('error', 'Failed to update channel');
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

  const enabledCount = channels.filter((c) => c.enabled).length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900">Alert Channels</h3>
        <p className="text-sm text-gray-600 mt-1">
          {enabledCount} of {channels.length} channel{channels.length !== 1 ? 's' : ''} enabled
        </p>
      </div>

      {/* Channels Grid */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {channels.map((channel, index) => {
          const isProcessing = processingId === channel.id;
          const colors = channelColors[channel.type];
          const icon = channelIcons[channel.type];

          return (
            <motion.div
              key={channel.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className={`rounded-lg border-2 ${colors.border} ${colors.bg} p-6 ${
                !channel.enabled ? 'opacity-60' : ''
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{icon}</div>
                  <div>
                    <h4 className={`font-semibold ${colors.text}`}>{channel.name}</h4>
                    <p className="text-sm text-gray-600">{channel.type}</p>
                  </div>
                </div>

                {/* Toggle Switch */}
                <button
                  onClick={() => handleToggle(channel.id, channel.enabled)}
                  disabled={isProcessing}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
                    channel.enabled ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                  aria-label={`Toggle ${channel.name}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      channel.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    channel.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {channel.enabled ? 'Active' : 'Disabled'}
                </span>
              </div>

              {/* Configuration Preview */}
              {channel.enabled && Object.keys(channel.config).length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-xs font-medium text-gray-600 mb-2">Configuration:</div>
                  <div className="space-y-1">
                    {Object.entries(channel.config).map(([key, value]) => {
                      // Mask sensitive values
                      const displayValue =
                        key.toLowerCase().includes('token') ||
                        key.toLowerCase().includes('key') ||
                        key.toLowerCase().includes('secret')
                          ? '••••••••'
                          : String(value);

                      return (
                        <div key={key} className="flex justify-between text-xs">
                          <span className="text-gray-600">{key}:</span>
                          <span className="text-gray-900 font-mono">{displayValue}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Configure alert notification channels to receive system alerts via different methods.
        </p>
      </div>
    </div>
  );
}
