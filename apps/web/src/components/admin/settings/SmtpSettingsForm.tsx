'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { SmtpSettings } from '@/hooks/useSettings';
import { useToast } from '../shared/ToastContext';
import { SectionLoading } from '@/components/ui/Skeleton';

interface SmtpSettingsFormProps {
  settings: SmtpSettings | null;
  loading: boolean;
  onUpdate: (settings: Partial<SmtpSettings>) => Promise<void>;
  onTest: (email: string) => Promise<void>;
}

export function SmtpSettingsForm({ settings, loading, onUpdate, onTest }: SmtpSettingsFormProps) {
  const { showToast } = useToast();
  const [formData, setFormData] = useState<Partial<SmtpSettings>>(settings || {});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  const handleChange = (field: keyof SmtpSettings, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await onUpdate(formData);
      showToast('success', 'SMTP settings updated successfully');
    } catch (error) {
      showToast('error', 'Failed to update SMTP settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testEmail) {
      showToast('info', 'Please enter an email address to test');
      return;
    }

    try {
      setTesting(true);
      await onTest(testEmail);
      showToast('success', 'Test email sent successfully');
      setTestEmail('');
    } catch (error) {
      showToast('error', 'Failed to send test email');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <SectionLoading />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-xl border border-gray-200 p-6"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-6">SMTP Configuration</h3>

      <div className="space-y-6">
        {/* Host */}
        <div>
          <label htmlFor="ff02d78" className="block text-sm font-medium text-gray-700 mb-2">SMTP Server Host</label>
          <input id="ff02d78"
            type="text"
            value={formData.host || ''}
            onChange={(e) => handleChange('host', e.target.value)}
            placeholder="smtp.gmail.com"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Port */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="ff02d91" className="block text-sm font-medium text-gray-700 mb-2">Port</label>
            <input id="ff02d91"
              type="number"
              value={formData.port || ''}
              onChange={(e) => handleChange('port', parseInt(e.target.value))}
              placeholder="587"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* From Email */}
          <div>
            <label htmlFor="ff02d103" className="block text-sm font-medium text-gray-700 mb-2">From Email</label>
            <input id="ff02d103"
              type="email"
              value={formData.fromEmail || ''}
              onChange={(e) => handleChange('fromEmail', e.target.value)}
              placeholder="noreply@campaignsites.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Username */}
        <div>
          <label htmlFor="ff02d116" className="block text-sm font-medium text-gray-700 mb-2">Username</label>
          <input id="ff02d116"
            type="text"
            value={formData.username || ''}
            onChange={(e) => handleChange('username', e.target.value)}
            placeholder="sender@gmail.com"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Password */}
        <div>
          <label htmlFor="ff02d128" className="block text-sm font-medium text-gray-700 mb-2">Password</label>
          <input id="ff02d128"
            type="password"
            value={formData.password || ''}
            onChange={(e) => handleChange('password', e.target.value)}
            placeholder={settings?.password ? '••••••••••' : 'Enter SMTP password'}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-2">Password will be encrypted when saved</p>
        </div>

        {/* Security Options */}
        <div className="space-y-3">
          <label htmlFor="ff02d141" className="block text-sm font-medium text-gray-700">Security Options</label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input id="ff02d141"
                type="checkbox"
                checked={formData.tls || false}
                onChange={(e) => handleChange('tls', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Use TLS</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.ssl || false}
                onChange={(e) => handleChange('ssl', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Use SSL</span>
            </label>
          </div>
        </div>

        {/* Test Email */}
        <div className="pt-4 border-t border-gray-200">
          <label htmlFor="ff02d166" className="block text-sm font-medium text-gray-700 mb-3">Test Configuration</label>
          <div className="flex gap-3">
            <input id="ff02d166"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="test@example.com"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button type="button"
              onClick={handleTest}
              disabled={testing || !testEmail}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
            >
              {testing ? 'Sending...' : 'Send Test'}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-gray-200 flex justify-end">
          <button type="button"
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
