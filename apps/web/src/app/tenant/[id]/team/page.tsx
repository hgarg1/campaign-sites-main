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

interface AuditEntry {
  id: string;
  message: string;
  metadata: {
    action: string;
    actorUserId: string;
    targetUserId?: string;
    targetEmail?: string;
    fromRole?: string;
    toRole?: string;
  };
  createdAt: string;
}

const ACTION_LABELS: Record<string, string> = {
  'member.add': 'Added member',
  'member.remove': 'Removed member',
  'member.role_change': 'Changed role',
  'invite.create': 'Sent invite',
  'invite.revoke': 'Revoked invite',
  'invite.resend': 'Resent invite',
};

interface CustomRoleSummary {
  id: string;
  name: string;
  color: string;
  description?: string;
}

interface PermEntry {
  resource: string;
  action: string;
  status: 'allowed' | 'blocked' | 'not_in_role';
}

const PERM_RESOURCES = ['websites', 'members', 'settings', 'branding', 'integrations', 'billing'];
const PERM_ACTIONS = ['read', 'create', 'update', 'delete', 'publish'];

const PERM_STATUS_ICON: Record<string, string> = {
  allowed: '🟢',
  blocked: '🔴',
  not_in_role: '⚪',
};

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

  const [activeTab, setActiveTab] = useState<'members' | 'invites' | 'activity'>('members');
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

  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [restrictionsExpanded, setRestrictionsExpanded] = useState(false);

  const [customRoles, setCustomRoles] = useState<CustomRoleSummary[]>([]);
  const [assignModal, setAssignModal] = useState<{
    memberId: string;
    memberName: string;
    currentCustomRoleId: string | null;
  } | null>(null);
  const [assignRoleId, setAssignRoleId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [permDrawer, setPermDrawer] = useState<{
    member: TenantMember;
    customRole: { id: string; name: string; color: string } | null;
  } | null>(null);
  const [permData, setPermData] = useState<PermEntry[]>([]);
  const [permLoading, setPermLoading] = useState(false);

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

  const fetchAuditLog = useCallback(async () => {
    setAuditLoading(true);
    try {
      const res = await fetch(`/api/tenant/${orgId}/audit-log`);
      if (!res.ok) throw new Error();
      const json = await res.json() as { data: AuditEntry[] };
      setAuditLogs(json.data ?? []);
    } catch {
      setAuditLogs([]);
    } finally {
      setAuditLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (activeTab === 'invites') fetchInvites();
    if (activeTab === 'activity') fetchAuditLog();
  }, [activeTab, fetchInvites, fetchAuditLog]);

  useEffect(() => {
    fetch(`/api/tenant/${orgId}/roles`)
      .then(r => r.json())
      .then((json: { data: CustomRoleSummary[] } | CustomRoleSummary[]) => {
        setCustomRoles(Array.isArray(json) ? json : (json.data ?? []));
      })
      .catch(() => setCustomRoles([]));
  }, [orgId]);

  const getCustomRole = (member: TenantMember): { id: string; name: string; color: string } | null => {
    if (member.customRole) return member.customRole;
    if (member.customRoleId) {
      const found = customRoles.find(r => r.id === member.customRoleId);
      return found ? { id: found.id, name: found.name, color: found.color } : null;
    }
    return null;
  };

  const handleAssignRole = async () => {
    if (!assignModal) return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/tenant/${orgId}/members/${assignModal.memberId}/custom-role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customRoleId: assignRoleId }),
      });
      if (res.status === 403) throw new Error('You do not have permission.');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showMsg('Custom role updated.');
      setAssignModal(null);
      refetch();
    } catch (e) {
      showMsg(e instanceof Error ? e.message : 'Failed to assign role', true);
    } finally {
      setAssigning(false);
    }
  };

  const openPermDrawer = async (member: TenantMember) => {
    const customRole = getCustomRole(member);
    setPermDrawer({ member, customRole });
    setPermData([]);
    setPermLoading(true);
    try {
      const res = await fetch(`/api/tenant/${orgId}/members/${member.id}/permissions`);
      if (res.ok) {
        const json = (await res.json()) as PermEntry[] | { data: PermEntry[] };
        setPermData(Array.isArray(json) ? json : (json.data ?? []));
      }
    } catch {
      // ignore — drawer still shows member info
    } finally {
      setPermLoading(false);
    }
  };

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

      {/* Policy Restrictions panel */}
      {restrictions.rules.some(r => !r.allow) && (
        <div className="mb-4 border border-amber-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setRestrictionsExpanded(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 bg-amber-50 text-left"
          >
            <span className="text-sm font-semibold text-amber-800">
              🔒 Active Policy Restrictions
              <span className="ml-2 font-normal text-amber-600">
                ({restrictions.rules.filter(r => !r.allow).length} rules)
              </span>
            </span>
            <span className="text-amber-600 text-xs">{restrictionsExpanded ? '▲ Hide' : '▼ Show'}</span>
          </button>
          {restrictionsExpanded && (
            <div className="bg-white px-4 py-3">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase">
                    <th className="text-left pb-2 pr-4">Resource</th>
                    <th className="text-left pb-2 pr-4">Blocked Actions</th>
                    <th className="text-left pb-2">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Object.entries(
                    restrictions.rules.filter(r => !r.allow).reduce<Record<string, { actions: string[] }>>((acc, r) => {
                      const key = r.resource;
                      if (!acc[key]) acc[key] = { actions: [] };
                      acc[key].actions.push(...(r.actions ?? ['*']));
                      return acc;
                    }, {})
                  ).map(([resource, { actions }]) => (
                    <tr key={resource}>
                      <td className="py-2 pr-4 font-medium text-gray-700">{resource}</td>
                      <td className="py-2 pr-4">
                        {actions.map(a => (
                          <span key={a} className="inline-block mr-1 px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-xs">{a}</span>
                        ))}
                      </td>
                      <td className="py-2 text-gray-500 text-xs">
                        {restrictions.sources.join(', ') || 'Policy'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
      <div className="flex items-center justify-between border-b border-gray-200 mb-6">
        <div className="flex">
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
          <button
            onClick={() => setActiveTab('activity')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'activity'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Activity
          </button>
        </div>
        <Link
          href={`/tenant/${orgId}/team/roles`}
          className="pb-2 text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
        >
          🎭 Custom Roles
        </Link>
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
                    filtered.map(member => {
                      const customRole = getCustomRole(member);
                      return (
                      <div key={member.id} className="flex items-center justify-between px-6 py-4">
                        <div className="flex items-center gap-4">
                          <input
                            type="checkbox"
                            checked={selected.has(member.id)}
                            onChange={() => toggleSelect(member.id)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600"
                          />
                          <button
                            type="button"
                            onClick={() => openPermDrawer(member)}
                            title="View permissions"
                            className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold hover:opacity-80 transition-opacity"
                          >
                            {(member.user.name || member.user.email).charAt(0).toUpperCase()}
                          </button>
                          <div>
                            <button
                              type="button"
                              onClick={() => openPermDrawer(member)}
                              className="font-medium text-gray-900 hover:text-blue-600 transition-colors text-left"
                            >
                              {member.user.name || '(No name)'}
                            </button>
                            <p className="text-sm text-gray-500">{member.user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[member.role] ?? 'bg-gray-100 text-gray-700'}`}>
                            {member.role}
                          </span>
                          {customRole && (
                            <span
                              className="px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: `${customRole.color}22`,
                                color: customRole.color,
                                border: `1px solid ${customRole.color}55`,
                              }}
                            >
                              {customRole.name}
                            </span>
                          )}
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
                            type="button"
                            onClick={() => {
                              setAssignModal({
                                memberId: member.id,
                                memberName: member.user.name || member.user.email,
                                currentCustomRoleId: member.customRoleId ?? null,
                              });
                              setAssignRoleId(member.customRoleId ?? null);
                            }}
                            className="text-xs text-purple-600 hover:text-purple-700 px-2 py-1 rounded border border-purple-200 hover:bg-purple-50"
                            title="Assign custom role"
                          >
                            🎭
                          </button>
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
                      );
                    })
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

      {/* ── Activity Tab ── */}
      {activeTab === 'activity' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <p className="text-sm font-semibold text-gray-700">Recent Team Activity</p>
            <p className="text-xs text-gray-500 mt-0.5">Last 50 events for this organization</p>
          </div>
          {auditLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No activity recorded yet.</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {auditLogs.map(entry => {
                const meta = entry.metadata;
                const label = ACTION_LABELS[meta.action] ?? meta.action;
                const target = meta.targetEmail ?? meta.targetUserId?.slice(0, 8) ?? '';
                const roleChange = meta.fromRole && meta.toRole ? ` (${meta.fromRole} → ${meta.toRole})` : (meta.toRole ? ` as ${meta.toRole}` : '');
                return (
                  <li key={entry.id} className="px-6 py-3 flex items-start gap-3">
                    <span className="mt-0.5 w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {label.charAt(0)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800">
                        <span className="font-medium">{label}</span>
                        {target ? <span className="text-gray-600"> — {target}</span> : null}
                        {roleChange ? <span className="text-gray-500 text-xs">{roleChange}</span> : null}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Actor: {meta.actorUserId?.slice(0, 8)}…
                        {' · '}
                        {new Date(entry.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
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
            {roleConfirm.newRole === 'OWNER' && (
              <div className="mb-6 flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                <span>⚠️</span>
                <span>This grants <strong>full organization control</strong>. OWNER can manage all members, settings, and billing. Only proceed if you fully trust this person.</span>
              </div>
            )}
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

      {/* ── Assign Custom Role modal ── */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl border border-gray-200 p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Assign Custom Role</h3>
            <p className="text-sm text-gray-500 mb-4">
              for <strong>{assignModal.memberName}</strong>
            </p>
            <select
              value={assignRoleId ?? ''}
              onChange={e => setAssignRoleId(e.target.value || null)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-5"
            >
              <option value="">None (use base role only)</option>
              {customRoles.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <div className="flex gap-3">
              <button
                onClick={handleAssignRole}
                disabled={assigning}
                className="bg-blue-600 text-white hover:bg-blue-700 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                {assigning ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => setAssignModal(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Permissions Drawer ── */}
      {permDrawer && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setPermDrawer(null)}
          />
          {/* Drawer panel */}
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Member Permissions</h3>
              <button
                onClick={() => setPermDrawer(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {/* Member info */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                  {(permDrawer.member.user.name || permDrawer.member.user.email)
                    .charAt(0)
                    .toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {permDrawer.member.user.name || '(No name)'}
                  </p>
                  <p className="text-sm text-gray-500">{permDrawer.member.user.email}</p>
                </div>
              </div>

              {/* Roles */}
              <div className="flex items-center gap-2 mb-6">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[permDrawer.member.role] ?? 'bg-gray-100 text-gray-700'}`}
                >
                  {permDrawer.member.role}
                </span>
                {permDrawer.customRole && (
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: `${permDrawer.customRole.color}22`,
                      color: permDrawer.customRole.color,
                      border: `1px solid ${permDrawer.customRole.color}55`,
                    }}
                  >
                    {permDrawer.customRole.name}
                  </span>
                )}
              </div>

              {/* Permission grid */}
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Effective Permissions</h4>
              {permLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
              ) : permData.length === 0 ? (
                <div className="text-sm text-gray-400 italic py-4">
                  No permission data available for this member.
                </div>
              ) : (
                <div className="rounded-lg border border-gray-200 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Resource</th>
                        {PERM_ACTIONS.map(a => (
                          <th key={a} className="px-2 py-2 font-medium text-gray-600 text-center capitalize text-xs">
                            {a}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {PERM_RESOURCES.map(resource => (
                        <tr key={resource}>
                          <td className="px-3 py-2 font-medium text-gray-700 capitalize text-xs">
                            {resource}
                          </td>
                          {PERM_ACTIONS.map(action => {
                            const isPublishNonWebsite =
                              action === 'publish' && resource !== 'websites';
                            if (isPublishNonWebsite) {
                              return (
                                <td key={action} className="px-2 py-2 text-center text-gray-300 text-xs">
                                  —
                                </td>
                              );
                            }
                            const entry = permData.find(
                              p => p.resource === resource && p.action === action
                            );
                            const status = entry?.status ?? 'not_in_role';
                            return (
                              <td key={action} className="px-2 py-2 text-center" title={status.replace('_', ' ')}>
                                {PERM_STATUS_ICON[status] ?? '⚪'}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Legend */}
              {permData.length > 0 && (
                <div className="mt-4 flex gap-4 text-xs text-gray-500">
                  <span>🟢 Allowed</span>
                  <span>🔴 Blocked by policy</span>
                  <span>⚪ Not in role</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </TenantLayout>
  );
}