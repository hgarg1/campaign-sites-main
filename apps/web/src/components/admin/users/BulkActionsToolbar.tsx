'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { useToast } from '../shared/ToastContext';

interface BulkActionsToolbarProps {
  selectedCount: number;
  selectedUserIds?: string[];
  onSuspend?: (userIds: string[]) => Promise<void>;
  onUnsuspend?: (userIds: string[]) => Promise<void>;
  onDelete?: (userIds: string[]) => Promise<void>;
  onExport?: (userIds: string[]) => void;
  onClearSelection?: () => void;
}

export function BulkActionsToolbar({
  selectedCount,
  selectedUserIds = [],
  onSuspend,
  onUnsuspend,
  onDelete,
  onExport,
  onClearSelection,
}: BulkActionsToolbarProps) {
  const { success, error } = useToast();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (selectedCount === 0) return null;

  const handleSuspend = async (userIds: string[]) => {
    setLoadingAction('suspend');
    try {
      await onSuspend?.(userIds);
      success('Users suspended', `${selectedCount} user(s) have been suspended`);
      onClearSelection?.();
    } catch (err) {
      error('Failed to suspend users', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleUnsuspend = async (userIds: string[]) => {
    setLoadingAction('unsuspend');
    try {
      await onUnsuspend?.(userIds);
      success('Users unsuspended', `${selectedCount} user(s) have been restored`);
      onClearSelection?.();
    } catch (err) {
      error('Failed to unsuspend users', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDelete = async (userIds: string[]) => {
    setLoadingAction('delete');
    try {
      await onDelete?.(userIds);
      success('Users deleted', `${selectedCount} user(s) have been permanently deleted`);
      setShowDeleteConfirm(false);
      onClearSelection?.();
    } catch (err) {
      error('Failed to delete users', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className="sticky top-0 z-40 mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-blue-900">
              {selectedCount} selected
            </span>
            <button
              onClick={onClearSelection}
              className="text-xs text-blue-600 hover:text-blue-700 underline"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Suspend */}
          <button
            disabled={loadingAction !== null}
            onClick={() => handleSuspend(selectedUserIds)}
            className="px-4 py-2 text-sm font-medium text-yellow-700 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors border border-yellow-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{loadingAction === 'suspend' ? '⏳' : '⛔'}</span>
            {loadingAction === 'suspend' ? 'Suspending...' : 'Suspend'}
          </button>

          {/* Unsuspend */}
          <button
            disabled={loadingAction !== null}
            onClick={() => handleUnsuspend(selectedUserIds)}
            className="px-4 py-2 text-sm font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors border border-green-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{loadingAction === 'unsuspend' ? '⏳' : '✅'}</span>
            {loadingAction === 'unsuspend' ? 'Restoring...' : 'Unsuspend'}
          </button>

          {/* Export */}
          <button
            disabled={loadingAction !== null}
            onClick={() => {
              onExport?.(selectedUserIds);
              success('Export started', 'Your CSV file will download shortly');
            }}
            className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors border border-blue-300 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>📊</span>
            Export
          </button>

          {/* Delete */}
          <button
            disabled={loadingAction !== null}
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors border border-red-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>🗑️</span>
            Delete
          </button>
        </div>
      </motion.div>

      {/* Delete Confirmation Modal */}
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
            <h4 className="text-lg font-bold text-red-600 mb-4">⚠️ Delete {selectedCount} User(s)?</h4>
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
                onClick={() => handleDelete(selectedUserIds)}
                disabled={loadingAction === 'delete'}
                className="flex-1 px-4 py-2 text-white bg-red-600 rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingAction === 'delete' ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}
