'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/shared';
import { startRegistration } from '@simplewebauthn/browser';

type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  role: 'USER' | 'ADMIN' | 'GLOBAL_ADMIN';
  requirePasskey: boolean;
};

interface PasskeyCredential {
  id: string;
  deviceName: string | null;
  transports: string[];
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

function formatDate(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

// ─── Notification Preferences Section ────────────────────────────────────────

const NOTIFICATION_CATEGORIES = [
  {
    label: 'System Events',
    types: [
      { key: 'USER_CREATED', label: 'User Created' },
      { key: 'USER_ROLE_CHANGED', label: 'User Role Changed' },
      { key: 'USER_DEACTIVATED', label: 'User Deactivated' },
      { key: 'POLICY_ASSIGNED', label: 'Policy Assigned' },
      { key: 'POLICY_REVOKED', label: 'Policy Revoked' },
      { key: 'SECURITY_ALERT', label: 'Security Alert' },
      { key: 'SYSTEM_ANNOUNCEMENT', label: 'System Announcement' },
    ],
  },
  {
    label: 'Org Events',
    types: [
      { key: 'ORG_MEMBER_ADDED', label: 'Member Added' },
      { key: 'ORG_MEMBER_REMOVED', label: 'Member Removed' },
      { key: 'ORG_ROLE_CHANGED', label: 'Role Changed' },
      { key: 'ORG_POLICY_ASSIGNED', label: 'Policy Assigned' },
    ],
  },
  {
    label: 'Governance',
    types: [
      { key: 'GOVERNANCE_VOTE_REQUESTED', label: 'Vote Requested' },
      { key: 'GOVERNANCE_VOTE_CAST', label: 'Vote Cast' },
      { key: 'GOVERNANCE_PROPOSAL_APPROVED', label: 'Proposal Approved' },
      { key: 'GOVERNANCE_PROPOSAL_REJECTED', label: 'Proposal Rejected' },
      { key: 'GOVERNANCE_PROPOSAL_EXPIRED', label: 'Proposal Expired' },
    ],
  },
  {
    label: 'Campaign',
    types: [
      { key: 'WEBSITE_PUBLISHED', label: 'Website Published' },
      { key: 'WEBSITE_BUILD_FAILED', label: 'Website Build Failed' },
    ],
  },
] as const;

function NotificationPreferencesSection() {
  const [inApp, setInApp] = useState(true);
  const [disabledTypes, setDisabledTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch('/api/notifications/settings', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        setInApp(d.inApp ?? true);
        setDisabledTypes(d.disabledTypes ?? []);
      })
      .catch(() => setError('Failed to load notification settings'))
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(
    async (newInApp: boolean, newDisabled: string[]) => {
      setSaving(true);
      setSuccess(null);
      setError(null);
      try {
        const res = await fetch('/api/notifications/settings', {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inApp: newInApp, disabledTypes: newDisabled }),
        });
        if (!res.ok) throw new Error('Failed to save');
        setSuccess('Preferences saved.');
        setTimeout(() => setSuccess(null), 3000);
      } catch {
        setError('Failed to save notification preferences.');
      } finally {
        setSaving(false);
      }
    },
    []
  );

  const handleInAppToggle = (checked: boolean) => {
    setInApp(checked);
    save(checked, disabledTypes);
  };

  const handleTypeToggle = (type: string, enabled: boolean) => {
    const newDisabled = enabled
      ? disabledTypes.filter((t) => t !== type)
      : [...disabledTypes, type];
    setDisabledTypes(newDisabled);
    save(inApp, newDisabled);
  };

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Notification Preferences</h2>
          <p className="text-sm text-gray-500">Control which in-app notifications you receive.</p>
        </div>
        {saving && <span className="text-xs text-gray-400">Saving…</span>}
      </div>

