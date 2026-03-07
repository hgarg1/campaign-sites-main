'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { TenantLayout } from '@/components/tenant/shared';
import { useTenantIntegrations, TenantIntegration } from '@/hooks/useTenant';

interface ProviderDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'FUNDRAISING' | 'CRM' | 'EMAIL' | 'ANALYTICS';
  fields: { key: string; label: string; secret?: boolean; placeholder?: string }[];
}

const PROVIDERS: ProviderDef[] = [
  {
    id: 'actblue',
    name: 'ActBlue',
    description: 'Online fundraising for Democratic campaigns',
    icon: '💙',
    type: 'FUNDRAISING',
    fields: [
      { key: 'entityId', label: 'Entity ID', placeholder: 'ActBlue entity ID' },
      { key: 'apiKey', label: 'API Key', secret: true, placeholder: 'API key' },
    ],
  },
  {
    id: 'anedot',
    name: 'Anedot',
    description: 'Conservative fundraising platform',
    icon: '🔴',
    type: 'FUNDRAISING',
    fields: [
      { key: 'accountId', label: 'Account ID', placeholder: 'Anedot account ID' },
      { key: 'apiKey', label: 'API Key', secret: true, placeholder: 'API key' },
    ],
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'CRM for managing donor relationships',
    icon: '☁️',
    type: 'CRM',
    fields: [
      { key: 'instanceUrl', label: 'Instance URL', placeholder: 'https://yourorg.salesforce.com' },
      { key: 'clientId', label: 'Client ID', placeholder: 'Connected app client ID' },
      { key: 'clientSecret', label: 'Client Secret', secret: true, placeholder: 'Client secret' },
    ],
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'Marketing and CRM platform',
    icon: '🟠',
    type: 'CRM',
    fields: [
      { key: 'apiKey', label: 'API Key / Access Token', secret: true, placeholder: 'HubSpot access token' },
      { key: 'portalId', label: 'Portal ID', placeholder: 'HubSpot portal ID' },
    ],
  },
  {
    id: 'google_analytics',
    name: 'Google Analytics',
    description: 'Track visitors and conversions across all sites',
    icon: '📊',
    type: 'ANALYTICS',
    fields: [
      { key: 'measurementId', label: 'Measurement ID', placeholder: 'G-XXXXXXXXXX' },
    ],
  },
];

const TYPE_BADGE: Record<string, string> = {
  FUNDRAISING: 'bg-green-100 text-green-700',
  CRM: 'bg-purple-100 text-purple-700',
  EMAIL: 'bg-blue-100 text-blue-700',
  ANALYTICS: 'bg-orange-100 text-orange-700',
};

function maskValue(val: string): string {
  return val.length <= 4 ? '••••' : '••••••••' + val.slice(-4);
}

interface TestResult {
  success: boolean;
  message: string;
  statusCode?: number;
}

