'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/shared';

type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  role: 'USER' | 'ADMIN' | 'GLOBAL_ADMIN';
};

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
      if (!response.ok) {
        throw new Error(data?.error ?? 'Failed to update profile');
      }

      setUser(data);
      setName(data.name ?? '');
      setMessage('Profile updated successfully.');
      
      // Notify navbar to refresh user data
      window.dispatchEvent(new Event('user-profile-updated'));
      
      // Clear success message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="Profile Settings" subtitle="Manage your account profile">
      <div className="max-w-4xl grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 lg:col-span-1">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
              {(user?.name?.charAt(0) || user?.email?.charAt(0) || 'A').toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{user?.name || 'Global Admin'}</p>
              <p className="text-xs text-gray-600">{user?.role?.replace(/_/g, ' ') || 'GLOBAL ADMIN'}</p>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-gray-600">Account Type</span>
              <span className="font-medium text-gray-900">System Admin</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-gray-600">Session</span>
              <span className="font-medium text-green-700">Active</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-gray-600">Data Source</span>
              <span className="font-medium text-gray-900">Production DB</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 lg:col-span-2">
        {loading ? (
          <p className="text-sm text-gray-600">Loading profile...</p>
        ) : (
          <form className="space-y-5" onSubmit={onSave}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={user?.email ?? ''}
                readOnly
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <input
                type="text"
                value={user?.role?.replace(/_/g, ' ') ?? ''}
                readOnly
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600"
              />
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Display Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={120}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your display name"
              />
              <p className="mt-1 text-xs text-gray-500">Displayed in the admin top bar and audit activity.</p>
            </div>

            {message && <p className="text-sm text-green-700">{message}</p>}
            {error && <p className="text-sm text-red-700">{error}</p>}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setName(user?.name ?? '');
                  setMessage(null);
                  setError(null);
                }}
                className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Reset
              </button>
            </div>
          </form>
        )}
        </div>
      </div>
    </AdminLayout>
  );
}
