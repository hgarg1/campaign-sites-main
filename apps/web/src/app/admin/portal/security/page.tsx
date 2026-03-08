'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/shared';

interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
  requirePasskey: boolean;
  passkeyCount: number;
  lastUsedAt: string | null;
}

interface PasskeyCredential {
  id: string;
  deviceName: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

function formatDate(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

export default function AdminPasskeyManagementPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Record<string, PasskeyCredential[]>>({});
  const [toggling, setToggling] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/passkeys')
      .then((r) => r.json())
      .then((d) => setUsers(d.data ?? []))
      .catch(() => setError('Failed to load admin users'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function loadCredentials(userId: string) {
    if (credentials[userId]) return;
    const res = await fetch(`/api/admin/passkeys/${userId}`);
    const d = await res.json();
    setCredentials((prev) => ({ ...prev, [userId]: d.data ?? [] }));
  }

  function toggleExpand(userId: string) {
    if (expanded === userId) {
      setExpanded(null);
    } else {
      setExpanded(userId);
      loadCredentials(userId);
    }
  }

  async function handleToggleRequire(userId: string, current: boolean) {
    setToggling(userId);
    try {
      const res = await fetch(`/api/admin/passkeys/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirePasskey: !current }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      setSuccess(`Passkey requirement ${!current ? 'enabled' : 'disabled'}.`);
      setTimeout(() => setSuccess(null), 3000);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setToggling(null);
    }
  }

  async function handleRevoke(userId: string, credId: string) {
    setRevoking(credId);
    try {
      const res = await fetch(`/api/admin/passkeys/${userId}/${credId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to revoke');
      setSuccess('Passkey revoked.');
      setTimeout(() => setSuccess(null), 3000);
      setCredentials((prev) => ({
        ...prev,
        [userId]: (prev[userId] ?? []).map((c) =>
          c.id === credId ? { ...c, revokedAt: new Date().toISOString() } : c
        ),
      }));
      load();
    } catch {
      setError('Failed to revoke passkey');
    } finally {
      setRevoking(null);
    }
  }

  return (
    <AdminLayout title="Admin Passkey Management" subtitle="Manage passkeys for admin accounts">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Admin Passkey Management</h1>
        <p className="text-sm text-gray-500 mb-6">
          Require passkeys for admin accounts and manage their registered credentials.
          Only GLOBAL_ADMINs can toggle requirements or revoke credentials.
        </p>

        {success && (
          <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <span>User</span>
            <span>Passkeys</span>
            <span>Require Passkey</span>
            <span></span>
          </div>

          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="animate-pulse bg-gray-100 h-10 rounded" />)}
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No admin users found.</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {users.map((user) => (
                <li key={user.id}>
                  <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{user.name ?? user.email}</p>
                      <p className="text-xs text-gray-400">{user.email} · {user.role}</p>
                    </div>
                    <span className={`text-sm font-semibold ${user.passkeyCount > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                      {user.passkeyCount} {user.passkeyCount === 1 ? 'key' : 'keys'}
                    </span>
                    <button
                      onClick={() => handleToggleRequire(user.id, user.requirePasskey)}
                      disabled={toggling === user.id}
                      className={`relative inline-flex h-5 w-9 rounded-full transition-colors disabled:opacity-50 ${
                        user.requirePasskey ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                      title={user.requirePasskey ? 'Passkey required — click to disable' : 'Click to require passkey'}
                    >
                      <span
                        className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform mt-0.5 ${
                          user.requirePasskey ? 'translate-x-4' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                    <button
                      onClick={() => toggleExpand(user.id)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      {expanded === user.id ? 'Hide' : 'View keys'}
                    </button>
                  </div>

                  {expanded === user.id && (
                    <div className="px-5 pb-4 bg-gray-50 border-t border-gray-100">
                      {!credentials[user.id] ? (
                        <p className="text-xs text-gray-400 py-2">Loading…</p>
                      ) : credentials[user.id].length === 0 ? (
                        <p className="text-xs text-gray-400 py-2">No credentials registered.</p>
                      ) : (
                        <ul className="space-y-2 mt-2">
                          {credentials[user.id].map((c) => (
                            <li key={c.id} className={`flex items-center justify-between text-xs ${c.revokedAt ? 'opacity-40' : ''}`}>
                              <span>
                                <span className="font-medium text-gray-700">{c.deviceName ?? 'Unnamed'}</span>
                                <span className="text-gray-400 ml-2">Registered {formatDate(c.createdAt)} · Last used {formatDate(c.lastUsedAt)}</span>
                                {c.revokedAt && <span className="ml-2 text-red-400">(revoked {formatDate(c.revokedAt)})</span>}
                              </span>
                              {!c.revokedAt && (
                                <button
                                  onClick={() => handleRevoke(user.id, c.id)}
                                  disabled={revoking === c.id}
                                  className="ml-4 px-2 py-1 text-red-600 border border-red-200 rounded hover:bg-red-50 disabled:opacity-50"
                                >
                                  {revoking === c.id ? 'Revoking…' : 'Revoke'}
                                </button>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