      {success && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="animate-pulse bg-gray-100 h-10 rounded-lg" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Master in-app toggle */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-800">In-App Notifications</p>
              <p className="text-xs text-gray-500 mt-0.5">Show notifications inside the admin portal.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={inApp}
                onChange={(e) => handleInAppToggle(e.target.checked)}
                className="sr-only peer"
                disabled={saving}
              />
              <div className="w-10 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
            </label>
          </div>

          {/* Per-type toggles by category */}
          {NOTIFICATION_CATEGORIES.map((cat) => (
            <div key={cat.label} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700">{cat.label}</h3>
              </div>
              <ul className="divide-y divide-gray-100">
                {cat.types.map(({ key, label }) => {
                  const enabled = !disabledTypes.includes(key);
                  return (
                    <li key={key} className="flex items-center justify-between px-5 py-3">
                      <span className="text-sm text-gray-700">{label}</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={(e) => handleTypeToggle(key, e.target.checked)}
                          className="sr-only peer"
                          disabled={saving || !inApp}
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PasskeySection({ requirePasskey }: { requirePasskey: boolean }) {
  const [credentials, setCredentials] = useState<PasskeyCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [deviceName, setDeviceName] = useState('');
  const [registering, setRegistering] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/passkeys/me')
      .then((r) => r.json())
      .then((d) => setCredentials(d.data ?? []))
      .catch(() => setError('Failed to load passkey credentials'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleRegister() {
    setRegistering(true);
    setError(null);
    try {
      const optRes = await fetch('/api/auth/passkey/register');
      if (!optRes.ok) throw new Error('Failed to get registration options');
      const options = await optRes.json();
      const regResponse = await startRegistration({ optionsJSON: options });
      const verRes = await fetch('/api/auth/passkey/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: regResponse, deviceName: deviceName.trim() || null }),
      });
      if (!verRes.ok) {
        const e = await verRes.json().catch(() => ({}));
        throw new Error(e.error ?? 'Registration failed');
      }
      setSuccess('Passkey registered successfully!');
      setDeviceName('');
      setTimeout(() => setSuccess(null), 4000);
      load();
    } catch (err) {
      if (err instanceof Error && err.name === 'NotAllowedError') return;
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setRegistering(false);
    }
  }

  async function handleRevoke(credId: string) {
    setRevoking(credId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/passkeys/me/${credId}`, { method: 'DELETE' });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'Failed to revoke');
      setSuccess('Passkey revoked.');
      setTimeout(() => setSuccess(null), 3000);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke passkey');
    } finally {
      setRevoking(null);
    }
  }

  const active = credentials.filter((c) => !c.revokedAt);
  const revoked = credentials.filter((c) => c.revokedAt);

  return (
    <div className="mt-8 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Passkeys</h2>
          <p className="text-sm text-gray-500">Use your device biometrics or PIN to sign in without a password.</p>
        </div>
        {requirePasskey && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-full text-xs font-semibold">
            🔒 Passkey Required
          </span>
        )}
      </div>

      {requirePasskey && active.length === 0 && !loading && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <span className="text-xl mt-0.5">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-amber-900">Passkey required but none registered</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Your account requires passkey authentication. Register at least one passkey below to avoid being locked out on your next sign-in.
            </p>
          </div>
        </div>
      )}

      {success && (
        <div className="px-4 py-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm">{success}</div>
      )}
      {error && (
        <div className="flex items-center justify-between px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-red-600">×</button>
        </div>
      )}

      {/* Register */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Register a New Passkey</h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            placeholder="Device name (e.g. MacBook Touch ID)"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={registering}
          />
          <button
            onClick={handleRegister}
            disabled={registering}
            className="sm:whitespace-nowrap px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {registering ? 'Registering…' : '+ Register Passkey'}
          </button>
        </div>
      </div>

      {/* Active credentials */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Active Passkeys</h3>
          <span className="text-xs text-gray-400">{active.length} credential{active.length !== 1 ? 's' : ''}</span>
        </div>
        {loading ? (
          <div className="p-5 space-y-2">
            {[1, 2].map((i) => <div key={i} className="animate-pulse bg-gray-100 h-10 rounded" />)}
          </div>
        ) : active.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm text-gray-400">No active passkeys registered.</p>
            <p className="text-xs text-gray-400 mt-1">Use the form above to add your first passkey.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {active.map((c) => (
              <li key={c.id} className="flex items-center justify-between px-5 py-3 gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{c.deviceName ?? 'Unnamed device'}</p>
                  <p className="text-xs text-gray-400">
                    Registered {formatDate(c.createdAt)}
                    {c.lastUsedAt ? ` · Last used ${formatDate(c.lastUsedAt)}` : ''}
                  </p>
                  {c.transports.length > 0 && (
                    <p className="text-xs text-gray-400 capitalize">{c.transports.join(', ')}</p>
                  )}
                </div>
                <button
                  onClick={() => handleRevoke(c.id)}
                  disabled={revoking === c.id}
                  className="flex-shrink-0 px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                >
                  {revoking === c.id ? 'Revoking…' : 'Revoke'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Revoked */}
      {revoked.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-500">Revoked ({revoked.length})</h3>
          </div>
          <ul className="divide-y divide-gray-100">
            {revoked.map((c) => (
              <li key={c.id} className="flex items-center px-5 py-3 opacity-50 gap-3">
                <span className="text-sm text-gray-500 line-through">{c.deviceName ?? 'Unnamed'}</span>
                <span className="text-xs text-gray-400">Revoked {formatDate(c.revokedAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await fetch('/api/auth/me', { credentials: 'include' });
        if (response.status === 401 || response.status === 403) {
          router.push('/login');
          return;
        }
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error ?? 'Failed to load user profile');
        }
        const data = (await response.json()) as SessionUser;
        setUser(data);
        setName(data.name ?? '');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [router]);

  const onSave = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Failed to update profile');
      setUser(data);
      setName(data.name ?? '');
      setMessage('Profile updated successfully.');
      window.dispatchEvent(new Event('user-profile-updated'));
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="Profile Settings" subtitle="Manage your account profile and passkeys">
      <div className="max-w-4xl space-y-0">
        {/* Profile row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Avatar card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                {(user?.name?.charAt(0) || user?.email?.charAt(0) || 'A').toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{user?.name || user?.email || 'Admin'}</p>
                <p className="text-xs text-gray-500">{user?.role?.replace(/_/g, ' ')}</p>
                {user?.requirePasskey && (
                  <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-full text-xs font-medium">
                    🔒 Passkey Required
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Account Type</span>
                <span className="font-medium text-gray-900">System Admin</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Session</span>
                <span className="font-medium text-green-700">Active</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Auth Method</span>
                <span className="font-medium text-gray-900">{user?.requirePasskey ? 'Passkey' : 'Password'}</span>
              </div>
            </div>
          </div>

          {/* Profile form */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 lg:col-span-2">
            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map((i) => <div key={i} className="animate-pulse bg-gray-100 h-10 rounded-lg" />)}
              </div>
            ) : (
              <form className="space-y-5" onSubmit={onSave}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={user?.email ?? ''}
                    readOnly
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
                  <input
                    type="text"
                    value={user?.role?.replace(/_/g, ' ') ?? ''}
                    readOnly
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">Display Name</label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={120}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your display name"
                  />
                  <p className="mt-1 text-xs text-gray-400">Displayed in the admin top bar and audit activity.</p>
                </div>
                {message && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{message}</p>}
                {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
                  >
                    {saving ? 'Saving…' : 'Save Profile'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setName(user?.name ?? ''); setMessage(null); setError(null); }}
                    className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Passkeys section — always visible for admin users */}
        <PasskeySection requirePasskey={user?.requirePasskey ?? false} />

        {/* Notification preferences */}
        <NotificationPreferencesSection />
      </div>
    </AdminLayout>
  );
}
                  />
                  <p className="mt-1 text-xs text-gray-400">Displayed in the admin top bar and audit activity.</p>
                </div>
                {message && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{message}</p>}
                {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
                  >
                    {saving ? 'Saving…' : 'Save Profile'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setName(user?.name ?? ''); setMessage(null); setError(null); }}
                    className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Passkeys section — always visible for admin users */}
        <PasskeySection requirePasskey={user?.requirePasskey ?? false} />

        {/* Notification preferences */}
        <NotificationPreferencesSection />
      </div>
    </AdminLayout>
  );
}

