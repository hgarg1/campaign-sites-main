'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/shared';

type PartyAffiliation = 'REPUBLICAN' | 'DEMOCRAT' | 'LIBERTARIAN' | 'GREEN' | 'INDEPENDENT' | 'NONPARTISAN' | 'OTHER';

interface MasterTenantOrg {
  id: string;
  name: string;
  slug: string;
  ownStatus: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
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
}

const ALL_PARTIES: PartyAffiliation[] = ['REPUBLICAN', 'DEMOCRAT', 'LIBERTARIAN', 'GREEN', 'INDEPENDENT', 'NONPARTISAN', 'OTHER'];

const PARTY_COLORS: Record<PartyAffiliation, string> = {
  REPUBLICAN: 'bg-red-100 text-red-700',
  DEMOCRAT: 'bg-blue-100 text-blue-700',
  LIBERTARIAN: 'bg-yellow-100 text-yellow-700',
  GREEN: 'bg-green-100 text-green-700',
  INDEPENDENT: 'bg-gray-100 text-gray-700',
  NONPARTISAN: 'bg-slate-100 text-slate-700',
  OTHER: 'bg-purple-100 text-purple-700',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  SUSPENDED: 'bg-yellow-100 text-yellow-700',
  DEACTIVATED: 'bg-red-100 text-red-700',
};

export default function MasterTenantsPage() {
  const router = useRouter();

  const [tenants, setTenants] = useState<MasterTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // All orgs for the modal
  const [allOrgs, setAllOrgs] = useState<FlatOrg[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(false);

  // Modal state
  const [editingParty, setEditingParty] = useState<PartyAffiliation | null>(null);
  const [orgSearch, setOrgSearch] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);

  function fetchTenants() {
    setLoading(true);
    globalThis.fetch('/api/admin/master-tenants')
      .then((r) => r.json())
      .then((d: { data: MasterTenant[] }) => setTenants(d.data ?? []))
      .catch(() => setError('Failed to load master tenants'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchTenants();
  }, []);

  function openEdit(party: PartyAffiliation) {
    setEditingParty(party);
    setOrgSearch('');
    const current = tenants.find((t) => t.partyAffiliation === party);
    setSelectedOrgId(current?.organizationId ?? '');

    if (allOrgs.length === 0) {
      setOrgsLoading(true);
      globalThis.fetch('/api/admin/organizations?pageSize=500')
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
      await globalThis.fetch(`/api/admin/master-tenants/${editingParty}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: selectedOrgId }),
      });
      setEditingParty(null);
      fetchTenants();
    } finally {
      setSaving(false);
    }
  }

  async function clearTenant(party: PartyAffiliation) {
    setClearing(true);
    try {
      await globalThis.fetch(`/api/admin/master-tenants/${party}`, { method: 'DELETE' });
      setEditingParty(null);
      fetchTenants();
    } finally {
      setClearing(false);
    }
  }

  const filteredOrgs = allOrgs.filter((o) =>
    o.name.toLowerCase().includes(orgSearch.toLowerCase()) || o.slug.toLowerCase().includes(orgSearch.toLowerCase())
  );

  const tenantMap = new Map(tenants.map((t) => [t.partyAffiliation, t]));

  return (
    <AdminLayout title="Master Tenants" subtitle="Manage party affiliation master tenant mappings">
      {/* Back button */}
      <button onClick={() => router.push('/admin/portal/hierarchy')} className="mb-6 text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2">
        ← Back to Hierarchy
      </button>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
        <span className="text-blue-500 text-lg mt-0.5">ℹ</span>
        <p className="text-sm text-blue-800">
          <strong>Master tenants</strong> automatically receive all new organizations that select the matching party affiliation during their first-login setup.
          Each party affiliation can have at most one master tenant organization.
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Party</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Master Tenant Organization</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Slug</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Status</th>
                  <th className="text-right py-3 px-4 text-gray-500 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {ALL_PARTIES.map((party) => {
                  const tenant = tenantMap.get(party);
                  return (
                    <tr key={party} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PARTY_COLORS[party]}`}>
                          {party}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {tenant ? (
                          <span className="font-medium text-gray-900">{tenant.organization.name}</span>
                        ) : (
                          <span className="text-gray-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-gray-500 text-xs">
                        {tenant?.organization.slug ?? '—'}
                      </td>
                      <td className="py-3 px-4">
                        {tenant ? (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[tenant.organization.ownStatus]}`}>
                            {tenant.organization.ownStatus}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button onClick={() => openEdit(party)} className="bg-white border border-gray-300 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50">
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingParty && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Edit Master Tenant
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Party: <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PARTY_COLORS[editingParty]}`}>{editingParty}</span>
            </p>

            <label className="block text-sm font-medium text-gray-700 mb-2">Select Organization</label>
            <input
              type="text"
              placeholder="Search organizations..."
              value={orgSearch}
              onChange={(e) => setOrgSearch(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg mb-4">
              {orgsLoading ? (
                <div className="flex justify-center py-6">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredOrgs.length === 0 ? (
                <p className="text-center text-gray-500 py-6 text-sm">No organizations found</p>
              ) : (
                filteredOrgs.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setSelectedOrgId(o.id)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${selectedOrgId === o.id ? 'bg-blue-50' : ''}`}
                  >
                    <span className="font-medium text-gray-900">{o.name}</span>
                    <span className="text-gray-400 font-mono text-xs">{o.slug}</span>
                  </button>
                ))
              )}
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => clearTenant(editingParty)}
                disabled={clearing || !tenantMap.has(editingParty)}
                className="bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-40"
              >
                {clearing ? 'Clearing...' : 'Clear Assignment'}
              </button>
              <div className="flex gap-2">
                <button onClick={() => setEditingParty(null)} className="bg-white border border-gray-300 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50">
                  Cancel
                </button>
                <button
                  onClick={saveTenant}
                  disabled={!selectedOrgId || saving}
                  className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
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
