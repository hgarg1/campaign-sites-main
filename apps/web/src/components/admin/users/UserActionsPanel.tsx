'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { useUser } from '@/hooks/useUsers';
import { useToast } from '../shared/ToastContext';

interface UserActionsPanelProps {
  userId: string;
  userStatus: 'active' | 'suspended' | 'deleted';
  onRefresh?: () => void;
}

export function UserActionsPanel({
  userId,
  userStatus,
  onRefresh,
}: UserActionsPanelProps) {
  const { suspendUser, unsuspendUser, resetPassword, deleteUser, impersonateUser } = useUser(userId);
  const { success, error } = useToast();
  
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.3 }}
      className="bg-white rounded-xl border border-gray-200 p-6"
    >
      <h3 className="text-lg font-bold text-gray-900 mb-4">Actions</h3>

      <div className="space-y-3">
        {/* Reset Password */}
        <button
          disabled={loadingAction === 'resetPassword'}
          onClick={async () => {
            if (confirm('Send password reset email to this user?')) {
              setLoadingAction('resetPassword');
              try {
                await resetPassword();
                success('Password reset email sent', 'The user will receive a reset link shortly');
                onRefresh?.();
              } catch (err) {
                error('Failed to send reset email', err instanceof Error ? err.message : 'Unknown error');
              } finally {
                setLoadingAction(null);
              }
            }
          }}
          className="w-full px-4 py-3 text-left font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>{loadingAction === 'resetPassword' ? '⏳' : '🔐'}</span>
          {loadingAction === 'resetPassword' ? 'Sending...' : 'Reset Password'}
        </button>

        {/* Impersonate */}
        <button
          disabled={loadingAction === 'impersonate'}
          onClick={async () => {
            if (confirm('Impersonate this user? You will be logged in as them.')) {
              setLoadingAction('impersonate');
              try {
                await impersonateUser();
                success('Impersonation started', 'You are now logged in as this user');
              } catch (err) {
                error('Failed to impersonate user', err instanceof Error ? err.message : 'Unknown error');
              } finally {
                setLoadingAction(null);
              }
            }
          }}
          className="w-full px-4 py-3 text-left font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors border border-purple-200 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>{loadingAction === 'impersonate' ? '⏳' : '👤'}</span>
          {loadingAction === 'impersonate' ? 'Processing...' : 'Impersonate User'}
        </button>

        {/* Suspend/Unsuspend */}
        {userStatus === 'active' ? (
          <button
            disabled={loadingAction === 'suspend'}
            onClick={() => setShowSuspendModal(true)}
            className="w-full px-4 py-3 text-left font-medium text-yellow-700 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors border border-yellow-200 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>⛔</span>
            Suspend User
          </button>
        ) : (
          <button
            disabled={loadingAction === 'unsuspend'}
            onClick={async () => {
              if (confirm('Unsuspend this user?')) {
                setLoadingAction('unsuspend');
                try {
                  await unsuspendUser();
                  success('User unsuspended', 'The user can now access their account');
                  onRefresh?.();
                } catch (err) {
                  error('Failed to unsuspend user', err instanceof Error ? err.message : 'Unknown error');
                } finally {
                  setLoadingAction(null);
                }
              }
            }}
            className="w-full px-4 py-3 text-left font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors border border-green-200 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{loadingAction === 'unsuspend' ? '⏳' : '✅'}</span>
            {loadingAction === 'unsuspend' ? 'Processing...' : 'Unsuspend User'}
          </button>
        )}

        {/* Delete */}
        <button
          disabled={loadingAction === 'delete'}
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full px-4 py-3 text-left font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors border border-red-200 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>🗑️</span>
          Delete User
        </button>
      </div>

      {/* Suspend Modal */}
      {showSuspendModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowSuspendModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
          >
            <h4 className="text-lg font-bold text-gray-900 mb-4">Suspend User</h4>
            <p className="text-gray-600 mb-4">Are you sure you want to suspend this user?</p>

            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="Enter reason (optional)"
              className="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 mb-4"
              rows={3}
            />

            <div className="flex gap-3">
              <button
                onClick={() => setShowSuspendModal(false)}
                disabled={loadingAction === 'suspend'}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setLoadingAction('suspend');
                  try {
                    await suspendUser(suspendReason);
                    success('User suspended', suspendReason ? `Reason: ${suspendReason}` : 'User has been suspended');
                    setShowSuspendModal(false);
                    setSuspendReason('');
                    onRefresh?.();
                  } catch (err) {
                    error('Failed to suspend user', err instanceof Error ? err.message : 'Unknown error');
                  } finally {
                    setLoadingAction(null);
                  }
                }}
                disabled={loadingAction === 'suspend'}
                className="flex-1 px-4 py-2 text-white bg-yellow-600 rounded hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingAction === 'suspend' ? 'Suspending...' : 'Suspend'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
          >
            <h4 className="text-lg font-bold text-red-600 mb-4">⚠️ Delete User</h4>
            <p className="text-gray-600 mb-4">
              This action cannot be undone. All user data will be permanently deleted. Are you sure?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={loadingAction === 'delete'}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setLoadingAction('delete');
                  try {
                    await deleteUser();
                    success('User deleted', 'User account has been permanently deleted');
                    setShowDeleteConfirm(false);
                    onRefresh?.();
                  } catch (err) {
                    error('Failed to delete user', err instanceof Error ? err.message : 'Unknown error');
                  } finally {
                    setLoadingAction(null);
                  }
                }}
                disabled={loadingAction === 'delete'}
                className="flex-1 px-4 py-2 text-white bg-red-600 rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingAction === 'delete' ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
