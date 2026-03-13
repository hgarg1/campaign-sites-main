'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConfirmationModal } from '@/components/shared/ConfirmationModal';

interface Permission {
  id: string;
  claim: string;
  description: string;
  category: string;
  operationType: string;
}

interface Override {
  id: string;
  adminId: string;
  permission: Permission;
  action: 'ALLOW' | 'DENY';
  expiresAt: string | null;
}

interface PermissionOverrideManagerProps {
  systemAdminId: string;
  adminName: string;
  onOverridesUpdated?: () => void;
}

export function PermissionOverrideManager({
  systemAdminId,
  adminName,
  onOverridesUpdated,
}: PermissionOverrideManagerProps) {
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<'all' | 'ALLOW' | 'DENY'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPermissionId, setSelectedPermissionId] = useState('');
  const [selectedAction, setSelectedAction] = useState<'ALLOW' | 'DENY'>('ALLOW');
  const [expirationDays, setExpirationDays] = useState<number | ''>('');
  const [justification, setJustification] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteJustification, setDeleteJustification] = useState('');

  useEffect(() => {
    fetchData();
  }, [systemAdminId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/system-admins/${systemAdminId}/permissions`
      );
      if (res.ok) {
        const data = await res.json();
        setAllPermissions(data.allPermissions || []);
        setOverrides(data.overrides || []);
      }
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter permissions based on search and category
  const filteredPermissions = useMemo(() => {
    return allPermissions.filter((perm) => {
      const matchesSearch =
        perm.claim.toLowerCase().includes(searchQuery.toLowerCase()) ||
        perm.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        categoryFilter === 'all' || perm.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [allPermissions, searchQuery, categoryFilter]);

  // Filter overrides based on action filter
  const filteredOverrides = useMemo(() => {
    return overrides.filter((override) => {
      if (actionFilter === 'all') return true;
      return override.action === actionFilter;
    });
  }, [overrides, actionFilter]);

  // Get unique categories
  const categories = useMemo(() => {
    return Array.from(new Set(allPermissions.map((p) => p.category))).sort();
  }, [allPermissions]);

  const handleCreateOverride = async (justif?: string) => {
    if (!selectedPermissionId || !justif) return;

    try {
      const expiresAt = expirationDays
        ? new Date(Date.now() + Number(expirationDays) * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const res = await fetch(
        `/api/admin/system-admins/${systemAdminId}/permissions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            permissionId: selectedPermissionId,
            action: selectedAction,
            expiresAt,
            justification: justif,
          }),
        }
      );

      if (res.ok) {
        setShowCreateModal(false);
        setSelectedPermissionId('');
        setSelectedAction('ALLOW');
        setExpirationDays('');
        setJustification('');
        await fetchData();
        onOverridesUpdated?.();
      }
    } catch (error) {
      console.error('Failed to create override:', error);
    }
  };

  const handleDeleteOverride = async (justif?: string) => {
    if (!deleteTargetId || !justif) return;

    try {
      const res = await fetch(
        `/api/admin/system-admins/${systemAdminId}/permissions?permissionId=${deleteTargetId}&justification=${encodeURIComponent(justif)}`,
        { method: 'DELETE' }
      );

      if (res.ok) {
        setShowDeleteModal(false);
        setDeleteTargetId(null);
        setDeleteJustification('');
        await fetchData();
        onOverridesUpdated?.();
      }
    } catch (error) {
      console.error('Failed to delete override:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        Loading permissions...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        className="bg-white rounded-xl border border-gray-200 p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Permission Overrides
            </h2>
            <p className="text-gray-600">
              Manage granular ALLOW/DENY permission overrides for {adminName}.
              Overrides take precedence over role-based permissions.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            + Add Override
          </button>
        </div>

        <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-900">
          <p>
            <strong>⚠️ Powerful Feature:</strong> Overrides apply immediately and take
            precedence over all role-based permissions. DENY always wins. Use with caution.
          </p>
        </div>
      </motion.div>

      {/* Active Overrides */}
      <motion.div
        className="bg-white rounded-xl border border-gray-200 p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Active Overrides ({filteredOverrides.length})
          </h3>

          {overrides.length > 0 && (
            <div className="flex gap-2">
              <select
                value={actionFilter}
                onChange={(e) =>
                  setActionFilter(e.target.value as 'all' | 'ALLOW' | 'DENY')
                }
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Actions</option>
                <option value="ALLOW">Allow Only</option>
                <option value="DENY">Deny Only</option>
              </select>
            </div>
          )}
        </div>

        {filteredOverrides.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg mb-2">No permission overrides</p>
            <p className="text-sm">
              {overrides.length === 0
                ? 'Permissions are based on assigned roles. Click "+ Add Override" to create exceptions.'
                : 'No overrides match the selected filter.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filteredOverrides.map((override) => (
                <motion.div
                  key={override.id}
                  className={`p-4 rounded-lg border flex items-start justify-between ${
                    override.action === 'ALLOW'
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold ${
                          override.action === 'ALLOW'
                            ? 'bg-green-200 text-green-800'
                            : 'bg-red-200 text-red-800'
                        }`}
                      >
                        {override.action}
                      </span>
                      <code className="text-sm font-mono text-gray-900 truncate">
                        {override.permission.claim}
                      </code>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      {override.permission.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="bg-gray-100 px-2 py-0.5 rounded">
                        {override.permission.category}
                      </span>
                      {override.expiresAt && (
                        <span>
                          Expires:{' '}
                          {new Date(override.expiresAt).toLocaleDateString()}
                        </span>
                      )}
                      {!override.expiresAt && (
                        <span className="text-orange-600 font-medium">
                          ⚠️ Never expires
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setDeleteTargetId(override.permission.id);
                      setShowDeleteModal(true);
                    }}
                    className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-600 text-xs font-medium rounded transition-colors ml-3 flex-shrink-0"
                  >
                    Remove
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Permission Finder */}
      <motion.div
        className="bg-white rounded-xl border border-gray-200 p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Available Permissions
        </h3>

        {/* Filters */}
        <div className="space-y-3 mb-4">
          <input
            type="text"
            placeholder="Search by claim or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
          />

          {categories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Permissions List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredPermissions.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              No permissions match your search
            </div>
          ) : (
            filteredPermissions.map((perm) => {
              const hasOverride = overrides.some(
                (o) => o.permission.id === perm.id
              );
              return (
                <motion.div
                  key={perm.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    hasOverride
                      ? 'bg-gray-100 border-gray-300 opacity-60'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                  onClick={() => {
                    if (!hasOverride) {
                      setSelectedPermissionId(perm.id);
                      setShowCreateModal(true);
                    }
                  }}
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <code className="text-xs font-mono text-gray-900">
                        {perm.claim}
                      </code>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {perm.description}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-2 flex-shrink-0">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                        {perm.operationType}
                      </span>
                      {hasOverride && (
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">
                          Override Active
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </motion.div>

      {/* Create Override Modal */}
      <ConfirmationModal
        isOpen={showCreateModal}
        title="Create Permission Override"
        message="This override will take precedence over role-based permissions."
        confirmText="Create Override"
        cancelText="Cancel"
        icon="info"
        showJustification={true}
        onConfirm={handleCreateOverride}
        onCancel={() => {
          setShowCreateModal(false);
          setSelectedPermissionId('');
          setJustification('');
        }}
      >
        {/* Note: Modals don't support children, so we handle form state separately */}
      </ConfirmationModal>

      {/* Delete Override Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        title="Remove Permission Override"
        message="This will remove the override. The admin will revert to role-based permissions."
        confirmText="Remove Override"
        cancelText="Cancel"
        isDangerous={true}
        icon="error"
        showJustification={true}
        onConfirm={handleDeleteOverride}
        onCancel={() => {
          setShowDeleteModal(false);
          setDeleteTargetId(null);
          setDeleteJustification('');
        }}
      />

      {/* Create Form Overlay (separate from modal) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full pointer-events-auto space-y-4">
            <h3 className="font-semibold text-gray-900">Override Settings</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Action <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedAction('ALLOW')}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedAction === 'ALLOW'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Allow
                </button>
                <button
                  onClick={() => setSelectedAction('DENY')}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedAction === 'DENY'
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Deny
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expiration (Days)
              </label>
              <input
                type="number"
                min="1"
                placeholder="Leave empty for no expiration"
                value={expirationDays}
                onChange={(e) =>
                  setExpirationDays(e.target.value === '' ? '' : parseInt(e.target.value))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Override will auto-expire after specified days
              </p>
            </div>

            <button
              onClick={() => {
                if (justification) {
                  handleCreateOverride(justification);
                }
              }}
              disabled={!justification}
              className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-medium rounded-lg transition-colors"
            >
              Add Override
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
