'use client';

import { motion } from 'framer-motion';
import { FeatureFlag } from '@/hooks/useSettings';
import { useState } from 'react';
import { useToast } from '../shared/ToastContext';

interface FeatureFlagsManagerProps {
  flags: FeatureFlag[];
  loading: boolean;
  onToggle: (flagId: string, enabled: boolean) => Promise<void>;
  onUpdateRollout: (flagId: string, percentage: number) => Promise<void>;
}

export function FeatureFlagsManager({
  flags,
  loading,
  onToggle,
  onUpdateRollout,
}: FeatureFlagsManagerProps) {
  const { showToast } = useToast();
  const [toggling, setToggling] = useState<string | null>(null);
  const [rolloutChanges, setRolloutChanges] = useState<Record<string, number>>({});

  const handleToggle = async (flagId: string, currentEnabled: boolean) => {
    try {
      setToggling(flagId);
      await onToggle(flagId, !currentEnabled);
      showToast('success', `Feature flag ${!currentEnabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      showToast('error', 'Failed to update feature flag');
    } finally {
      setToggling(null);
    }
  };

  const handleUpdateRollout = async (flagId: string) => {
    const newPercentage = rolloutChanges[flagId];
    if (newPercentage === undefined) return;

    try {
      await onUpdateRollout(flagId, newPercentage);
      showToast('success', 'Rollout percentage updated');
      setRolloutChanges((prev) => {
        const next = { ...prev };
        delete next[flagId];
        return next;
      });
    } catch (error) {
      showToast('error', 'Failed to update rollout percentage');
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

  const enabledCount = flags.filter((f) => f.enabled).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-xl border border-gray-200 overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900">Feature Flags</h3>
        <p className="text-sm text-gray-600 mt-1">
          {enabledCount} of {flags.length} feature{flags.length !== 1 ? 's' : ''} enabled
        </p>
      </div>

      {/* Flags List */}
      <div className="divide-y divide-gray-200">
        {flags.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-600">No feature flags found</p>
          </div>
        ) : (
          flags.map((flag, index) => {
            const isTogglingThis = toggling === flag.id;
            const rolloutValue = rolloutChanges[flag.id] ?? flag.rolloutPercentage;
            const isModified = rolloutChanges[flag.id] !== undefined;

            return (
              <motion.div
                key={flag.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="p-6 hover:bg-gray-50"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-gray-900">{flag.name}</h4>
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-mono">
                        {flag.key}
                      </span>
                    </div>
                    {flag.description && (
                      <p className="text-sm text-gray-600 mb-3">{flag.description}</p>
                    )}
                  </div>

                  {/* Toggle Switch */}
                  <button
                    onClick={() => handleToggle(flag.id, flag.enabled)}
                    disabled={isTogglingThis}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
                      flag.enabled ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        flag.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Rollout Configuration */}
                {flag.enabled && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rollout Percentage
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={rolloutValue}
                        onChange={(e) =>
                          setRolloutChanges((prev) => ({
                            ...prev,
                            [flag.id]: parseInt(e.target.value),
                          }))
                        }
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={rolloutValue}
                          onChange={(e) =>
                            setRolloutChanges((prev) => ({
                              ...prev,
                              [flag.id]: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)),
                            }))
                          }
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                        />
                        <span className="text-sm text-gray-600 w-5">%</span>
                        {isModified && (
                          <button
                            onClick={() => handleUpdateRollout(flag.id)}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors"
                          >
                            Save
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="mt-4 text-xs text-gray-500 space-y-1">
                  {flag.targetAudiences.length > 0 && (
                    <div>
                      <span className="font-medium">Target Audiences:</span> {flag.targetAudiences.join(', ')}
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Last Updated:</span>{' '}
                    {new Date(flag.updatedAt).toLocaleDateString()} by {flag.updatedBy}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
