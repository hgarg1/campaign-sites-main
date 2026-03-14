'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { ChangeRoleModal } from './ChangeRoleModal';

interface Organization {
  id: string;
  name: string;
  memberRole: 'OWNER' | 'ADMIN' | 'MEMBER';
}

interface PermissionsManagerProps {
  systemRole: 'USER' | 'ADMIN' | 'GLOBAL_ADMIN';
  organizations: Organization[];
  userId?: string;
  userName?: string;
  onRoleChange?: (systemRole: string) => void;
  onOrgRoleChange?: (orgId: string, role: string) => void;
  onRoleChangeSuccess?: () => void;
}

interface UserPermissions {
  allPermissions: Array<{ id: string; claim: string; description: string; category: string; operationType: string }>;
  rolePermissions: Array<{ id: string; claim: string }>;
  overrides: Array<{ id: string; claim: string; action: 'ALLOW' | 'DENY' }>;
}

export function PermissionsManager({
  systemRole,
  organizations,
  userId,
  userName = 'User',
  onRoleChange,
  onOrgRoleChange,
  onRoleChangeSuccess,
}: PermissionsManagerProps) {
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showChangeRoleModal, setShowChangeRoleModal] = useState(false);
  const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null);
  const [loadingPermissions, setLoadingPermissions] = useState(false);

  const rolePermissions = {
    USER: ['Create websites', 'Manage own websites', 'Join organizations'],
    ADMIN: ['Manage users', 'Manage organizations', 'View analytics', 'Access admin panel'],
    GLOBAL_ADMIN: [
      'Full system access',
      'Manage all users',
      'Manage all organizations',
      'Manage LLM settings',
      'View system logs',
      'Configure security',
    ],
  };

  const fetchUserPermissions = async () => {
    if (!userId) return;
    setLoadingPermissions(true);
    try {
      const res = await fetch(`/api/admin/system-admins/${userId}/permissions`);
      if (res.ok) {
        const data = await res.json();
        setUserPermissions(data);
      } else {
        console.error(`Failed to load user permissions: ${res.status} ${res.statusText}`, await res.text());
      }
    } catch (err) {
      console.error('Failed to load user permissions:', err);
    } finally {
      setLoadingPermissions(false);
    }
  };

  const handleViewPermissions = () => {
    if (!userPermissions) {
      fetchUserPermissions();
    }
    setShowPermissionsModal(true);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="bg-white rounded-xl border border-gray-200 p-6"
      >
        <h3 className="text-lg font-bold text-gray-900 mb-6">Permissions & Roles</h3>

        {/* System Role */}
        <div 
          onClick={handleViewPermissions}
          className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors group"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-700">System Role</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{systemRole}</p>
              <p className="text-xs text-gray-600 mt-2 group-hover:text-blue-700">Click to view all permissions</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowChangeRoleModal(true);
              }}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Change Role
            </button>
          </div>

          <p className="text-sm font-medium text-gray-700 mb-3">Permissions:</p>
          <ul className="space-y-2">
            {rolePermissions[systemRole as keyof typeof rolePermissions].map((perm, idx) => (
              <li key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                <span className="text-green-600">✓</span>
                {perm}
              </li>
            ))}
          </ul>
        </div>

        {/* Organization Roles */}
        {organizations.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-4">Organization Roles</p>
            <div className="space-y-3">
              {organizations.map((org, index) => (
                <motion.div
                  key={org.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 + index * 0.05 }}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-gray-900">{org.name}</p>
                    <p className="text-sm text-gray-600">Role: {org.memberRole}</p>
                  </div>
                  <button
                    onClick={() => onOrgRoleChange?.(org.id, org.memberRole)}
                    className="px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Edit
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* User Permissions Modal */}
      {showPermissionsModal && (
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
            className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex-shrink-0 border-b border-gray-200 p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">User Permissions</h2>
                  <p className="text-sm text-gray-600 mt-1">System Role: {systemRole}</p>
                </div>
                <button
                  onClick={() => setShowPermissionsModal(false)}
                  className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Close modal"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loadingPermissions ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : userPermissions ? (
                <>
                  {/* Role Permissions */}
                  {userPermissions.rolePermissions.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Role Permissions ({userPermissions.rolePermissions.length})
                      </h3>
                      <div className="grid gap-2">
                        {userPermissions.rolePermissions.map((perm) => (
                          <div key={perm.id} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                            <span className="text-green-600 mt-1">✓</span>
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 break-all">{perm.claim}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Permission Overrides */}
                  {userPermissions.overrides.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Permission Overrides ({userPermissions.overrides.length})
                      </h3>
                      <div className="grid gap-2">
                        {userPermissions.overrides.map((override) => (
                          <div
                            key={override.id}
                            className={`flex items-start gap-3 p-3 rounded-lg border ${
                              override.action === 'ALLOW'
                                ? 'bg-blue-50 border-blue-200'
                                : 'bg-red-50 border-red-200'
                            }`}
                          >
                            <span className={override.action === 'ALLOW' ? 'text-blue-600' : 'text-red-600'}>
                              {override.action === 'ALLOW' ? '✓' : '✕'}
                            </span>
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 break-all">{override.claim}</div>
                              <div className="text-xs mt-1">
                                <span
                                  className={`px-2 py-0.5 rounded ${
                                    override.action === 'ALLOW'
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-red-100 text-red-700'
                                  }`}
                                >
                                  {override.action}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {userPermissions.rolePermissions.length === 0 && userPermissions.overrides.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No permissions assigned to this user
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Failed to load permissions
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 border-t border-gray-200 p-6 bg-gray-50 rounded-b-lg">
              <button
                onClick={() => setShowPermissionsModal(false)}
                className="w-full px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Change Role Modal */}
      <ChangeRoleModal
        isOpen={showChangeRoleModal}
        userId={userId || ''}
        userName={userName}
        currentRole={systemRole}
        onClose={() => setShowChangeRoleModal(false)}
        onSuccess={onRoleChangeSuccess}
      />
    </>
  );
}
