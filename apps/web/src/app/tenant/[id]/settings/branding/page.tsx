'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { TenantLayout } from '@/components/tenant/shared';
import { useTenantSettings } from '@/hooks/useTenant';
import { DEFAULT_THEME, PARTY_THEMES, TenantTheme } from '@/lib/tenant-theme';

function ColorField({
  label,
  value,
  onChange,
  inherited,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  inherited?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        {inherited && (
          <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
            ↑ inherited
          </span>
        )}
      </div>
      <div className="flex gap-3 items-center">
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="h-10 w-16 rounded-lg border border-gray-300 cursor-pointer p-1"
        />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="#000000"
        />
        <div className="w-10 h-10 rounded-lg border border-gray-200 flex-shrink-0" style={{ backgroundColor: value }} />
      </div>
    </div>
  );
}

export default function BrandingPage() {
  const params = useParams();
  const orgId = params.id as string;

  const { data, loading, updateSettings } = useTenantSettings(orgId);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [primaryColor, setPrimaryColor] = useState(DEFAULT_THEME.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(DEFAULT_THEME.secondaryColor);
  const [accentColor, setAccentColor] = useState(DEFAULT_THEME.accentColor);
  const [sidebarFrom, setSidebarFrom] = useState(DEFAULT_THEME.sidebarFrom);
  const [sidebarTo, setSidebarTo] = useState(DEFAULT_THEME.sidebarTo);
  const [topbarBg, setTopbarBg] = useState(DEFAULT_THEME.topbarBg);
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');

  const [inheritedTheme, setInheritedTheme] = useState<TenantTheme | null>(null);
  const [inheritedFrom, setInheritedFrom] = useState<string | null>(null);
  const [partyAffiliation, setPartyAffiliation] = useState<string | null>(null);

  // Populate from settings data
  useEffect(() => {
    if (data) {
      const d = data as any;
      setPrimaryColor(d.primaryColor || DEFAULT_THEME.primaryColor);
      setSecondaryColor(d.secondaryColor || DEFAULT_THEME.secondaryColor);
      setAccentColor(d.accentColor || DEFAULT_THEME.accentColor);
      setSidebarFrom(d.sidebarFrom || DEFAULT_THEME.sidebarFrom);
      setSidebarTo(d.sidebarTo || DEFAULT_THEME.sidebarTo);
      setTopbarBg(d.topbarBg || DEFAULT_THEME.topbarBg);
      setLogoUrl(d.logoUrl || '');
      setFaviconUrl(d.faviconUrl || '');
    }
  }, [data]);

  // Fetch effective theme + party affiliation
  useEffect(() => {
    fetch(`/api/tenant/${orgId}/effective-theme`)
      .then(r => r.ok ? r.json() : null)
      .then(res => {
        if (res?.theme) setInheritedTheme(res.theme);
        if (res?.inheritedFrom) setInheritedFrom(res.inheritedFrom);
      })
      .catch(() => {});

    fetch(`/api/tenant/${orgId}`)
      .then(r => r.ok ? r.json() : null)
      .then(res => {
        if (res?.partyAffiliation) setPartyAffiliation(res.partyAffiliation);
      })
      .catch(() => {});
  }, [orgId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await (updateSettings as (u: any) => Promise<void>)({
        primaryColor,
        secondaryColor,
        accentColor,
        sidebarFrom,
        sidebarTo,
        topbarBg,
        logoUrl: logoUrl || null,
        faviconUrl: faviconUrl || null,
      });
      setMsg('Branding saved successfully.');
      setTimeout(() => setMsg(null), 3000);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToParty = () => {
    const party = partyAffiliation ?? 'NONPARTISAN';
    const pt = PARTY_THEMES[party] ?? {};
    setPrimaryColor(pt.primaryColor ?? DEFAULT_THEME.primaryColor);
    setSecondaryColor(pt.secondaryColor ?? DEFAULT_THEME.secondaryColor);
    setAccentColor(pt.accentColor ?? DEFAULT_THEME.accentColor);
    setSidebarFrom(pt.sidebarFrom ?? DEFAULT_THEME.sidebarFrom);
    setSidebarTo(pt.sidebarTo ?? DEFAULT_THEME.sidebarTo);
    setTopbarBg(DEFAULT_THEME.topbarBg);
  };

  const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  const isInherited = (field: keyof TenantTheme) => {
    if (!inheritedFrom || !inheritedTheme) return false;
    const d = data as any;
    return !d?.[field] && !!inheritedTheme[field];
  };

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

      <div className="flex gap-8 items-start">
        {/* Left: form */}
        <div className="flex-1 max-w-2xl space-y-6">
          {/* Palette */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Palette</h2>
              {partyAffiliation && PARTY_THEMES[partyAffiliation] && (
                <button
                  onClick={handleResetToParty}
                  className="text-xs text-indigo-600 hover:text-indigo-800 border border-indigo-200 bg-indigo-50 rounded px-2 py-1 font-medium"
                >
                  Reset to {partyAffiliation.charAt(0) + partyAffiliation.slice(1).toLowerCase()} defaults
                </button>
              )}
            </div>

            {inheritedFrom && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                Some fields are inherited from <strong>{inheritedFrom}</strong>. Override them here to customize.
              </p>
            )}

            <ColorField label="Primary Color" value={primaryColor} onChange={setPrimaryColor} inherited={isInherited('primaryColor')} />
            <ColorField label="Secondary Color" value={secondaryColor} onChange={setSecondaryColor} inherited={isInherited('secondaryColor')} />
            <ColorField label="Accent Color" value={accentColor} onChange={setAccentColor} inherited={isInherited('accentColor')} />
            <ColorField label="Sidebar Start" value={sidebarFrom} onChange={setSidebarFrom} inherited={isInherited('sidebarFrom')} />
            <ColorField label="Sidebar End" value={sidebarTo} onChange={setSidebarTo} inherited={isInherited('sidebarTo')} />
            <ColorField label="Topbar Background" value={topbarBg} onChange={setTopbarBg} inherited={isInherited('topbarBg')} />
          </div>

          {/* Assets */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
            <h2 className="text-lg font-bold text-gray-900">Assets</h2>

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
          </div>

          {msg && (
            <div className={`text-sm px-3 py-2 rounded ${msg.includes('Failed') ? 'text-red-700 bg-red-50' : 'text-green-700 bg-green-50'}`}>
              {msg}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white hover:bg-blue-700 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Branding'}
          </button>
        </div>

        {/* Right: live preview */}
        <div className="sticky top-8">
          <p className="text-sm font-medium text-gray-700 mb-3">Portal Preview</p>
          <div className="rounded-xl overflow-hidden border border-gray-200 shadow-lg w-48">
            <div className="h-36 p-3" style={{ background: `linear-gradient(to bottom, ${sidebarFrom}, ${sidebarTo})` }}>
              <div className="text-white text-xs font-bold mb-2">CampaignSites</div>
              {['Websites', 'Team', 'Analytics'].map(label => (
                <div key={label} className="text-xs rounded px-2 py-0.5 mb-1 text-white/70">{label}</div>
              ))}
              <div className="text-xs rounded px-2 py-0.5 mb-1 text-white font-medium" style={{ backgroundColor: primaryColor }}>
                Dashboard
              </div>
            </div>
            <div className="h-8 flex items-center px-3 text-xs font-medium border-b border-gray-100" style={{ backgroundColor: topbarBg }}>
              <span style={{ color: primaryColor }}>Page Title</span>
            </div>
            <div className="p-2 bg-gray-50">
              <div className="h-2 rounded-full mb-1.5" style={{ backgroundColor: primaryColor, width: '60%' }} />
              <div className="h-2 rounded-full mb-1.5 bg-gray-200" style={{ width: '80%' }} />
              <div className="h-2 rounded-full" style={{ backgroundColor: accentColor, width: '45%' }} />
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: primaryColor }} />
              <span className="text-xs text-gray-600">Primary</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: secondaryColor }} />
              <span className="text-xs text-gray-600">Secondary</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: accentColor }} />
              <span className="text-xs text-gray-600">Accent</span>
            </div>
          </div>
        </div>
      </div>
    </TenantLayout>
  );
}
