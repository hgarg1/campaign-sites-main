'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ConfirmationModal } from '@/components/shared/ConfirmationModal';

interface SystemAdminRole {
  id: string;
  name: string;
  description: string;
}

interface RoleAssignment {
  id: string;
  roleId: string;
  role: SystemAdminRole;
  assignedAt: string;
}

interface RoleAssignmentPanelProps {
  systemAdminId: string;
  onRolesUpdated?: () => void;
}

export function RoleAssignmentPanel({
  systemAdminId,
  onRolesUpdated,
}: RoleAssignmentPanelProps) {
  const [roles, setRoles] = useState<SystemAdminRole[]>([]);
  const [assignments, setAssignments] = useState<RoleAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [justification, setJustification] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [revokeTargetId, setRevokeTargetId] = useState<string | null>(null);
  const [showRevokeModal, setShowRevokeModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, [systemAdminId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all available roles
      const rolesRes = await fetch(`/api/admin/roles`);
      if (rolesRes.ok) {
        setRoles(await rolesRes.json());
      }

      // Fetch current assignments
      const assignRes = await fetch(
        `/api/admin/system-admins/${systemAdminId}/roles`
      );
      if (assignRes.ok) {
        setAssignments(await assignRes.json());
      }
    } catch (error) {
      console.error('Failed to fetch role data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRole = async (justif?: string) => {
    if (!selectedRoleId || !justif) return;

    try {
      const response = await fetch(
        `/api/admin/system-admins/${systemAdminId}/roles`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roleId: selectedRoleId,
            justification: justif,
          }),
        }
      );

      if (response.ok) {
        setShowAssignModal(false);
        setSelectedRoleId('');
        setJustification('');
        fetchData();
        onRolesUpdated?.();
      }
    } catch (error) {
      console.error('Failed to assign role:', error);
    }
  };

  const handleRevokeRole = async (justif?: string) => {
    if (!revokeTargetId || !justif) return;

    try {
      const response = await fetch(
        `/api/admin/system-admins/${systemAdminId}/roles?roleId=${revokeTargetId}&justification=${encodeURIComponent(justif)}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        setShowRevokeModal(false);
        setRevokeTargetId(null);
        setJustification('');
        fetchData();
        onRolesUpdated?.();
      }
    } catch (error) {
      console.error('Failed to revoke role:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500">Loading roles...</div>
    );
  }

  // Get assigned role IDs
  const assignedRoleIds = new Set(assignments.map((a) => a.roleId));
  const assignedRole = assignments.length > 0 ? assignments[0].role : null;

  return (
    <motion.div
      className="bg-white rounded-xl border border-blue-200 bg-blue-50 p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">System Admin Roles</h3>
        <button
          onClick={() => {
            setShowAssignModal(true);
            setJustification('');
          }}
          className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Assign Role
        </button>
      </div>

      {assignedRole ? (
        <motion.div
          className="flex items-center justify-between p-4 bg-white rounded-lg border border-blue-200"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div>
            <p className="font-medium text-gray-900">{assignedRole.name}</p>
            <p className="text-sm text-gray-600">{assignedRole.description}</p>
          </div>
          <button
            onClick={() => {
              setRevokeTargetId(assignedRole.id);
              setShowRevokeModal(true);
              setJustification('');
            }}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium rounded transition-colors"
          >
            Revoke
          </button>
        </motion.div>
      ) : (
        <div className="text-center py-8 text-gray-500 bg-white rounded-lg">
          No roles assigned yet
        </div>
      )}

      {/* Assign Role Modal */}
      <ConfirmationModal
        isOpen={showAssignModal}
        title="Assign System Admin Role"
        message="Select a role to assign to this system admin. This will grant them all permissions associated with the role."
        confirmText="Assign Role"
        cancelText="Cancel"
        icon="info"
        showJustification={true}
        onConfirm={handleAssignRole}
        onCancel={() => {
          setShowAssignModal(false);
          setSelectedRoleId('');
          setJustification('');
        }}
      >
        {/* Note: This component doesn't support children, so we'll add the selector below the modal in a separate div */}
      </ConfirmationModal>

      {/* Revoke Role Modal */}
      <ConfirmationModal
        isOpen={showRevokeModal}
        title="Revoke System Admin Role"
        message="This will remove all permissions granted by this role."
        confirmText="Revoke Role"
        cancelText="Cancel"
        isDangerous={true}
        icon="error"
        showJustification={true}
        onConfirm={handleRevokeRole}
        onCancel={() => {
          setShowRevokeModal(false);
          setRevokeTargetId(null);
          setJustification('');
        }}
      />

      {/* Role selection overlay when assign modal is open */}
      {showAssignModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[60] p-4 pointer-events-none">
          <div className="bg-white rounded-lg shadow-lg p-4 max-w-xs w-full pointer-events-auto">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Role <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedRoleId}
              onChange={(e) => setSelectedRoleId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
            >
              <option value="">Choose a role...</option>
              {roles
                .filter((role) => !assignedRoleIds.has(role.id))
                .map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      )}
    </motion.div>
  );
}
