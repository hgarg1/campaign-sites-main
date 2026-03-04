'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { PasswordPolicy } from '@/hooks/useSettings';
import { useToast } from '../shared/ToastContext';

interface PasswordPolicyFormProps {
  policy: PasswordPolicy | null;
  loading: boolean;
  onUpdate: (updates: Partial<PasswordPolicy>) => Promise<void>;
}

export function PasswordPolicyForm({ policy, loading, onUpdate }: PasswordPolicyFormProps) {
  const { showToast } = useToast();
  const [formData, setFormData] = useState<Partial<PasswordPolicy>>(policy || {});
  const [saving, setSaving] = useState(false);

  const handleChange = (field: keyof PasswordPolicy, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await onUpdate(formData);
      showToast('success', 'Password policy updated');
    } catch (error) {
      showToast('error', 'Failed to update password policy');
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
      transition={{ duration: 0.3 }}
      className="bg-white rounded-xl border border-gray-200 p-6"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Password Policy</h3>

      <div className="space-y-6">
        {/* Minimum Length */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Password Length</label>
          <div className="flex items-center gap-4">
            <input
              type="number"
              min="1"
              max="128"
              value={formData.minLength || 8}
              onChange={(e) => handleChange('minLength', parseInt(e.target.value))}
              className="w-20 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="text-sm text-gray-600">characters</span>
          </div>
        </div>

        {/* Requirements Checkboxes */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">Requirements</label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.requireUppercase || false}
              onChange={(e) => handleChange('requireUppercase', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Require uppercase letters (A-Z)</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.requireNumbers || false}
              onChange={(e) => handleChange('requireNumbers', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Require numbers (0-9)</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.requireSpecialChars || false}
              onChange={(e) => handleChange('requireSpecialChars', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Require special characters (!@#$%^&*)</span>
          </label>
        </div>

        {/* Expiration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Password Expiration</label>
          <div className="flex items-center gap-4">
            <input
              type="number"
              min="0"
              value={formData.expirationDays ?? ''}
              onChange={(e) => handleChange('expirationDays', e.target.value ? parseInt(e.target.value) : null)}
              placeholder="Leave empty to disable"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="text-sm text-gray-600">days (0 = disabled)</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Users will be forced to change their password after this many days
          </p>
        </div>

        {/* Password History */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Password History</label>
          <div className="flex items-center gap-4">
            <input
              type="number"
              min="0"
              max="12"
              value={formData.historyCount || 0}
              onChange={(e) => handleChange('historyCount', parseInt(e.target.value))}
              className="w-20 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="text-sm text-gray-600">previous passwords to remember</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">Users cannot reuse recent passwords</p>
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
