'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin/shared';

type PartyAffiliation = 'REPUBLICAN' | 'DEMOCRAT' | 'LIBERTARIAN' | 'GREEN' | 'INDEPENDENT' | 'NONPARTISAN' | 'OTHER';

interface MasterTenantOrg {
  id: string;
  name: string;
  slug: string;
  ownStatus: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
  canCreateChildren: boolean;
}

interface MasterTenant {
  id: string;
  partyAffiliation: PartyAffiliation;
  organizationId: string;
  organization: MasterTenantOrg;
}

interface FlatOrg {
  id: string;
  name: string;
  slug: string;
  ownStatus: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
}

const ALL_PARTIES: PartyAffiliation[] = [
  'REPUBLICAN', 'DEMOCRAT', 'LIBERTARIAN', 'GREEN', 'INDEPENDENT', 'NONPARTISAN', 'OTHER',
];

const PARTY_META: Record<PartyAffiliation, { color: string; bg: string; border: string; label: string }> = {
  REPUBLICAN:  { color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200',    label: 'Republican' },
  DEMOCRAT:    { color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200',   label: 'Democrat' },
  LIBERTARIAN: { color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200', label: 'Libertarian' },
  GREEN:       { color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200',  label: 'Green' },
  INDEPENDENT: { color: 'text-gray-700',   bg: 'bg-gray-50',   border: 'border-gray-200',   label: 'Independent' },
  NONPARTISAN: { color: 'text-slate-700',  bg: 'bg-slate-50',  border: 'border-slate-200',  label: 'Nonpartisan' },
  OTHER:       { color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', label: 'Other' },
};

const PARTY_BADGE: Record<PartyAffiliation, string> = {
  REPUBLICAN:  'bg-red-100 text-red-700',
  DEMOCRAT:    'bg-blue-100 text-blue-700',
  LIBERTARIAN: 'bg-yellow-100 text-yellow-700',
  GREEN:       'bg-green-100 text-green-700',
  INDEPENDENT: 'bg-gray-100 text-gray-700',
  NONPARTISAN: 'bg-slate-100 text-slate-700',
  OTHER:       'bg-purple-100 text-purple-700',
};

const STATUS_META: Record<string, { color: string; bg: string; label: string }> = {
  ACTIVE:      { color: 'text-green-700', bg: 'bg-green-100',  label: 'Active' },
  SUSPENDED:   { color: 'text-amber-700', bg: 'bg-amber-100',  label: 'Suspended' },
  DEACTIVATED: { color: 'text-red-700',   bg: 'bg-red-100',    label: 'Deactivated' },
};

export default function MasterTenantsPage() {
  const [tenants, setTenants] = useState<MasterTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [allOrgs, setAllOrgs] = useState<FlatOrg[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(false);

  const [editingParty, setEditingParty] = useState<PartyAffiliation | null>(null);
  const [orgSearch, setOrgSearch] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  function fetchTenants() {
    setLoading(true);
    fetch('/api/admin/master-tenants')
      .then((r) => r.json())
      .then((d: { data: MasterTenant[] }) => setTenants(d.data ?? []))
      .catch(() => setError('Failed to load master tenants'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchTenants(); }, []);

  function openEdit(party: PartyAffiliation) {
    setEditingParty(party);
    setOrgSearch('');
    setActionMsg(null);
    const current = tenants.find((t) => t.partyAffiliation === party);
    setSelectedOrgId(current?.organizationId ?? '');
    if (allOrgs.length === 0) {
      setOrgsLoading(true);
      fetch('/api/admin/organizations?pageSize=500')
        .then((r) => r.json())
        .then((d: { data: FlatOrg[] }) => setAllOrgs(d.data ?? []))
        .catch(() => {})
        .finally(() => setOrgsLoading(false));
    }
  }

  async function saveTenant() {
    if (!editingParty || !selectedOrgId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/master-tenants/${editingParty}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: selectedOrgId }),
      });
      if (!res.ok) throw new Error('Failed to assign');
      setEditingParty(null);
      fetchTenants();
      setActionMsg({ type: 'success', text: `Master tenant for ${editingParty} assigned.` });
      setTimeout(() => setActionMsg(null), 4000);
    } catch {
      setActionMsg({ type: 'error', text: 'Failed to save assignment.' });
    } finally {
      setSaving(false);
    }
  }

  async function clearTenant(party: PartyAffiliation) {
    if (!confirm(`Remove master tenant for ${party}?`)) return;
    setClearing(true);
    try {
      await fetch(`/api/admin/master-tenants/${party}`, { method: 'DELETE' });
      setEditingParty(null);
      fetchTenants();
      setActionMsg({ type: 'success', text: `Master tenant for ${party} removed.` });
      setTimeout(() => setActionMsg(null), 4000);
    } catch {
      setActionMsg({ type: 'error', text: 'Failed to clear assignment.' });
    } finally {
      setClearing(false);
    }
  }

  const filteredOrgs = allOrgs.filter(
    (o) =>
      o.name.toLowerCase().includes(orgSearch.toLowerCase()) ||
      o.slug.toLowerCase().includes(orgSearch.toLowerCase()),
  );

  const tenantMap = new Map(tenants.map((t) => [t.partyAffiliation, t]));
  const assignedCount = tenants.length;
  const activeAssigned = tenants.filter((t) => t.organization.ownStatus === 'ACTIVE').length;

  return (
    <AdminLayout title="Master Tenants" subtitle="Party affiliation master tenant mappings">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/admin/portal" className="hover:text-blue-600">Dashboard</Link>
        <span>/</span>
        <Link href="/admin/portal/hierarchy" className="hover:text-blue-600">Hierarchy</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Master Tenants</span>
      </nav>

      {/* Flash */}
      {actionMsg && (
        <div className={`mb-5 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium border ${
          actionMsg.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {actionMsg.text}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Total Parties</p>
          <p className="text-2xl font-bold text-gray-900">{ALL_PARTIES.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Assigned</p>
          <p className="text-2xl font-bold text-blue-600">{assignedCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Active</p>
          <p className="text-2xl font-bold text-green-600">{activeAssigned}</p>
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-6 flex items-start gap-3">
        <span className="text-blue-500 flex-shrink-0 mt-0.5">&#x2139;</span>
        <p className="text-sm text-blue-800">
          <strong>Master tenants</strong> automatically receive ownership of new organizations
          that select the matching party affiliation during first-login setup.
          Each party can have at most one master tenant. The assigned org must have
          <strong> canCreateChildren</strong> enabled.
        </p>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-700">
          <p className="font-medium mb-2">{error}</p>
          <button onClick={fetchTenants} className="text-sm underline">Retry</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {ALL_PARTIES.map((party) => {
            const tenant = tenantMap.get(party);
            const meta = PARTY_META[party];
            const statusMeta = tenant ? (STATUS_META[tenant.organization.ownStatus] ?? STATUS_META.ACTIVE) : null;

            return (
              <div
                key={party}
                className={`bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col transition-shadow hover:shadow-md ${
                  tenant ? 'border-gray-200' : 'border-dashed border-gray-300'
                }`}
              >
                {/* Header */}
                <div className={`px-4 py-3 flex items-center gap-3 ${meta.bg} border-b ${meta.border}`}>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm ${meta.color}`}>{meta.label}</p>
                    <p className="text-xs text-gray-500">Party Affiliation</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PARTY_BADGE[party]}`}>
                    {party}
                  </span>
                  {statusMeta && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusMeta.bg} ${statusMeta.color}`}>
                      {statusMeta.label}
                    </span>
                  )}
                </div>

                {/* Body */}
                <div className="px-4 py-4 flex-1">
                  {tenant ? (
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Organization</p>
                        <p className="font-semibold text-gray-900 text-sm truncate">{tenant.organization.name}</p>
                      </div>
                      <div className="flex items-center gap-3 text-xs flex-wrap">
                        <span className="font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">/{tenant.organization.slug}</span>
                        <span className={tenant.organization.canCreateChildren ? 'text-green-600 font-medium' : 'text-amber-600 font-medium'}>
                          {tenant.organization.canCreateChildren ? '\u2713 Can accept children' : '\u26A0 No children allowed'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-4 text-center">
                      <p className="text-sm text-gray-500">No master tenant assigned</p>
                      <p className="text-xs text-gray-400 mt-1">New {meta.label} orgs will be unparented</p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-2">
                  {tenant ? (
                    <>
                      <Link
                        href={`/admin/portal/organizations/${tenant.organizationId}`}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View org \u2192
                      </Link>
                      <button
                        onClick={() => openEdit(party)}
                        className="text-xs bg-white border border-gray-300 text-gray-700 rounded-lg px-3 py-1.5 hover:bg-gray-50 font-medium"
                      >
                        Change
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => openEdit(party)}
                      className={`w-full text-xs font-medium rounded-lg px-3 py-1.5 ${meta.bg} ${meta.color} border ${meta.border} hover:opacity-80 transition-opacity`}
                    >
                      + Assign Master Tenant
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {editingParty && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setEditingParty(null); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden max-h-[90vh]">
            <div className={`px-6 py-4 flex items-center gap-3 ${PARTY_META[editingParty].bg} border-b ${PARTY_META[editingParty].border}`}>
              <div className="flex-1">
                <h3 className={`text-base font-semibold ${PARTY_META[editingParty].color}`}>
                  {tenantMap.has(editingParty) ? 'Change' : 'Assign'} Master Tenant
                </h3>
                <p className="text-xs text-gray-500">{PARTY_META[editingParty].label} Party</p>
              </div>
              <button
                onClick={() => setEditingParty(null)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-black/10 transition-colors"
                aria-label="Close"
              >
                &#x2715;
              </button>
            </div>

            {tenantMap.has(editingParty) && (
              <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2 text-sm">
                <span className="text-amber-500 flex-shrink-0">&#x26A0;</span>
                <span className="text-amber-800">
                  Currently: <strong>{tenantMap.get(editingParty)?.organization.name}</strong>.
                  Changing affects future auto-parenting only.
                </span>
              </div>
            )}

            <div className="px-6 pt-4 pb-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Organization</label>
              <input
                type="text"
                placeholder="Search by name or slug..."
                value={orgSearch}
                onChange={(e) => setOrgSearch(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>

            <div className="mx-6 mb-4 border border-gray-200 rounded-xl overflow-hidden">
              <div className="overflow-y-auto max-h-60">
                {orgsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                  </div>
                ) : filteredOrgs.length === 0 ? (
                  <p className="text-center text-gray-500 py-8 text-sm">No organizations found</p>
                ) : (
                  filteredOrgs.map((o) => {
                    const isSelected = selectedOrgId === o.id;
                    const orgStatus = STATUS_META[o.ownStatus] ?? STATUS_META.ACTIVE;
                    return (
                      <button
                        key={o.id}
                        onClick={() => setSelectedOrgId(o.id)}
                        className={`w-full text-left px-4 py-2.5 text-sm border-b border-gray-100 last:border-0 flex items-center gap-3 transition-colors ${
                          isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                          isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                        }`}>
                          {isSelected && <span className="text-white text-[10px] leading-none">&#x2713;</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{o.name}</p>
                          <p className="text-xs text-gray-400 font-mono">/{o.slug}</p>
                        </div>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${orgStatus.bg} ${orgStatus.color}`}>
                          {orgStatus.label}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3">
              {tenantMap.has(editingParty) ? (
                <button
                  onClick={() => clearTenant(editingParty)}
                  disabled={clearing}
                  className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                >
                  {clearing ? 'Removing...' : 'Remove assignment'}
                </button>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingParty(null)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={saveTenant}
                  disabled={!selectedOrgId || saving}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Assign'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
