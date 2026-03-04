'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/shared';
import {
  SmtpSettingsForm,
  ApiKeysManager,
  PasswordPolicyForm,
  SessionPolicyForm,
  RateLimitSettingsForm,
  FeatureFlagsManager,
  RetentionAndBackupPanel,
} from '@/components/admin/settings';
import {
  useEmailSettings,
  useApiKeys,
  useSecurityPolicies,
  useRateLimitSettings,
  useFeatureFlags,
  useDataRetention,
} from '@/hooks/useSettings';

type TabType = 'email' | 'api' | 'security' | 'ratelimit' | 'retention' | 'features';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('email');
  const handleTabChange = useCallback((tabId: TabType) => {
    setActiveTab(tabId);
  }, []);

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get('tab');
    if (
      tab === 'api' ||
      tab === 'security' ||
      tab === 'ratelimit' ||
      tab === 'retention' ||
      tab === 'features'
    ) {
      setActiveTab(tab);
    }
  }, []);

  // Hooks
  const emailSettings = useEmailSettings();
  const apiKeys = useApiKeys();
  const securityPolicies = useSecurityPolicies();
  const rateLimits = useRateLimitSettings();
  const features = useFeatureFlags();
  const dataRetention = useDataRetention();

  const tabs = useMemo<{ id: TabType; label: string; icon: string }[]>(() => [
    { id: 'email', label: 'Email Configuration', icon: '📧' },
    { id: 'api', label: 'API Keys & Webhooks', icon: '🔑' },
    { id: 'security', label: 'Security Policies', icon: '🔒' },
    { id: 'ratelimit', label: 'Rate Limiting', icon: '⚡' },
    { id: 'retention', label: 'Data & Backup', icon: '💾' },
    { id: 'features', label: 'Feature Flags', icon: '🚩' },
  ], []);

  return (
    <AdminLayout
      title="System Settings"
      subtitle="Configure system settings, policies, and features"
    >
      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 overflow-x-auto">
        <nav className="-mb-px flex gap-6 sm:gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Email Configuration Tab */}
      {activeTab === 'email' && (
        <div className="space-y-6">
          <SmtpSettingsForm
            settings={emailSettings.data}
            loading={emailSettings.loading}
            onUpdate={emailSettings.updateSettings}
            onTest={emailSettings.testEmail}
          />
        </div>
      )}

      {/* API Keys & Webhooks Tab */}
      {activeTab === 'api' && (
        <div className="space-y-6">
          <ApiKeysManager
            keys={apiKeys.data}
            loading={apiKeys.loading}
            onCreate={apiKeys.createKey}
            onRevoke={apiKeys.revokeKey}
          />
        </div>
      )}

      {/* Security Policies Tab */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PasswordPolicyForm
            policy={securityPolicies.password}
            loading={securityPolicies.loading}
            onUpdate={securityPolicies.updatePasswordPolicy}
          />
          <SessionPolicyForm
            policy={securityPolicies.session}
            loading={securityPolicies.loading}
            onUpdate={securityPolicies.updateSessionPolicy}
          />
        </div>
      )}

      {/* Rate Limiting Tab */}
      {activeTab === 'ratelimit' && (
        <div className="space-y-6">
          <RateLimitSettingsForm
            settings={rateLimits.data}
            loading={rateLimits.loading}
            onUpdate={rateLimits.updateSettings}
          />
        </div>
      )}

      {/* Data & Backup Tab */}
      {activeTab === 'retention' && (
        <div className="space-y-6">
          <RetentionAndBackupPanel
            retention={dataRetention.policies}
            backup={dataRetention.backup}
            loading={dataRetention.loading}
            onUpdateRetention={dataRetention.updatePolicies}
            onTriggerBackup={dataRetention.triggerManualBackup}
          />
        </div>
      )}

      {/* Feature Flags Tab */}
      {activeTab === 'features' && (
        <div className="space-y-6">
          <FeatureFlagsManager
            flags={features.data}
            loading={features.loading}
            onToggle={features.toggleFlag}
            onUpdateRollout={(flagId, percentage) =>
              features.updateFlag(flagId, { rolloutPercentage: percentage })
            }
          />
        </div>
      )}
    </AdminLayout>
  );
}
