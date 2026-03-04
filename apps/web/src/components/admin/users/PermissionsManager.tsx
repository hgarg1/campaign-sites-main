'use client';

import { motion } from 'framer-motion';

interface Organization {
  id: string;
  name: string;
  memberRole: 'OWNER' | 'ADMIN' | 'MEMBER';
}

interface PermissionsManagerProps {
  systemRole: 'USER' | 'ADMIN' | 'GLOBAL_ADMIN';
  organizations: Organization[];
  onRoleChange?: (systemRole: string) => void;
  onOrgRoleChange?: (orgId: string, role: string) => void;
}

export function PermissionsManager({
  systemRole,
  organizations,
  onRoleChange,
  onOrgRoleChange,
}: PermissionsManagerProps) {
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="bg-white rounded-xl border border-gray-200 p-6"
    >
      <h3 className="text-lg font-bold text-gray-900 mb-6">Permissions & Roles</h3>

      {/* System Role */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-gray-700">System Role</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{systemRole}</p>
          </div>
          <button
            onClick={() => onRoleChange?.(systemRole)}
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
  );
}
