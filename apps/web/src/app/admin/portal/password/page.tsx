'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/shared';

type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  role: 'USER' | 'ADMIN' | 'GLOBAL_ADMIN';
};

export default function PasswordPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
          throw new Error(payload?.error ?? 'Failed to load account context');
        }
        const data = (await response.json()) as SessionUser;
        setUser(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load account context');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [router]);

  const passwordChecks = useMemo(
    () => [
      { label: 'At least 8 characters', valid: newPassword.length >= 8 },
      { label: 'Contains upper and lower case', valid: /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword) },
      { label: 'Contains a number', valid: /\d/.test(newPassword) },
      { label: 'Matches confirmation', valid: newPassword.length > 0 && newPassword === confirmPassword },
    ],
    [newPassword, confirmPassword]
  );

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('New password and confirm password must match.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error ?? 'Failed to update password');
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage('Password updated successfully.');
      
      // Notify navbar to refresh user data
      window.dispatchEvent(new Event('user-profile-updated'));
      
      // Clear success message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="Change Password" subtitle="Update your sign-in password securely">
      <div className="max-w-4xl grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 lg:col-span-1">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Password Policy</h3>
          <ul className="space-y-2 text-xs text-gray-600">
            {passwordChecks.map((check) => (
              <li key={check.label} className={check.valid ? 'text-green-700' : 'text-gray-600'}>
                {check.valid ? '✓' : '•'} {check.label}
              </li>
            ))}
          </ul>
          <div className="mt-5 pt-5 border-t border-gray-100 text-xs text-gray-600">
            <p className="font-medium text-gray-900 mb-1">Signed in as</p>
            <p>{user?.email || 'Loading...'}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 lg:col-span-2">
        {loading ? (
          <p className="text-sm text-gray-600">Loading account context...</p>
        ) : (
        <form className="space-y-5" onSubmit={onSubmit}>
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Current Password
            </label>
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {message && <p className="text-sm text-green-700">{message}</p>}
          {error && <p className="text-sm text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? 'Updating...' : 'Update Password'}
          </button>
        </form>
        )}
        </div>
      </div>
    </AdminLayout>
  );
}
