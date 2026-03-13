'use client';

import { AdminLayout } from '@/components/admin/shared';
import {
  UserProfile,
  UserActivityTimeline,
  PermissionsManager,
  UserActionsPanel,
  UserStatsCard,
  ApiUsagePanel,
} from '@/components/admin/users';
import Link from 'next/link';
import { useUser } from '@/hooks/useUsers';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useSystemAdminPermissions } from '@/hooks/use-system-admin-permissions';

interface PageProps {
  params: {
    id: string;
  };
}

const SAMPLE_ORGANIZATIONS = [
  { id: 'org1', name: 'Progressive Democrats', memberRole: 'OWNER' as const },
  { id: 'org2', name: 'Climate Action 2024', memberRole: 'ADMIN' as const },
];

const SAMPLE_ACTIVITIES = [
  {
    id: '1',
    type: 'login' as const,
    title: 'User logged in',
    timestamp: '2024-02-28T14:22:00Z',
  },
  {
    id: '2',
    type: 'website_published' as const,
    title: 'Website published',
    description: 'Progressive Campaign Website',
    timestamp: '2024-02-27T11:45:00Z',
  },
  {
    id: '3',
    type: 'website_created' as const,
    title: 'Website created',
    description: 'Climate Action Campaign',
    timestamp: '2024-02-20T16:30:00Z',
  },
  {
    id: '4',
    type: 'invite_sent' as const,
    title: 'Invited user to organization',
    description: 'Climate Action 2024',
    timestamp: '2024-02-15T09:30:00Z',
  },
  {
    id: '5',
    type: 'login' as const,
    title: 'User logged in',
    timestamp: '2024-02-10T13:15:00Z',
  },
];

export default function UserDetailPage({ params }: PageProps) {
  const userId = params.id;
  const { data: user, loading, error, refetch } = useUser(userId);
  const { hasPermission } = useSystemAdminPermissions();
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const canEdit = hasPermission('system_admin_portal:users:update');

  const handleOpenEdit = () => {
    if (user) {
      setEditName(user.name || '');
      setEditRole(user.role);
      setShowEditModal(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!user) return;
    
    setEditLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          role: editRole,
          justification: editRole !== user.role ? `Changed role from ${user.role} to ${editRole}` : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update user');
      }

      setShowEditModal(false);
      refetch();
      alert('User updated successfully');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setEditLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Loading user..." subtitle="Fetching user details">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !user) {
    return (
      <AdminLayout title="User not found" subtitle="Unable to load user details">
        <Link
          href="/admin/portal/users"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
        >
          ← Back to Users
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error?.message || 'User not found'}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={user.name || user.email}
      subtitle="User details and management"
    >
      <Link
        href="/admin/portal/users"
        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
      >
        ← Back to Users
      </Link>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-start justify-between">
            <UserProfile 
              user={user}
              onEmailChange={(newEmail, confirmationSent) => {
                if (confirmationSent) {
                  // Refetch user data to get updated email
                  setTimeout(() => refetch(), 1000);
                }
              }}
            />
            {canEdit && (
              <button
                onClick={handleOpenEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mt-6"
              >
                ✏️ Edit
              </button>
            )}
          </div>
          <UserStatsCard userId={user.id} />
          <UserActivityTimeline activities={SAMPLE_ACTIVITIES} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <ApiUsagePanel userId={user.id} />

          <PermissionsManager
            systemRole={user.role}
            organizations={SAMPLE_ORGANIZATIONS}
            onRoleChange={(newRole) => {
              setEditRole(newRole);
              handleOpenEdit();
            }}
            onOrgRoleChange={(orgId, role) => {
              console.log('Change org role:', orgId, role);
              alert(`Organization role change would be processed here`);
            }}
          />

          <UserActionsPanel
            userId={user.id}
            userStatus={user.status}
            onRefresh={refetch}
          />
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => !editLoading && setShowEditModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Edit User</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="User name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="GLOBAL_ADMIN">GLOBAL_ADMIN</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                disabled={editLoading}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={editLoading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {editLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AdminLayout>
  );
}
