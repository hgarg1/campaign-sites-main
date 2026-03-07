'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { TenantLayout } from '@/components/tenant/shared';

interface InviteResult {
  id: string;
  token: string;
  email: string;
  status: string;
}

export default function InviteMemberPage() {
  const params = useParams();
  const orgId = params.id as string;

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'MEMBER' | 'ADMIN' | 'OWNER'>('MEMBER');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<InviteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/tenant/${orgId}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as Record<string, string>;
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const invite = await res.json() as InviteResult;
      setResult(invite);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setSubmitting(false);
    }
  };

  const inviteLink = result ? `${window.location.origin}/join/${result.token}` : '';

  const copyLink = async () => {
    await navigator.clipboard.writeText(inviteLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendAnother = () => {
    setResult(null);
    setEmail('');
    setRole('MEMBER');
    setCopied(false);
  };

  const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <TenantLayout title="Invite Member" subtitle="Add someone to your team" orgId={orgId}>
      <div className="max-w-lg mx-auto">
        <Link href={`/tenant/${orgId}/team`} className="text-blue-600 hover:text-blue-700 font-medium text-sm mb-6 inline-block">
          ← Back to Team
        </Link>

        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Invite a New Member</h2>

          {result ? (
            <div className="space-y-4">
              <div className={`rounded-lg p-4 border ${result.status === 'ACCEPTED' ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
                <p className={`font-medium ${result.status === 'ACCEPTED' ? 'text-green-800' : 'text-blue-800'}`}>
                  {result.status === 'ACCEPTED'
                    ? `✓ ${email} already has an account and has been added to your team.`
                    : `✓ Invitation created for ${email}`}
                </p>
                {result.status !== 'ACCEPTED' && (
                  <p className="text-sm text-blue-700 mt-1">Share the invite link below, or they can use it to join.</p>
                )}
              </div>

              {result.status !== 'ACCEPTED' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Invite Link</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={inviteLink}
                        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-50 text-gray-700 select-all"
                      />
                      <button
                        onClick={copyLink}
                        className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 whitespace-nowrap"
                      >
                        {copied ? '✓ Copied' : 'Copy link'}
                      </button>
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-600">
                    💡 If the person already has an account, they&apos;ll be added immediately. Otherwise, they can use this link to join.
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSendAnother}
                  className="bg-blue-600 text-white hover:bg-blue-700 rounded-lg px-4 py-2 text-sm font-medium"
                >
                  Send another
                </button>
                <Link
                  href={`/tenant/${orgId}/team`}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Back to Team
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="colleague@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select value={role} onChange={e => setRole(e.target.value as 'MEMBER' | 'ADMIN' | 'OWNER')} className={inputClass}>
                  <option value="MEMBER">Member — Can view and edit websites</option>
                  <option value="ADMIN">Admin — Can manage team and settings</option>
                  <option value="OWNER">Owner — Full access</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {role === 'OWNER' && 'Owners have full control over the organization.'}
                  {role === 'ADMIN' && 'Admins can manage team members and organization settings.'}
                  {role === 'MEMBER' && 'Members can create and edit websites.'}
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                💡 If the person already has an account, they&apos;ll be added immediately. Otherwise, they can use the invite link to join.
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting || !email.trim()}
                  className="bg-blue-600 text-white hover:bg-blue-700 rounded-lg px-6 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {submitting ? 'Sending…' : 'Send Invitation'}
                </button>
                <Link
                  href={`/tenant/${orgId}/team`}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </TenantLayout>
  );
}