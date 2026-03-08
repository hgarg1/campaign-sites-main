'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { TenantLayout } from '@/components/tenant/shared/TenantLayout';

interface ReleaseAsset {
  name: string;
  browser_download_url: string;
  size: number;
  content_type: string;
}

interface Release {
  tag_name: string;
  name: string;
  prerelease: boolean;
  published_at: string;
  html_url: string;
  body: string;
  assets: ReleaseAsset[];
}

const GITHUB_REPO = 'your-org/campaign-sites-website';

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function detectPlatform(): 'mac' | 'windows' | 'linux' {
  if (typeof navigator === 'undefined') return 'windows';
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('mac')) return 'mac';
  if (ua.includes('linux')) return 'linux';
  return 'windows';
}

function getTenantAdminAssets(assets: ReleaseAsset[]) {
  return assets.filter(
    (a) =>
      a.name.toLowerCase().includes('tenant') ||
      a.name.toLowerCase().includes('campaignsites-tenant-admin')
  );
}

function categorizeAsset(asset: ReleaseAsset): { platform: string; icon: string; label: string } | null {
  const name = asset.name.toLowerCase();
  if (name.endsWith('.dmg')) return { platform: 'mac', icon: '🍎', label: 'macOS' };
  if (name.endsWith('.exe')) return { platform: 'windows', icon: '🪟', label: 'Windows' };
  if (name.endsWith('.appimage')) return { platform: 'linux', icon: '🐧', label: 'Linux (AppImage)' };
  if (name.endsWith('.deb')) return { platform: 'linux', icon: '🐧', label: 'Linux (.deb)' };
  return null;
}

export default function TenantDownloadPage() {
  const params = useParams<{ id: string }>();
  const orgId = params.id;

  const [release, setRelease] = useState<Release | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const currentPlatform = detectPlatform();

  useEffect(() => {
    fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`)
      .then((r) => {
        if (!r.ok) throw new Error('Could not fetch release info');
        return r.json();
      })
      .then((data: Release) => setRelease(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const tenantAdminAssets = release ? getTenantAdminAssets(release.assets) : [];

  return (
    <TenantLayout orgId={orgId} title="Desktop App" subtitle="Download the native desktop application">
      <div className="max-w-3xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Desktop App</h1>
          <p className="text-slate-400 mt-1">
            Download the native CampaignSites Tenant Admin desktop application for your operating
            system.
          </p>
        </div>

        {/* App card */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          {/* App header */}
          <div className="flex items-center gap-4 p-6 border-b border-slate-700">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-white">CampaignSites Tenant Admin</h2>
              <p className="text-slate-400 text-sm">
                Native desktop app for managing your organization with OS-level integration.
              </p>
              {release && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-700 text-xs text-slate-300">
                    {release.tag_name}
                  </span>
                  {release.prerelease && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-900/50 text-amber-400 text-xs border border-amber-700">
                      Canary
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Features */}
          <div className="p-6 border-b border-slate-700">
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: '🔔', text: 'Native OS notifications' },
                { icon: '🔄', text: 'Auto-updates via GitHub' },
                { icon: '🖥️', text: 'System tray integration' },
                { icon: '🔒', text: 'Secure local session storage' },
                { icon: '🏢', text: 'Multi-org quick switcher' },
                { icon: '🌐', text: 'Protocol handler (campaignsites-tenant://)' },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-center gap-2 text-sm text-slate-300">
                  <span>{icon}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Downloads */}
          <div className="p-6">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500" />
                <span className="ml-3 text-slate-400">Fetching latest release…</span>
              </div>
            )}

            {error && (
              <div className="px-4 py-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
                <strong>Could not fetch release info:</strong> {error}
                <br />
                <a
                  href={`https://github.com/${GITHUB_REPO}/releases/latest`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline mt-1 inline-block"
                >
                  View on GitHub →
                </a>
              </div>
            )}

            {!loading && !error && tenantAdminAssets.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <p>No desktop app builds available yet.</p>
                <p className="text-sm mt-1">
                  Builds are created automatically when a tagged release is published.
                </p>
              </div>
            )}

            {!loading && tenantAdminAssets.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">
                  Download for your platform
                </p>
                {tenantAdminAssets.map((asset) => {
                  const info = categorizeAsset(asset);
                  if (!info) return null;
                  const isCurrentPlatform = info.platform === currentPlatform;
                  return (
                    <a
                      key={asset.name}
                      href={asset.browser_download_url}
                      className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                        isCurrentPlatform
                          ? 'bg-indigo-600/20 border-indigo-500 hover:bg-indigo-600/30'
                          : 'bg-slate-700/50 border-slate-600 hover:bg-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{info.icon}</span>
                        <div>
                          <p className="font-medium text-white text-sm">{info.label}</p>
                          <p className="text-xs text-slate-400">{asset.name} · {formatBytes(asset.size)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isCurrentPlatform && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                            Recommended
                          </span>
                        )}
                        <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* View all releases link */}
        <div className="text-center">
          <a
            href={`https://github.com/${GITHUB_REPO}/releases`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            View all releases on GitHub →
          </a>
        </div>
      </div>
    </TenantLayout>
  );
}
