'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/shared';
import { startRegistration } from '@simplewebauthn/browser';

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

export default function PasskeysPage() {
  const [credentials, setCredentials] = useState<PasskeyCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState('');
  const [revoking, setRevoking] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch('/api/auth/passkey/register')
      .then((r) => r.json())
      // The GET returns registration options, not a list — get the list from admin endpoint instead
      .catch(() => null)
      .finally(() => setLoading(false));

    // Fetch credentials for current user via admin endpoint (self-service)
    fetch('/api/admin/passkeys/me')
      .then((r) => r.json())
      .then((d) => setCredentials(d.data ?? []))
      .catch(() => setError('Failed to load credentials'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleRegister() {
    setRegistering(true);
    setRegisterError(null);
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
        const err = await verRes.json().catch(() => ({}));
        throw new Error(err.error ?? 'Registration failed');
      }
      setSuccess('Passkey registered successfully!');
      setDeviceName('');
      setTimeout(() => setSuccess(null), 4000);
      load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setRegisterError(msg);
    } finally {
      setRegistering(false);
    }
  }

  async function handleRevoke(credId: string) {
    setRevoking(credId);
    try {
      const res = await fetch(`/api/admin/passkeys/me/${credId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to revoke');
      setSuccess('Passkey revoked.');
      setTimeout(() => setSuccess(null), 3000);
      load();
    } catch {
      setError('Failed to revoke passkey');
    } finally {
      setRevoking(null);
    }
  }

  const active = credentials.filter((c) => !c.revokedAt);
  const revoked = credentials.filter((c) => c.revokedAt);

  return (
    <AdminLayout title="My Passkeys" subtitle="Manage your passkey credentials">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">My Passkeys</h1>
        <p className="text-sm text-gray-500 mb-6">
          Passkeys use your device's biometrics or PIN to sign in — no password needed.
        </p>

        {success && (
          <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-red-600">×</button>
          </div>
        )}

        {/* Register new passkey */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-800 mb-3">Register a New Passkey</h2>
          <div className="flex gap-2">
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
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
            >
              {registering ? 'Registering…' : '+ Register Passkey'}
            </button>
          </div>
          {registerError && (
            <p className="mt-2 text-xs text-red-600">{registerError}</p>
          )}
        </div>

        {/* Active credentials */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-4">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-700">Active Passkeys ({active.length})</h2>
          </div>
          {loading ? (
            <div className="p-5 space-y-2">
              {[1, 2].map((i) => <div key={i} className="animate-pulse bg-gray-100 h-10 rounded" />)}
            </div>
          ) : active.length === 0 ? (
            <div className="p-5 text-sm text-gray-400 text-center">No active passkeys yet.</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {active.map((c) => (
                <li key={c.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{c.deviceName ?? 'Unnamed device'}</p>
                    <p className="text-xs text-gray-400">
                      Registered {formatDate(c.createdAt)} · Last used {formatDate(c.lastUsedAt)}
                    </p>
                    {c.transports.length > 0 && (
                      <p className="text-xs text-gray-400">{c.transports.join(', ')}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleRevoke(c.id)}
                    disabled={revoking === c.id}
                    className="ml-4 px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
                  >
                    {revoking === c.id ? 'Revoking…' : 'Revoke'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {revoked.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <h2 className="text-sm font-semibold text-gray-500">Revoked ({revoked.length})</h2>
            </div>
            <ul className="divide-y divide-gray-100">
              {revoked.map((c) => (
                <li key={c.id} className="flex items-center px-5 py-3 opacity-50">
                  <div>
                    <p className="text-sm text-gray-600 line-through">{c.deviceName ?? 'Unnamed'}</p>
                    <p className="text-xs text-gray-400">Revoked {formatDate(c.revokedAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
