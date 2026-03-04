'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { SessionPolicy } from '@/hooks/useSettings';
import { useToast } from '../shared/ToastContext';

interface SessionPolicyFormProps {
  policy: SessionPolicy | null;
  loading: boolean;
  onUpdate: (updates: Partial<SessionPolicy>) => Promise<void>;
}

export function SessionPolicyForm({ policy, loading, onUpdate }: SessionPolicyFormProps) {
  const { showToast } = useToast();
  const [formData, setFormData] = useState<Partial<SessionPolicy>>(policy || {});
  const [saving, setSaving] = useState(false);

  const handleChange = (field: keyof SessionPolicy, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await onUpdate(formData);
      showToast('success', 'Session policy updated');
    } catch (error) {
      showToast('error', 'Failed to update session policy');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse bg-gray-200 h-64 rounded-lg" />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="bg-white rounded-xl border border-gray-200 p-6"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Session Policy</h3>

      <div className="space-y-6">
        {/* Session Timeout */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout</label>
          <div className="flex items-center gap-4">
            <input
              type="number"
              min="5"
              max="1440"
              value={formData.timeoutMinutes || 30}
              onChange={(e) => handleChange('timeoutMinutes', parseInt(e.target.value))}
              className="w-24 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="text-sm text-gray-600">minutes of inactivity</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">Users will be logged out after this period of no activity</p>
        </div>

        {/* Remember Me Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Remember Me Duration</label>
          <div className="flex items-center gap-4">
            <input
              type="number"
              min="1"
              max="365"
              value={formData.rememberMeDuration || 30}
              onChange={(e) => handleChange('rememberMeDuration', parseInt(e.target.value))}
              className="w-24 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="text-sm text-gray-600">days</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">How long the session persists when "Remember me" is checked</p>
        </div>

        {/* Concurrent Sessions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Max Concurrent Sessions per User</label>
          <div className="flex items-center gap-4">
            <input
              type="number"
              min="1"
              max="10"
              value={formData.maxConcurrentSessions || 5}
              onChange={(e) => handleChange('maxConcurrentSessions', parseInt(e.target.value))}
              className="w-20 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="text-sm text-gray-600">sessions</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">Limit the number of active sessions per user</p>
        </div>

        {/* IP Change Detection */}
        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.forceLogoutOnIpChange || false}
              onChange={(e) => handleChange('forceLogoutOnIpChange', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Force logout on IP address change</span>
          </label>
          <p className="text-xs text-gray-500 mt-2">
            Automatically logout users if their IP address changes during a session
          </p>
        </div>

        {/* Save Button */}
        <div className="pt-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
          >
            {saving ? 'Saving...' : 'Save Policy'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
