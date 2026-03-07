'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { TenantLayout } from '@/components/tenant/shared';
import { useTenantSettings } from '@/hooks/useTenant';

type Tab = 'general' | 'branding' | 'billing' | 'notifications';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'general', label: 'General', icon: '⚙️' },
  { id: 'branding', label: 'Branding', icon: '🎨' },
  { id: 'billing', label: 'Billing', icon: '💳' },
  { id: 'notifications', label: 'Notifications', icon: '🔔' },
];

export default function SettingsPage() {
  const params = useParams();
  const orgId = params.id as string;
  const [activeTab, setActiveTab] = useState<Tab>('general');

  const { data, loading, updateSettings } = useTenantSettings(orgId);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#2563EB');
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [notifyOnBuildComplete, setNotifyOnBuildComplete] = useState(true);
  const [notifyOnBuildFailed, setNotifyOnBuildFailed] = useState(true);
  const [notifyOnTeamChanges, setNotifyOnTeamChanges] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setName(data.name || '');
      setSlug(data.slug || '');
      setDescription(data.description || '');
      setCustomDomain(data.customDomain || '');
      setPrimaryColor(data.primaryColor || '#2563EB');
      setLogoUrl(data.logoUrl || '');
      setFaviconUrl(data.faviconUrl || '');
      setNotifyOnBuildComplete(data.notifyOnBuildComplete ?? true);
      setNotifyOnBuildFailed(data.notifyOnBuildFailed ?? true);
      setNotifyOnTeamChanges(data.notifyOnTeamChanges ?? false);
      setWebhookUrl(data.webhookUrl || '');
    }
  }, [data]);

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      await updateSettings({
        name,
        slug,
        description: description || null,
        customDomain: customDomain || null,
        primaryColor,
        logoUrl: logoUrl || null,
        faviconUrl: faviconUrl || null,
        notifyOnBuildComplete,
        notifyOnBuildFailed,
        notifyOnTeamChanges,
        webhookUrl: webhookUrl || null,
      });
      setMsg('Settings saved successfully.');
      setTimeout(() => setMsg(null), 3000);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  if (loading) {
    return (
      <TenantLayout title="Settings" orgId={orgId}>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </TenantLayout>
    );
  }

  return (
    <TenantLayout title="Settings" subtitle="Manage your organization settings" orgId={orgId}>
      <div className="flex gap-6">
        <div className="w-48 flex-shrink-0">
          <nav className="space-y-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                  activeTab === tab.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
          <div className="mt-4 space-y-1 border-t border-gray-200 pt-4">
            <Link href={`/tenant/${orgId}/settings/branding`} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-500 hover:bg-gray-100">
              Full Branding Page →
            </Link>
            <Link href={`/tenant/${orgId}/settings/billing`} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-500 hover:bg-gray-100">
              Full Billing Page →
            </Link>
            <Link href={`/tenant/${orgId}/settings/notifications`} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-500 hover:bg-gray-100">
              Full Notifications Page →
            </Link>
          </div>
        </div>

        <div className="flex-1">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            {activeTab === 'general' && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-gray-900 mb-4">General Settings</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                  <input type="text" value={slug} onChange={e => setSlug(e.target.value)} className={inputClass} />
                  <p className="text-xs text-gray-500 mt-1">Used in your portal URL.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Custom Domain</label>
                  <input type="text" value={customDomain} onChange={e => setCustomDomain(e.target.value)} className={inputClass} placeholder="portal.mycampaign.com" />
                </div>
              </div>
            )}

            {activeTab === 'branding' && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Branding</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="h-10 w-16 rounded border border-gray-300 cursor-pointer" />
                    <input type="text" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="#2563EB" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
                  <input type="url" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} className={inputClass} placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Favicon URL</label>
                  <input type="url" value={faviconUrl} onChange={e => setFaviconUrl(e.target.value)} className={inputClass} placeholder="https://..." />
                </div>
              </div>
            )}

            {activeTab === 'billing' && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Billing</h2>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-700">Current Plan: <strong>Pro</strong></p>
                  <p className="text-sm text-blue-600 mt-1">$49/month · Renews on the 1st</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-gray-900 mb-2">Plan Features</p>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>✓ Up to 10 websites</li>
                    <li>✓ 100 builds/month</li>
                    <li>✓ 10 GB storage</li>
                    <li>✓ 5 team members</li>
                    <li>✓ Priority support</li>
                  </ul>
                </div>
                <Link href={`/tenant/${orgId}/settings/billing`} className="text-blue-600 hover:text-blue-700 text-sm font-medium inline-block">
                  Manage billing and invoices →
                </Link>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Notifications</h2>
                <div className="space-y-3">
                  {[
                    { id: 'buildComplete', label: 'Build completed', checked: notifyOnBuildComplete, onChange: setNotifyOnBuildComplete },
                    { id: 'buildFailed', label: 'Build failed', checked: notifyOnBuildFailed, onChange: setNotifyOnBuildFailed },
                    { id: 'teamChanges', label: 'Team member changes', checked: notifyOnTeamChanges, onChange: setNotifyOnTeamChanges },
                  ].map(n => (
                    <div key={n.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100">
                      <input type="checkbox" id={n.id} checked={n.checked} onChange={e => n.onChange(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                      <label htmlFor={n.id} className="text-sm font-medium text-gray-700">{n.label}</label>
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Webhook URL</label>
                  <input type="url" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} className={inputClass} placeholder="https://your-server.com/webhook" />
                </div>
              </div>
            )}

            {msg && (
              <div className={`mt-4 text-sm px-3 py-2 rounded ${msg.includes('Failed') ? 'text-red-700 bg-red-50' : 'text-green-700 bg-green-50'}`}>
                {msg}
              </div>
            )}

            {activeTab !== 'billing' && (
              <div className="mt-6 pt-4 border-t border-gray-100">
                <button onClick={handleSave} disabled={saving} className="bg-blue-600 text-white hover:bg-blue-700 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </TenantLayout>
  );
}