'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { TenantLayout } from '@/components/tenant/shared';
import { useTenantMembers, TenantMember } from '@/hooks/useTenant';
import { useEffectiveRestrictions, RestrictionBanner } from '@/hooks/useRestrictions';

const ROLE_COLORS: Record<string, string> = {
  OWNER: 'bg-purple-100 text-purple-700',
  ADMIN: 'bg-blue-100 text-blue-700',
  MEMBER: 'bg-gray-100 text-gray-700',
};

const INVITE_STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  REVOKED: 'bg-gray-100 text-gray-500',
  EXPIRED: 'bg-red-100 text-red-700',
};

interface OrgInvite {
  id: string;
  email: string;
  role: string;
  status: string;
  token: string;
  createdAt: string;
  expiresAt: string;
}

interface RoleConfirm {
  memberId: string;
  memberName: string;
  newRole: 'OWNER' | 'ADMIN' | 'MEMBER';
}

export default function TeamPage() {
  const params = useParams();
  const orgId = params.id as string;

  const { data, loading, error, updateMemberRole, removeMember, refetch } = useTenantMembers(orgId);
  const { isBlocked, restrictions } = useEffectiveRestrictions(orgId);
  const inviteBlocked = isBlocked('members', 'invite');
  const removeBlocked = isBlocked('members', 'remove');
  const updateBlocked = isBlocked('members', 'update');

  const [activeTab, setActiveTab] = useState<'members' | 'invites'>('members');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [bulkRemoving, setBulkRemoving] = useState(false);
  const [roleConfirm, setRoleConfirm] = useState<RoleConfirm | null>(null);
  const [updatingRole, setUpdatingRole] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgError, setMsgError] = useState(false);

  const [invites, setInvites] = useState<OrgInvite[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [inviteAction, setInviteAction] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const showMsg = (text: string, isError = false) => {
    setMsg(text);
    setMsgError(isError);
    setTimeout(() => setMsg(null), 4000);
  };

  const fetchInvites = useCallback(async () => {
    setInvitesLoading(true);
    try {
      const res = await fetch(`/api/tenant/${orgId}/invites`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as { data: OrgInvite[] };
      setInvites(json.data ?? []);
    } catch {
      setInvites([]);
    } finally {
      setInvitesLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (activeTab === 'invites') fetchInvites();
  }, [activeTab, fetchInvites]);

  // Search filter
  const filtered = data.filter(m => {
    const q = search.toLowerCase();
    return (m.user.name ?? '').toLowerCase().includes(q) || m.user.email.toLowerCase().includes(q);
  });

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(m => m.id)));
    }
  };

  const handleBulkRemove = async () => {
    setBulkRemoving(true);
    let removed = 0;
    for (const id of Array.from(selected)) {
      try {
        await removeMember(id);
        removed++;
      } catch { /* continue */ }
    }
    setSelected(new Set());
    setBulkConfirm(false);
    setBulkRemoving(false);
    showMsg(`Removed ${removed} member${removed !== 1 ? 's' : ''}.`);
    refetch();
  };

  const handleRoleConfirm = async () => {
    if (!roleConfirm) return;
    setUpdatingRole(true);
    try {
      await updateMemberRole(roleConfirm.memberId, roleConfirm.newRole);
      showMsg(`Role updated for ${roleConfirm.memberName}.`);
    } catch (e) {
      showMsg(e instanceof Error ? e.message : 'Failed to update role', true);
    } finally {
      setUpdatingRole(false);
      setRoleConfirm(null);
    }
  };

  const handleRevoke = async (inviteId: string) => {
    setInviteAction(inviteId);
    try {
      const res = await fetch(`/api/tenant/${orgId}/invites/${inviteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showMsg('Invite revoked.');
      fetchInvites();
    } catch (e) {
      showMsg(e instanceof Error ? e.message : 'Failed to revoke', true);
    } finally {
      setInviteAction(null);
    }
  };

  const handleResend = async (inviteId: string) => {
    setInviteAction(inviteId);
    try {
      const res = await fetch(`/api/tenant/${orgId}/invites/${inviteId}/resend`, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showMsg('Invite resent. New expiry: 7 days from now.');
      fetchInvites();
    } catch (e) {
      showMsg(e instanceof Error ? e.message : 'Failed to resend', true);
    } finally {
      setInviteAction(null);
    }
  };

  const copyInviteLink = async (token: string) => {
    const url = `${window.location.origin}/join/${token}`;
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const daysUntil = (date: string) => {
    const diff = new Date(date).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const selectedMembers = filtered.filter(m => selected.has(m.id));
  const pendingCount = invites.filter(i => i.status === 'PENDING').length;

  return (
    <TenantLayout title="Team" subtitle="Manage your organization members" orgId={orgId}>
      {restrictions.sources.length > 0 && (
        <div className="mb-4">
          <RestrictionBanner sources={restrictions.sources} />
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          {msg && (
            <p className={`text-sm ${msgError ? 'text-red-700' : 'text-green-700'}`}>{msg}</p>
          )}
        </div>
        <Link
          href={`/tenant/${orgId}/team/invite`}
          className={`bg-blue-600 text-white hover:bg-blue-700 rounded-lg px-4 py-2 text-sm font-medium ${inviteBlocked ? 'opacity-50 pointer-events-none' : ''}`}
          aria-disabled={inviteBlocked}
          title={inviteBlocked ? 'Inviting members is restricted by policy' : undefined}
        >
          {inviteBlocked ? '🔒 + Invite Member' : '+ Invite Member'}
        </Link>
      </div>

      {/* Tab Bar */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('members')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'members'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Members ({data.length})
        </button>
        <button
          onClick={() => setActiveTab('invites')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'invites'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Pending Invites ({pendingCount})
        </button>
      </div>

      {/* ── Members Tab ── */}
      {activeTab === 'members' && (
        <>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
              Failed to load team members: {error.message}
            </div>
          ) : (
            <>
              {/* Search */}
              <div className="mb-4">
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name or email…"
                  className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Bulk action bar */}
              {selected.size > 0 && (
                <div className="flex items-center gap-3 mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <span className="text-sm font-medium text-blue-700">{selected.size} selected</span>
                  <button
                    onClick={() => setBulkConfirm(true)}
                    className="text-xs font-medium px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700"
                  >
                    Remove {selected.size} member{selected.size !== 1 ? 's' : ''}
                  </button>
                  <button
                    onClick={() => setSelected(new Set())}
                    className="text-xs text-gray-500 hover:text-gray-700 ml-auto"
                  >
                    Clear
                  </button>
                </div>
              )}

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selected.size === filtered.length}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                  <p className="text-sm font-semibold text-gray-700">
                    {filtered.length} member{filtered.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="divide-y divide-gray-100">
                  {filtered.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                      {search ? 'No members match your search.' : 'No team members found.'}
                    </div>
                  ) : (
                    filtered.map(member => (
                      <div key={member.id} className="flex items-center justify-between px-6 py-4">
                        <div className="flex items-center gap-4">
                          <input
                            type="checkbox"
                            checked={selected.has(member.id)}
                            onChange={() => toggleSelect(member.id)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600"
                          />
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                            {(member.user.name || member.user.email).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{member.user.name || '(No name)'}</p>
                            <p className="text-sm text-gray-500">{member.user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[member.role] ?? 'bg-gray-100 text-gray-700'}`}>
                            {member.role}
                          </span>
                          <select
                            value={member.role}
                            onChange={e => setRoleConfirm({
                              memberId: member.id,
                              memberName: member.user.name || member.user.email,
                              newRole: e.target.value as 'OWNER' | 'ADMIN' | 'MEMBER',
                            })}
                            className="rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="MEMBER">MEMBER</option>
                            <option value="ADMIN">ADMIN</option>
                            <option value="OWNER">OWNER</option>
                          </select>
                          <button
                            onClick={() => {
                              setSelected(new Set([member.id]));
                              setBulkConfirm(true);
                            }}
                            className="text-red-600 hover:text-red-700 text-xs font-medium px-2 py-1 rounded border border-red-200 hover:bg-red-50"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ── Invites Tab ── */}
      {activeTab === 'invites' && (
        <>
          {invitesLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
          ) : invites.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
              No invites yet. Click &ldquo;+ Invite Member&rdquo; to send one.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['Email', 'Role', 'Sent', 'Expires', 'Status', 'Invite Link', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invites.map(invite => {
                    const days = daysUntil(invite.expiresAt);
                    return (
                      <tr key={invite.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{invite.email}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[invite.role] ?? 'bg-gray-100 text-gray-700'}`}>
                            {invite.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {new Date(invite.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {invite.status === 'PENDING'
                            ? days > 0 ? `in ${days}d` : 'Expired'
                            : new Date(invite.expiresAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${INVITE_STATUS_BADGE[invite.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {invite.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {invite.status === 'PENDING' && (
                            <button
                              onClick={() => copyInviteLink(invite.token)}
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                              title={`/join/${invite.token}`}
                            >
                              {copiedToken === invite.token ? '✓ Copied' : '📋 Copy'}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {invite.status === 'PENDING' && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleRevoke(invite.id)}
                                disabled={inviteAction === invite.id}
                                className="text-xs text-red-600 hover:text-red-700 font-medium px-2 py-1 rounded border border-red-200 hover:bg-red-50 disabled:opacity-50"
                              >
                                Revoke
                              </button>
                              <button
                                onClick={() => handleResend(invite.id)}
                                disabled={inviteAction === invite.id}
                                className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded border border-blue-200 hover:bg-blue-50 disabled:opacity-50"
                              >
                                Resend
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Role change confirmation modal ── */}
      {roleConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl border border-gray-200 p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Change Role</h3>
            <p className="text-sm text-gray-600 mb-6">
              Change <strong>{roleConfirm.memberName}</strong>&apos;s role to{' '}
              <strong>{roleConfirm.newRole}</strong>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleRoleConfirm}
                disabled={updatingRole}
                className="bg-blue-600 text-white hover:bg-blue-700 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                {updatingRole ? 'Updating…' : 'Confirm'}
              </button>
              <button
                onClick={() => setRoleConfirm(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk remove confirmation modal ── */}
      {bulkConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl border border-gray-200 p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Remove Members</h3>
            <p className="text-sm text-gray-600 mb-3">
              The following {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} will be removed:
            </p>
            <ul className="mb-6 space-y-1 max-h-48 overflow-y-auto">
              {selectedMembers.map(m => (
                <li key={m.id} className="text-sm text-gray-800 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white text-xs font-bold">
                    {(m.user.name || m.user.email).charAt(0).toUpperCase()}
                  </span>
                  {m.user.name || m.user.email}
                </li>
              ))}
            </ul>
            <div className="flex gap-3">
              <button
                onClick={handleBulkRemove}
                disabled={bulkRemoving}
                className="bg-red-600 text-white hover:bg-red-700 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                {bulkRemoving ? 'Removing…' : `Remove ${selectedMembers.length}`}
              </button>
              <button
                onClick={() => setBulkConfirm(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </TenantLayout>
  );
}