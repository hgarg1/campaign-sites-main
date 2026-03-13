'use client';

import { motion } from 'framer-motion';
import { ConfirmationModal } from '@/components/shared/ConfirmationModal';
import { useState } from 'react';
import { useToast } from './ToastContext';
import { useSystemAdminPermissions } from '@/hooks/use-system-admin-permissions';

interface BatchActionsToolbarProps {
  selectedCount: number;
  onDelete?: (justification: string) => Promise<void>;
  onSuspend?: (justification: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export function BatchActionsToolbar({
  selectedCount,
  onDelete,
  onSuspend,
  onRefresh,
}: BatchActionsToolbarProps) {
  const { showToast } = useToast();
  const { hasPermission } = useSystemAdminPermissions();
  const [isLoading, setIsLoading] = useState(false);
  const [modalState, setModalState] = useState<{
    action: 'delete' | 'suspend' | null;
  }>({ action: null });

  const canDelete = hasPermission('system_admin_portal:organizations:delete');
  const canSuspend = hasPermission('system_admin_portal:organizations:write');

  const handleActionConfirm = async (justification?: string) => {
    if (!justification || !modalState.action) return;

    try {
      setIsLoading(true);
      if (modalState.action === 'delete' && onDelete) {
        await onDelete(justification);
        showToast('success', `${selectedCount} item(s) deleted successfully`);
      } else if (modalState.action === 'suspend' && onSuspend) {
        await onSuspend(justification);
        showToast('success', `${selectedCount} item(s) suspended successfully`);
      }
      setModalState({ action: null });
      await onRefresh();
    } catch (error) {
      showToast('error', `Operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (selectedCount === 0) {
    return null;
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-blue-900">
            {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onSuspend && (
            <button
              onClick={() => setModalState({ action: 'suspend' })}
              disabled={isLoading || !canSuspend}
              title={!canSuspend ? 'No permission to suspend organizations' : ''}
              className="px-4 py-2 bg-yellow-100 hover:bg-yellow-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed text-yellow-700 font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              Suspend ({selectedCount})
            </button>
          )}

          {onDelete && (
            <button
              onClick={() => setModalState({ action: 'delete' })}
              disabled={isLoading || !canDelete}
              title={!canDelete ? 'No permission to delete organizations' : ''}
              className="px-4 py-2 bg-red-100 hover:bg-red-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed text-red-700 font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              Delete ({selectedCount})
            </button>
          )}
        </div>
      </motion.div>

      <ConfirmationModal
        isOpen={modalState.action === 'delete'}
        title="Delete Multiple Items"
        message={`This will permanently delete ${selectedCount} item(s). This action cannot be undone.`}
        confirmText="Delete All"
        cancelText="Cancel"
        icon="error"
        showJustification={true}
        isLoading={isLoading}
        isDangerous={true}
        onConfirm={handleActionConfirm}
        onCancel={() => setModalState({ action: null })}
      />

      <ConfirmationModal
        isOpen={modalState.action === 'suspend'}
        title="Suspend Multiple Items"
        message={`This will suspend ${selectedCount} item(s). They can be reactivated later.`}
        confirmText="Suspend All"
        cancelText="Cancel"
        icon="warning"
        showJustification={true}
        isLoading={isLoading}
        isDangerous={false}
        onConfirm={handleActionConfirm}
        onCancel={() => setModalState({ action: null })}
      />
    </>
  );
}
