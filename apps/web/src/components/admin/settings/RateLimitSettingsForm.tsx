'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { RateLimitSettings } from '@/hooks/useSettings';
import { useToast } from '../shared/ToastContext';

interface RateLimitSettingsProps {
  settings: RateLimitSettings | null;
  loading: boolean;
  onUpdate: (updates: Partial<RateLimitSettings>) => Promise<void>;
}

export function RateLimitSettingsForm({ settings, loading, onUpdate }: RateLimitSettingsProps) {
  const { showToast } = useToast();
  const [formData, setFormData] = useState<Partial<RateLimitSettings>>(settings || {});
  const [saving, setSaving] = useState(false);

  const handleChange = (field: keyof RateLimitSettings, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await onUpdate(formData);
      showToast('success', 'Rate limit settings updated');
    } catch (error) {
      showToast('error', 'Failed to update rate limit settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse bg-gray-200 h-96 rounded-lg" />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="bg-white rounded-xl border border-gray-200 p-6"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Rate Limiting</h3>

      <div className="space-y-6">
        {/* Global Limit */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-4">Global Rate Limit</h4>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700 min-w-fit">Requests:</label>
              <input
                type="number"
                min="100"
                value={formData.globalLimit || 10000}
                onChange={(e) => handleChange('globalLimit', parseInt(e.target.value))}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="text-sm text-gray-600">per window</span>
            </div>
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700 min-w-fit">Window:</label>
              <input
                type="number"
                min="1"
                value={formData.globalWindow || 60}
                onChange={(e) => handleChange('globalWindow', parseInt(e.target.value))}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="text-sm text-gray-600">seconds</span>
            </div>
          </div>
        </div>

        {/* Per-Org Limit */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h4 className="font-semibold text-purple-900 mb-4">Per-Organization Rate Limit</h4>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700 min-w-fit">Requests:</label>
              <input
                type="number"
                min="10"
                value={formData.perOrgLimit || 5000}
                onChange={(e) => handleChange('perOrgLimit', parseInt(e.target.value))}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="text-sm text-gray-600">per window</span>
            </div>
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700 min-w-fit">Window:</label>
              <input
                type="number"
                min="1"
                value={formData.perOrgWindow || 60}
                onChange={(e) => handleChange('perOrgWindow', parseInt(e.target.value))}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="text-sm text-gray-600">seconds</span>
            </div>
          </div>
        </div>

        {/* Per-User Limit */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-semibold text-green-900 mb-4">Per-User Rate Limit</h4>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700 min-w-fit">Requests:</label>
              <input
                type="number"
                min="1"
                value={formData.perUserLimit || 1000}
                onChange={(e) => handleChange('perUserLimit', parseInt(e.target.value))}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="text-sm text-gray-600">per window</span>
            </div>
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700 min-w-fit">Window:</label>
              <input
                type="number"
                min="1"
                value={formData.perUserWindow || 60}
                onChange={(e) => handleChange('perUserWindow', parseInt(e.target.value))}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="text-sm text-gray-600">seconds</span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
