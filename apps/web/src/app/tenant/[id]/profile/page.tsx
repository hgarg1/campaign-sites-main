'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { TenantLayout } from '@/components/tenant/shared';

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
}

export default function ProfilePage() {
  const params = useParams();
  const orgId = params.id as string;

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (!res.ok) return;
        const data: UserProfile = await res.json();
        setUser(data);
        setName(data.name || '');
        setEmail(data.email || '');
      } catch {} finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as Record<string, string>).error || `HTTP ${res.status}`);
      }
      const updated: UserProfile = await res.json();
      setUser(updated);
      setName(updated.name || '');
      setEmail(updated.email || '');
      setProfileMsg('Profile updated successfully.');
      window.dispatchEvent(new Event('user-profile-updated'));
      setTimeout(() => setProfileMsg(null), 3000);
    } catch (err) {
      setProfileMsg(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMsg('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMsg('Password must be at least 8 characters.');
      return;
    }
    setSavingPassword(true);
    setPasswordMsg(null);
    try {
      const res = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as Record<string, string>).error || `HTTP ${res.status}`);
      }
      setPasswordMsg('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordMsg(null), 3000);
    } catch (err) {
      setPasswordMsg(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const avatarLetter = (name || email || 'U').charAt(0).toUpperCase();

  if (loading) {
    return (
      <TenantLayout title="Profile" orgId={orgId}>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </TenantLayout>
    );
  }

  return (
    <TenantLayout title="Profile" subtitle="Your personal account settings" orgId={orgId}>
      <div className="max-w-2xl space-y-6">
        {/* Avatar */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
            {avatarLetter}
          </div>
          <div>
            <p className="font-bold text-gray-900 text-lg">{user?.name || '(No name)'}</p>
            <p className="text-gray-500">{user?.email}</p>
          </div>
        </div>

        {/* Profile form */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Personal Information</h2>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputClass} placeholder="Your full name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} />
            </div>
            {profileMsg && (
              <p className={`text-sm ${profileMsg.includes('success') ? 'text-green-700' : 'text-red-600'}`}>{profileMsg}</p>
            )}
            <button type="submit" disabled={savingProfile} className="bg-blue-600 text-white hover:bg-blue-700 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50">
              {savingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>

        {/* Change password */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Change Password</h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
              <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className={inputClass} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputClass} required minLength={8} />
              <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputClass} required />
            </div>
            {passwordMsg && (
              <p className={`text-sm ${passwordMsg.includes('success') ? 'text-green-700' : 'text-red-600'}`}>{passwordMsg}</p>
            )}
            <button type="submit" disabled={savingPassword} className="bg-blue-600 text-white hover:bg-blue-700 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50">
              {savingPassword ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </TenantLayout>
  );
}