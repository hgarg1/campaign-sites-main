'use client';

import { motion } from 'framer-motion';
import { AlertRule } from '@/hooks/useMonitoring';
import { useState } from 'react';
import { useToast } from '../shared/ToastContext';

interface AlertRulesManagerProps {
  rules: AlertRule[];
  loading: boolean;
  onToggleRule: (ruleId: string, enabled: boolean) => Promise<void>;
}

const levelColors = {
  CRITICAL: 'text-red-600',
  WARNING: 'text-yellow-600',
  INFO: 'text-blue-600',
};

const conditionLabels = {
  GREATER_THAN: '>',
  LESS_THAN: '<',
  EQUALS: '=',
};

export function AlertRulesManager({ rules, loading, onToggleRule }: AlertRulesManagerProps) {
  const { showToast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleToggle = async (ruleId: string, currentEnabled: boolean) => {
    try {
      setProcessingId(ruleId);
      await onToggleRule(ruleId, !currentEnabled);
      showToast('success', `Rule ${!currentEnabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      showToast('error', 'Failed to update rule');
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

  const enabledCount = rules.filter((r) => r.enabled).length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Alert Rules</h3>
            <p className="text-sm text-gray-600 mt-1">
              {enabledCount} of {rules.length} rule{rules.length !== 1 ? 's' : ''} enabled
            </p>
          </div>
        </div>
      </div>

      {/* Rules List */}
      <div className="divide-y divide-gray-200">
        {rules.map((rule, index) => {
          const isProcessing = processingId === rule.id;

          return (
            <motion.div
              key={rule.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className={`p-6 ${rule.enabled ? 'bg-white' : 'bg-gray-50'}`}
            >
              <div className="flex items-start gap-4">
                {/* Toggle Switch */}
                <button
                  onClick={() => handleToggle(rule.id, rule.enabled)}
                  disabled={isProcessing}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
                    rule.enabled ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                  aria-label={`Toggle ${rule.name}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      rule.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{rule.name}</h4>
                      {rule.description && (
                        <p className="text-sm text-gray-600 mt-1">{rule.description}</p>
                      )}

                      {/* Rule Details */}
                      <div className="mt-3 flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">Metric:</span>
                          <span className="font-mono font-medium text-gray-900">{rule.metric}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">Condition:</span>
                          <span className="font-mono font-medium text-gray-900">
                            {conditionLabels[rule.condition]} {rule.threshold}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">Level:</span>
                          <span className={`font-medium ${levelColors[rule.level]}`}>
                            {rule.level}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">Cooldown:</span>
                          <span className="font-medium text-gray-900">
                            {rule.cooldownMinutes} min
                          </span>
                        </div>
                      </div>

                      {/* Channels */}
                      {rule.channels.length > 0 && (
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-sm text-gray-500">Channels:</span>
                          <div className="flex gap-2">
                            {rule.channels.map((channel) => (
                              <span
                                key={channel}
                                className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium"
                              >
                                {channel}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          rule.enabled
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {rule.enabled ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Alert rules are evaluated continuously. Changes take effect immediately.
        </p>
      </div>
    </div>
  );
}
