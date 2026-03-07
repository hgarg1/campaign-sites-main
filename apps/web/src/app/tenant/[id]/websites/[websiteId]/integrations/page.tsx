'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { TenantLayout } from '@/components/tenant/shared';
import { useTenantWebsiteIntegrations, TenantWebsiteIntegration } from '@/hooks/useTenantWebsites';

interface ProviderDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'FUNDRAISING' | 'CRM' | 'EMAIL' | 'ANALYTICS';
}

const PROVIDERS: ProviderDef[] = [
  { id: 'actblue', name: 'ActBlue', description: 'Online fundraising for Democratic campaigns', icon: '💙', type: 'FUNDRAISING' },
  { id: 'anedot', name: 'Anedot', description: 'Conservative fundraising platform', icon: '🔴', type: 'FUNDRAISING' },
  { id: 'google_analytics', name: 'Google Analytics', description: 'Track website visitors and conversions', icon: '📊', type: 'ANALYTICS' },
  { id: 'facebook_pixel', name: 'Facebook Pixel', description: 'Track conversions from Facebook ads', icon: '📘', type: 'ANALYTICS' },
  { id: 'mailchimp', name: 'Mailchimp', description: 'Email marketing and list management', icon: '✉️', type: 'EMAIL' },
];

export default function WebsiteIntegrationsPage() {
  const params = useParams();
  const orgId = params.id as string;
  const websiteId = params.websiteId as string;

  const { data, loading, createIntegration, updateIntegration, deleteIntegration } = useTenantWebsiteIntegrations(orgId, websiteId);

  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const getExisting = (providerId: string): TenantWebsiteIntegration | undefined => data.find(d => d.provider === providerId);

  const handleEnable = async (provider: ProviderDef) => {
    setSaving(provider.id);
    try {
      await createIntegration({ type: provider.type, provider: provider.id, isActive: true });
      setMsg(`${provider.name} enabled.`);
      setTimeout(() => setMsg(null), 3000);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed to enable');
    } finally {
      setSaving(null);
    }
  };

  const handleToggle = async (integration: TenantWebsiteIntegration) => {
    try {
      await updateIntegration(integration.id, { isActive: !integration.isActive });
    } catch {}
  };

  const handleDelete = async (integration: TenantWebsiteIntegration, providerName: string) => {
    if (!confirm(`Remove ${providerName} integration?`)) return;
    try {
      await deleteIntegration(integration.id);
      setMsg(`${providerName} removed.`);
      setTimeout(() => setMsg(null), 3000);
    } catch {}
  };

  return (
    <TenantLayout title="Website Integrations" subtitle="Connect third-party services" orgId={orgId}>
      <div className="mb-4 flex items-center gap-4">
        <Link href={`/tenant/${orgId}/websites/${websiteId}`} className="text-blue-600 hover:text-blue-700 font-medium text-sm">
          ← Back to Website
        </Link>
        {msg && <p className="text-sm text-green-700">{msg}</p>}
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {PROVIDERS.map(provider => {
            const existing = getExisting(provider.id);

            return (
              <div key={provider.id} className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{provider.icon}</span>
                    <div>
                      <p className="font-semibold text-gray-900">{provider.name}</p>
                      <p className="text-sm text-gray-500">{provider.description}</p>
                      <span className="text-xs text-gray-400">{provider.type}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {existing ? (
                      <>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${existing.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                          {existing.isActive ? 'Active' : 'Disabled'}
                        </span>
                        <button
                          onClick={() => handleToggle(existing)}
                          className="text-xs font-medium px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50"
                        >
                          {existing.isActive ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => handleDelete(existing, provider.name)}
                          className="text-xs font-medium px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleEnable(provider)}
                        disabled={saving === provider.id}
                        className="bg-blue-600 text-white hover:bg-blue-700 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                      >
                        {saving === provider.id ? 'Enabling...' : 'Enable'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </TenantLayout>
  );
}