export default function OrgIntegrationsPage() {
  const params = useParams();
  const orgId = params.id as string;

  const { data, loading, createIntegration, toggleIntegration, deleteIntegration, refetch } = useTenantIntegrations(orgId);

  // Modal state
  const [modalProvider, setModalProvider] = useState<ProviderDef | null>(null);
  const [modalConfig, setModalConfig] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgError, setMsgError] = useState(false);

  // Test connection state per integration id
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});

  const getExisting = (providerId: string): TenantIntegration | undefined =>
    data.find(d => d.provider === providerId);

  const showMsg = (text: string, isError = false) => {
    setMsg(text);
    setMsgError(isError);
    setTimeout(() => setMsg(null), 4000);
  };

  const openModal = (provider: ProviderDef) => {
    setModalProvider(provider);
    setModalConfig({});
  };

  const handleModalSave = async () => {
    if (!modalProvider) return;
    setSaving(true);
    try {
      await createIntegration({
        type: modalProvider.type,
        provider: modalProvider.id,
        isActive: true,
        config: modalConfig,
      });
      showMsg(`${modalProvider.name} integration saved.`);
      setModalProvider(null);
    } catch (e) {
      showMsg(e instanceof Error ? e.message : 'Failed to save', true);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (integrationId: string, isActive: boolean) => {
    try {
      await toggleIntegration(integrationId, isActive);
    } catch {
      showMsg('Failed to toggle integration', true);
    }
  };

  const handleDelete = async (integrationId: string, providerName: string) => {
    if (!confirm(`Remove ${providerName} integration?`)) return;
    try {
      await deleteIntegration(integrationId);
      showMsg(`${providerName} integration removed.`);
    } catch {
      showMsg('Failed to remove integration', true);
    }
  };

  const handleTest = async (integrationId: string) => {
    setTesting(integrationId);
    try {
      const res = await fetch(`/api/tenant/${orgId}/integrations/${integrationId}/test`, { method: 'POST' });
      const json = await res.json() as TestResult;
      setTestResults(prev => ({ ...prev, [integrationId]: json }));
      setTimeout(() => setTestResults(prev => {
        const next = { ...prev };
        delete next[integrationId];
        return next;
      }), 5000);
    } catch {
      setTestResults(prev => ({ ...prev, [integrationId]: { success: false, message: 'Connection failed' } }));
    } finally {
      setTesting(null);
    }
  };

  const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <TenantLayout title="Integrations" subtitle="Connect services to your organization" orgId={orgId}>
      {/* Security note */}
      <div className="mb-5 flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700">
        <span>🔒</span>
        <span>Credentials are encrypted at rest. Secret fields are masked after saving.</span>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">Configure integrations that apply to all websites in your organization.</p>
        {msg && <p className={`text-sm ${msgError ? 'text-red-700' : 'text-green-700'}`}>{msg}</p>}
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="space-y-4">
          {PROVIDERS.map(provider => {
            const existing = getExisting(provider.id);
            const testResult = existing ? testResults[existing.id] : undefined;

            return (
              <div key={provider.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between p-6">
                  {/* Left: icon + name + description + type */}
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{provider.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{provider.name}</p>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${TYPE_BADGE[provider.type] ?? 'bg-gray-100 text-gray-600'}`}>
                          {provider.type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{provider.description}</p>
                      {existing?.updatedAt && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Last updated {new Date(existing.updatedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: actions */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {existing ? (
                      <>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${existing.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                          {existing.isActive ? 'Active' : 'Disabled'}
                        </span>

                        {/* Test connection */}
                        <button
                          onClick={() => handleTest(existing.id)}
                          disabled={testing === existing.id}
                          className="text-xs font-medium px-2 py-1 rounded border border-blue-200 text-blue-600 hover:bg-blue-50 disabled:opacity-50 flex items-center gap-1"
                        >
                          {testing === existing.id ? (
                            <><span className="animate-spin inline-block">⟳</span> Testing…</>
                          ) : 'Test'}
                        </button>

                        {/* Edit credentials */}
                        <button
                          onClick={() => openModal(provider)}
                          className="text-xs font-medium px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => handleToggle(existing.id, !existing.isActive)}
                          className="text-xs font-medium px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50"
                        >
                          {existing.isActive ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => handleDelete(existing.id, provider.name)}
                          className="text-xs font-medium px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-xs text-gray-400">Not configured</span>
                        <button
                          onClick={() => openModal(provider)}
                          className="text-xs font-medium px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700"
                        >
                          Configure
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Masked credential display when configured */}
                {existing && Object.keys(existing.config).length > 0 && (
                  <div className="px-6 pb-4 border-t border-gray-100 pt-3">
                    <div className="grid grid-cols-2 gap-3">
                      {provider.fields.map(field => {
                        const val = existing.config[field.key] ?? '';
                        return (
                          <div key={field.key}>
                            <p className="text-xs font-medium text-gray-500 mb-0.5">{field.label}</p>
                            <p className="text-sm text-gray-700 font-mono">
                              {val ? (field.secret ? maskValue(val) : val) : <span className="text-gray-400 italic">Not set</span>}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Test result inline */}
                {testResult && (
                  <div className={`px-6 pb-4 ${existing && Object.keys(existing.config).length > 0 ? '' : 'border-t border-gray-100 pt-3'}`}>
                    <p className={`text-sm font-medium ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                      {testResult.success ? '✓' : '✗'} {testResult.message}
                      {testResult.statusCode ? ` (${testResult.statusCode})` : ''}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Configure / Edit Modal ── */}
      {modalProvider && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl border border-gray-200 p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              Configure {modalProvider.name}
            </h3>
            <p className="text-sm text-gray-500 mb-5">{modalProvider.description}</p>

            <div className="space-y-4 mb-6">
              {modalProvider.fields.map(field => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                  <input
                    type={field.secret ? 'password' : 'text'}
                    placeholder={field.placeholder}
                    value={modalConfig[field.key] ?? ''}
                    onChange={e => setModalConfig(prev => ({ ...prev, [field.key]: e.target.value }))}
                    className={inputClass}
                    autoComplete="off"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleModalSave}
                disabled={saving}
                className="bg-blue-600 text-white hover:bg-blue-700 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save & Enable'}
              </button>
              <button
                onClick={() => setModalProvider(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </TenantLayout>
  );
}