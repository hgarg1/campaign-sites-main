'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { TenantLayout } from '@/components/tenant/shared';
import { useEffectiveRestrictions } from '@/hooks/useRestrictions';

interface OrgCustomRole {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  color: string;
  permissions: Array<{ resource: string; actions: string[] }>;
  createdAt: string;
  updatedAt: string;
}

const RESOURCES = ['websites', 'members', 'settings', 'branding', 'integrations', 'billing'] as const;
const ACTIONS = ['read', 'create', 'update', 'delete', 'publish'] as const;

const PRESET_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#3b82f6',
  '#14b8a6',
  '#22c55e',
  '#f59e0b',
  '#f43f5e',
  '#64748b',
];

type PermMap = Record<string, string[]>;

function toPermMap(perms: Array<{ resource: string; actions: string[] }>): PermMap {
  const map: PermMap = {};
  for (const p of perms) {
    map[p.resource] = [...p.actions];
  }
  return map;
}

function fromPermMap(map: PermMap): Array<{ resource: string; actions: string[] }> {
  return Object.entries(map)
    .filter(([, actions]) => actions.length > 0)
    .map(([resource, actions]) => ({ resource, actions }));
}

export default function RolesPage() {
  const params = useParams();
  const orgId = params.id as string;

  const [roles, setRoles] = useState<OrgCustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgError, setMsgError] = useState(false);

  const { isBlocked } = useEffectiveRestrictions(orgId);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<OrgCustomRole | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formColor, setFormColor] = useState(PRESET_COLORS[0]!);
  const [formPerms, setFormPerms] = useState<PermMap>({});
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<OrgCustomRole | null>(null);
  const [deleting, setDeleting] = useState(false);

  const showMsg = (text: string, isError = false) => {
    setMsg(text);
    setMsgError(isError);
    setTimeout(() => setMsg(null), 4000);
  };

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tenant/${orgId}/roles`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { data: OrgCustomRole[] } | OrgCustomRole[];
      setRoles(Array.isArray(json) ? json : (json.data ?? []));
    } catch {
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const openCreate = () => {
    setEditingRole(null);
    setFormName('');
    setFormDesc('');
    setFormColor(PRESET_COLORS[0]!);
    setFormPerms({});
    setModalOpen(true);
  };

  const openEdit = (role: OrgCustomRole) => {
    setEditingRole(role);
    setFormName(role.name);
    setFormDesc(role.description ?? '');
    setFormColor(role.color);
    setFormPerms(toPermMap(role.permissions));
    setModalOpen(true);
  };

  const togglePerm = (resource: string, action: string) => {
    setFormPerms(prev => {
      const current = prev[resource] ?? [];
      const updated = current.includes(action)
        ? current.filter(a => a !== action)
        : [...current, action];
      return { ...prev, [resource]: updated };
    });
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      const body = {
        name: formName.trim(),
        description: formDesc.trim() || undefined,
        color: formColor,
        permissions: fromPermMap(formPerms),
      };
      let res: Response;
      if (editingRole) {
        res = await fetch(`/api/tenant/${orgId}/roles/${editingRole.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch(`/api/tenant/${orgId}/roles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }
      if (res.status === 403) throw new Error('You do not have permission to perform this action.');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showMsg(editingRole ? 'Role updated.' : 'Role created.');
      setModalOpen(false);
      fetchRoles();
    } catch (e) {
      showMsg(e instanceof Error ? e.message : 'Failed to save role', true);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/tenant/${orgId}/roles/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (res.status === 403) throw new Error('You do not have permission to delete this role.');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showMsg('Role deleted.');
      setDeleteTarget(null);
      fetchRoles();
    } catch (e) {
      showMsg(e instanceof Error ? e.message : 'Failed to delete role', true);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <TenantLayout
      title="Custom Roles"
      subtitle="Define custom permission sets for your team"
      orgId={orgId}
    >
      {/* Back link */}
      <div className="mb-4">
        <Link
          href={`/tenant/${orgId}/team`}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          ← Back to Team
        </Link>
      </div>

      {/* Flash message */}
      {msg && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
            msgError
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-green-50 text-green-700 border border-green-200'
          }`}
        >
          {msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">
          {loading ? '…' : `${roles.length} role${roles.length !== 1 ? 's' : ''}`}
        </h2>
        <button
          onClick={openCreate}
          className="bg-blue-600 text-white hover:bg-blue-700 rounded-lg px-4 py-2 text-sm font-medium"
        >
          + Create Role
        </button>
      </div>

      {/* Role cards */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      ) : roles.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
          No custom roles yet. Click &ldquo;+ Create Role&rdquo; to get started.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map(role => (
            <div
              key={role.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              style={{ borderLeftWidth: 4, borderLeftColor: role.color }}
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: role.color }}
                    />
                    <h3 className="font-semibold text-gray-900 truncate">{role.name}</h3>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    <button
                      onClick={() => openEdit(role)}
                      className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(role)}
                      className="text-xs text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {role.description && (
                  <p className="text-sm text-gray-500 mb-3">{role.description}</p>
                )}

                <div className="flex flex-wrap gap-1 mt-3">
                  {role.permissions.flatMap(p =>
                    p.actions.map(a => (
                      <span
                        key={`${p.resource}.${a}`}
                        className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600"
                      >
                        {p.resource}.{a}
                      </span>
                    ))
                  )}
                  {role.permissions.length === 0 && (
                    <span className="text-xs text-gray-400 italic">No permissions</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-gray-200 w-full max-w-2xl shadow-xl max-h-[90vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">
                {editingRole ? 'Edit Role' : 'Create Role'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. Content Editor"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  placeholder="Optional: describe what this role can do"
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Color picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-8 h-8 rounded-full transition-transform ${
                        formColor === c
                          ? 'ring-2 ring-offset-2 ring-gray-400 scale-110'
                          : 'hover:scale-105'
                      }`}
                      title={c}
                    />
                  ))}
                </div>
              </div>

              {/* Permission grid */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permissions
                </label>
                <div className="rounded-lg border border-gray-200 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium text-gray-600">Resource</th>
                        {ACTIONS.map(action => (
                          <th
                            key={action}
                            className="px-3 py-2 font-medium text-gray-600 text-center capitalize"
                          >
                            {action}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {RESOURCES.map(resource => (
                        <tr key={resource}>
                          <td className="px-4 py-2 font-medium text-gray-700 capitalize">
                            {resource}
                          </td>
                          {ACTIONS.map(action => {
                            const isPublishNonWebsite =
                              action === 'publish' && resource !== 'websites';
                            const blocked = isBlocked(resource, action);
                            const checked = (formPerms[resource] ?? []).includes(action);

                            if (isPublishNonWebsite) {
                              return (
                                <td key={action} className="px-3 py-2 text-center">
                                  <span className="text-gray-300">—</span>
                                </td>
                              );
                            }

                            return (
                              <td key={action} className="px-3 py-2 text-center">
                                <span title={blocked ? 'Blocked by policy' : undefined}>
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={blocked}
                                    onChange={() => !blocked && togglePerm(resource, action)}
                                    className={`h-4 w-4 rounded border-gray-300 text-blue-600 ${
                                      blocked
                                        ? 'opacity-40 cursor-not-allowed'
                                        : 'cursor-pointer'
                                    }`}
                                  />
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={handleSave}
                disabled={saving || !formName.trim()}
                className="bg-blue-600 text-white hover:bg-blue-700 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save Role'}
              </button>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation ── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl border border-gray-200 p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Role</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete the role{' '}
              <strong>{deleteTarget.name}</strong>? This cannot be undone — members assigned this
              role will lose their custom permissions.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="bg-red-600 text-white hover:bg-red-700 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete Role'}
              </button>
              <button
                onClick={() => setDeleteTarget(null)}
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
