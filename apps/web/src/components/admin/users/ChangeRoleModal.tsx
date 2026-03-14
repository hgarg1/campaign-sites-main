'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Role {
  id: string;
  name: string;
  description?: string;
  _count?: { permissions: number };
}

interface ChangeRoleModalProps {
  isOpen: boolean;
  userId: string;
  userName: string;
  currentRole: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ChangeRoleModal({
  isOpen,
  userId,
  userName,
  currentRole,
  onClose,
  onSuccess,
}: ChangeRoleModalProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [justification, setJustification] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && roles.length === 0) {
      fetchRoles();
    }
  }, [isOpen]);

  const fetchRoles = async () => {
    setLoadingRoles(true);
    try {
      const res = await fetch('/api/admin/roles');
      if (res.ok) {
        const data = await res.json();
        setRoles(data.filter((r: Role) => r.name !== currentRole));
        if (data.length > 0) {
          setSelectedRole(data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch roles:', err);
      setError('Failed to load available roles');
    } finally {
      setLoadingRoles(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedRole || justification.trim().length < 10) {
      setError('Justification must be at least 10 characters');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: selectedRole,
          justification: justification.trim(),
        }),
      });

      if (!res.ok) {
        let errorData: any = {};
        try {
          errorData = await res.json();
        } catch {
          // Response might not be JSON
          errorData = { error: res.statusText };
        }
        throw new Error(errorData.error || 'Failed to change role');
      }

      // Success
      onClose();
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change role');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex-shrink-0 border-b border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Change User Role</h2>
                  <p className="text-sm text-gray-600 mt-1">{userName}</p>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Close"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Current Role */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700">
                  <strong>Current Role:</strong> {currentRole}
                </p>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-4">
                  New Role *
                </label>

                {loadingRoles ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600 text-sm">Loading roles...</span>
                  </div>
                ) : roles.length > 0 ? (
                  <div className="max-h-[300px] overflow-y-auto border border-gray-300 rounded-lg p-3 space-y-2">
                    {roles.map((role) => (
                      <label
                        key={role.id}
                        className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedRole === role.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <input
                          type="radio"
                          name="role"
                          value={role.id}
                          checked={selectedRole === role.id}
                          onChange={(e) => setSelectedRole(e.target.value)}
                          className="mt-1 flex-shrink-0"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{role.name}</div>
                          {role.description && (
                            <div className="text-sm text-gray-600 mt-1">{role.description}</div>
                          )}
                          {role._count && (
                            <div className="text-xs text-gray-500 mt-2">
                              {role._count.permissions} permissions
                            </div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No roles available</p>
                  </div>
                )}
              </div>

              {/* Justification */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Reason for Role Change *
                </label>
                <textarea
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Explain why this role change is necessary. Include any relevant approvals or business context."
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent text-sm resize-none ${
                    justification.length < 10 && justification.length > 0
                      ? 'border-yellow-300 focus:ring-yellow-500'
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  rows={5}
                />
                <p className="text-xs text-gray-600 mt-2">
                  Minimum 10 characters. This will be logged in the audit trail.
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 border-t border-gray-200 p-6 bg-gray-50 rounded-b-lg flex gap-3">
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!selectedRole || justification.trim().length < 10 || isSubmitting}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Changing Role...' : 'Change Role'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
