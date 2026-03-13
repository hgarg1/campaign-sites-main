'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ConfirmationModal } from '@/components/shared/ConfirmationModal';

interface PermissionOverride {
  id: string;
  action: 'ALLOW' | 'DENY';
  permission: {
    id: string;
    claim: string;
    description: string;
  };
  expiresAt: string | null;
}

interface PermissionOverridePanelProps {
  systemAdminId: string;
  onOverridesUpdated?: () => void;
}

export function PermissionOverridePanel({
  systemAdminId,
  onOverridesUpdated,
}: PermissionOverridePanelProps) {
  const [overrides, setOverrides] = useState<PermissionOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [justification, setJustification] = useState('');

  React.useEffect(() => {
    fetchOverrides();
  }, [systemAdminId]);

  const fetchOverrides = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/system-admins/${systemAdminId}/permissions`
      );
      if (res.ok) {
        const data = await res.json();
        setOverrides(data.overrides || []);
      }
    } catch (error) {
      console.error('Failed to fetch overrides:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOverride = async () => {
    if (!deleteTargetId || !justification) return;

    try {
      const res = await fetch(
        `/api/admin/system-admins/${systemAdminId}/permissions?permissionId=${deleteTargetId}&justification=${encodeURIComponent(justification)}`,
        { method: 'DELETE' }
      );

      if (res.ok) {
        setDeleteTargetId(null);
        setJustification('');
        fetchOverrides();
        onOverridesUpdated?.();
      }
    } catch (error) {
      console.error('Failed to delete override:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500">Loading overrides...</div>
    );
  }

  return (
    <motion.div
      className="bg-white rounded-xl border border-gray-200 p-6 mt-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.3 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Permission Overrides
        </h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Override
        </button>
      </div>

      {overrides.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No permission overrides. Permissions are based on assigned roles.
        </div>
      ) : (
        <div className="space-y-3">
          {overrides.map((override) => (
            <motion.div
              key={override.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                override.action === 'ALLOW'
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-bold ${
                      override.action === 'ALLOW'
                        ? 'bg-green-200 text-green-800'
                        : 'bg-red-200 text-red-800'
                    }`}
                  >
                    {override.action}
                  </span>
                  <code className="text-xs font-mono text-gray-700">
                    {override.permission.claim}
                  </code>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {override.permission.description}
                </p>
                {override.expiresAt && (
                  <p className="text-xs text-gray-500 mt-1">
                    Expires: {new Date(override.expiresAt).toLocaleDateString()}
                  </p>
                )}
              </div>
              <button
                onClick={() => setDeleteTargetId(override.id)}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded transition-colors ml-3"
              >
                Remove
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Delete Override Modal */}
      {deleteTargetId && (
        <ConfirmationModal
          isOpen={true}
          title="Remove Permission Override"
          message="This will remove the override. The user will revert to role-based permissions."
          confirmText="Remove Override"
          cancelText="Cancel"
          isDangerous={true}
          icon="error"
          showJustification={true}
          onConfirm={handleDeleteOverride}
          onCancel={() => {
            setDeleteTargetId(null);
            setJustification('');
          }}
        />
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <h2 className="text-lg font-semibold mb-2">Add Permission Override</h2>
            <p className="text-sm text-gray-600 mb-4">
              Advanced feature: Grant or revoke specific permissions. Use with caution.
            </p>
            <button
              onClick={() => setShowAddModal(false)}
              className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
            >
              Close (Feature Coming Soon)
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
