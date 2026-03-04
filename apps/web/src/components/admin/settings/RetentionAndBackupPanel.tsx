'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { RetentionPolicies, BackupSettings } from '@/hooks/useSettings';
import { useToast } from '../shared/ToastContext';

interface RetentionAndBackupProps {
  retention: RetentionPolicies | null;
  backup: BackupSettings | null;
  loading: boolean;
  onUpdateRetention: (updates: Partial<RetentionPolicies>) => Promise<void>;
  onTriggerBackup: () => Promise<void>;
}

export function RetentionAndBackupPanel({
  retention,
  backup,
  loading,
  onUpdateRetention,
  onTriggerBackup,
}: RetentionAndBackupProps) {
  const { showToast } = useToast();
  const [retentionData, setRetentionData] = useState<Partial<RetentionPolicies>>(retention || {});
  const [saving, setSaving] = useState(false);
  const [backingUp, setBackingUp] = useState(false);

  const handleChange = (field: keyof RetentionPolicies, value: number) => {
    setRetentionData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveRetention = async () => {
    try {
      setSaving(true);
      await onUpdateRetention(retentionData);
      showToast('success', 'Retention policies updated');
    } catch (error) {
      showToast('error', 'Failed to update retention policies');
    } finally {
      setSaving(false);
    }
  };

  const handleBackup = async () => {
    try {
      setBackingUp(true);
      await onTriggerBackup();
      showToast('success', 'Backup triggered successfully');
    } catch (error) {
      showToast('error', 'Failed to trigger backup');
    } finally {
      setBackingUp(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse bg-gray-200 h-96 rounded-lg" />;
  }

  return (
    <div className="space-y-6">
      {/* Retention Policies */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-xl border border-gray-200 p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Data Retention Policies</h3>

        <div className="space-y-6">
          {/* Deleted Websites */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Deleted Websites Retention
            </label>
            <div className="flex items-center gap-4">
              <input
                type="number"
                min="1"
                max="365"
                value={retentionData.deletedWebsitesRetention || 30}
                onChange={(e) => handleChange('deletedWebsitesRetention', parseInt(e.target.value))}
                className="w-24 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="text-sm text-gray-600">days before permanent deletion</span>
            </div>
          </div>

          {/* Deleted Users */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Deleted Users Retention
            </label>
            <div className="flex items-center gap-4">
              <input
                type="number"
                min="1"
                max="365"
                value={retentionData.deletedUsersRetention || 90}
                onChange={(e) => handleChange('deletedUsersRetention', parseInt(e.target.value))}
                className="w-24 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="text-sm text-gray-600">days before permanent deletion</span>
            </div>
          </div>

          {/* Logs */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Logs Retention</label>
            <div className="flex items-center gap-4">
              <input
                type="number"
                min="1"
                max="365"
                value={retentionData.logsRetention || 90}
                onChange={(e) => handleChange('logsRetention', parseInt(e.target.value))}
                className="w-24 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="text-sm text-gray-600">days before archival</span>
            </div>
          </div>

          {/* Save */}
          <div className="pt-4 border-t border-gray-200 flex justify-end">
            <button
              onClick={handleSaveRetention}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
            >
              {saving ? 'Saving...' : 'Save Policies'}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Backup Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="bg-white rounded-xl border border-gray-200 p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Backup Settings</h3>

        {backup && (
          <div className="space-y-6">
            {/* Status Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="text-sm text-blue-600 font-medium mb-1">Backup Status</div>
                <div className={`text-2xl font-bold ${backup.enabled ? 'text-green-600' : 'text-red-600'}`}>
                  {backup.enabled ? '✓ Enabled' : '✗ Disabled'}
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <div className="text-sm text-purple-600 font-medium mb-1">Last Backup</div>
                <div className="text-lg font-bold text-purple-900">
                  {backup.lastBackupAt ? new Date(backup.lastBackupAt).toLocaleDateString() : 'Never'}
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="text-sm text-green-600 font-medium mb-1">Next Scheduled</div>
                <div className="text-lg font-bold text-green-900">
                  {backup.nextBackupAt ? new Date(backup.nextBackupAt).toLocaleDateString() : 'N/A'}
                </div>
              </div>

              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <div className="text-sm text-orange-600 font-medium mb-1">Size</div>
                <div className="text-lg font-bold text-orange-900">{backup.backupSize} MB</div>
              </div>
            </div>

            {/* Frequency Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-700 mb-1">Backup Frequency</div>
              <div className="text-lg font-bold text-gray-900">{backup.frequency}</div>
            </div>

            {/* Manual Backup */}
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={handleBackup}
                disabled={backingUp}
                className="w-full px-6 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
              >
                {backingUp ? 'Creating Backup...' : '🔄 Trigger Manual Backup'}
              </button>
              <p className="text-xs text-gray-500 mt-2">
                Manual backups are created in addition to scheduled backups
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
