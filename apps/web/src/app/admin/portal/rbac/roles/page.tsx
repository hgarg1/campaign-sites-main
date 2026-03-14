'use client';

import { AdminLayout, ProtectedAdminLayout } from '@/components/admin/shared';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface Role {
  id: string;
  name: string;
  description?: string;
  isBuiltIn: boolean;
  _count?: { permissions: number; adminAssignments: number };
}

interface Permission {
  id: string;
  claim: string;
  description?: string;
  category: string;
  operationType: string;
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Load roles
  useEffect(() => {
    const loadData = async () => {
      try {
        const [rolesRes, permsRes] = await Promise.all([
          fetch('/api/admin/roles'),
          fetch('/api/admin/permissions'),
        ]);

        if (!rolesRes.ok || !permsRes.ok) throw new Error('Failed to load data');

        const rolesData = await rolesRes.json();
        const permsData = await permsRes.json();

        setRoles(rolesData);
        setPermissions(permsData);
      } catch (error) {
        console.error('Failed to load roles/permissions:', error);
        setError('Failed to load roles and permissions');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const openCreateModal = () => {
    setFormData({ name: '', description: '' });
    setShowCreateModal(true);
  };

  const openEditModal = (role: Role) => {
    setSelectedRole(role);
    setFormData({ name: role.name, description: role.description || '' });
    setShowEditModal(true);
  };

  const openPermissionsModal = async (role: Role) => {
    setSelectedRole(role);
    try {
      const res = await fetch(`/api/admin/roles/${role.id}/permissions`);
      if (res.ok) {
        const perms = await res.json();
        setSelectedPermissions(perms.map((p: Permission) => p.id));
      }
    } catch (error) {
      console.error('Failed to load role permissions:', error);
    }
    setShowPermissionsModal(true);
  };

  const handleCreateRole = async () => {
    if (!formData.name.trim()) {
      setError('Role name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create role');
      }

      const newRole = await res.json();
      setRoles([...roles, newRole]);
      setShowCreateModal(false);
      setFormData({ name: '', description: '' });
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create role');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedRole || !formData.name.trim()) {
      setError('Role name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/roles/${selectedRole.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update role');
      }

      const updatedRole = await res.json();
      setRoles(roles.map(r => r.id === selectedRole.id ? updatedRole : r));
      setShowEditModal(false);
      setSelectedRole(null);
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update role');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePermissions = async () => {
    if (!selectedRole) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/roles/${selectedRole.id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissionIds: selectedPermissions }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update permissions');
      }

      setShowPermissionsModal(false);
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update permissions');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRole = async (role: Role) => {
    if (role.isBuiltIn) {
      setError('Cannot delete built-in roles');
      return;
    }

    if (!confirm(`Delete role "${role.name}"? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/admin/roles/${role.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete role');
      }

      setRoles(roles.filter(r => r.id !== role.id));
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete role');
    }
  };

  const filteredPermissions = permissions.filter(p => {
    const matchesCategory = !filterCategory || p.category === filterCategory;
    const matchesSearch = !searchQuery || 
      p.claim.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = [...new Set(permissions.map(p => p.category))].sort();

  const content = (
    <>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg"
        >
          <div className="flex items-start justify-between">
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800 font-medium text-sm"
            >
              Dismiss
            </button>
          </div>
        </motion.div>
      )}

      <div className="mb-6 flex justify-between items-center">
        <div>
          <p className="text-gray-600">Total roles: {roles.length}</p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          ➕ Create New Role
        </button>
      </div>

      {/* Roles List */}
      <div className="grid gap-4">
        {roles.map(role => (
          <motion.div
            key={role.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900">{role.name}</h3>
                  {role.isBuiltIn && (
                    <span className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded">Built-in</span>
                  )}
                </div>
                <p className="text-gray-600 mt-1">{role.description || 'No description'}</p>
                <div className="mt-2 flex gap-4 text-sm text-gray-500">
                  <span>Permissions: {role._count?.permissions || 0}</span>
                  <span>Assigned to: {role._count?.adminAssignments || 0} admins</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => openPermissionsModal(role)}
                  className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                >
                  Permissions
                </button>
                {!role.isBuiltIn && (
                  <>
                    <button
                      onClick={() => openEditModal(role)}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteRole(role)}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Create Role Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Create New Role</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Content Manager"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="What does this role do?"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateRole}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Role'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Role Modal */}
      <AnimatePresence>
        {showEditModal && selectedRole && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Edit Role</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={selectedRole.isBuiltIn}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    disabled={selectedRole.isBuiltIn}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateRole}
                  disabled={isSubmitting || selectedRole.isBuiltIn}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manage Permissions Modal */}
      <AnimatePresence>
        {showPermissionsModal && selectedRole && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowPermissionsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Manage Permissions: {selectedRole.name}
              </h2>

              <div className="mb-4 space-y-2">
                <input
                  type="text"
                  placeholder="Search permissions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto mb-6">
                {filteredPermissions.length > 0 ? (
                  filteredPermissions.map(perm => (
                    <label key={perm.id} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes(perm.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPermissions([...selectedPermissions, perm.id]);
                          } else {
                            setSelectedPermissions(selectedPermissions.filter(id => id !== perm.id));
                          }
                        }}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{perm.claim}</div>
                        <div className="text-sm text-gray-600">{perm.description || 'No description'}</div>
                        <div className="text-xs text-gray-500 mt-1">{perm.operationType}</div>
                      </div>
                    </label>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No permissions found</p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowPermissionsModal(false)}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdatePermissions}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : `Save (${selectedPermissions.length} selected)`}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  if (loading) {
    return (
      <AdminLayout title="System Admin Roles" subtitle="Create and manage roles with permissions">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <ProtectedAdminLayout
      title="System Admin Roles"
      subtitle="Create and manage roles with permissions"
      requiredClaim="system_admin_portal:rbac:view_roles"
    >
      {content}
    </ProtectedAdminLayout>
  );
}
