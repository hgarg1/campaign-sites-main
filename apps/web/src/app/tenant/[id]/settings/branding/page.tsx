'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { TenantLayout } from '@/components/tenant/shared';
import { useTenantSettings } from '@/hooks/useTenant';

export default function BrandingPage() {
  const params = useParams();
  const orgId = params.id as string;

  const { data, loading, updateSettings } = useTenantSettings(orgId);
  const [saving, setSaving] = useState(false);

  const [primaryColor, setPrimaryColor] = useState('#2563EB');
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setPrimaryColor(data.primaryColor || '#2563EB');
      setLogoUrl(data.logoUrl || '');
      setFaviconUrl(data.faviconUrl || '');
    }
  }, [data]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings({ primaryColor, logoUrl: logoUrl || null, faviconUrl: faviconUrl || null });
      setMsg('Branding saved successfully.');
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
      <TenantLayout title="Branding" orgId={orgId}>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </TenantLayout>
    );
  }

  return (
    <TenantLayout title="Branding" subtitle="Customize your organization appearance" orgId={orgId}>
      <Link href={`/tenant/${orgId}/settings`} className="text-blue-600 hover:text-blue-700 font-medium text-sm mb-6 inline-block">
        ← Back to Settings
      </Link>

      <div className="max-w-2xl">
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          <h2 className="text-lg font-bold text-gray-900">Brand Identity</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
            <div className="flex gap-3 items-center">
              <input
                type="color"
                value={primaryColor}
                onChange={e => setPrimaryColor(e.target.value)}
                className="h-12 w-20 rounded-lg border border-gray-300 cursor-pointer p-1"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={e => setPrimaryColor(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="#2563EB"
              />
              <div className="w-12 h-12 rounded-lg border border-gray-200" style={{ backgroundColor: primaryColor }} />
            </div>
            <p className="text-xs text-gray-500 mt-1">Used for buttons, links, and accent colors across your sites.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
            <input type="url" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} className={inputClass} placeholder="https://cdn.example.com/logo.png" />
            {logoUrl && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <img src={logoUrl} alt="Logo preview" className="h-12 object-contain" onError={e => (e.currentTarget.style.display = 'none')} />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Favicon URL</label>
            <input type="url" value={faviconUrl} onChange={e => setFaviconUrl(e.target.value)} className={inputClass} placeholder="https://cdn.example.com/favicon.ico" />
            {faviconUrl && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center gap-2">
                <img src={faviconUrl} alt="Favicon preview" className="h-8 w-8 object-contain" onError={e => (e.currentTarget.style.display = 'none')} />
                <span className="text-xs text-gray-500">Favicon preview</span>
              </div>
            )}
          </div>

          {msg && (
            <div className={`text-sm px-3 py-2 rounded ${msg.includes('Failed') ? 'text-red-700 bg-red-50' : 'text-green-700 bg-green-50'}`}>
              {msg}
            </div>
          )}

          <button onClick={handleSave} disabled={saving} className="bg-blue-600 text-white hover:bg-blue-700 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Branding'}
          </button>
        </div>
      </div>
    </TenantLayout>
  );
}