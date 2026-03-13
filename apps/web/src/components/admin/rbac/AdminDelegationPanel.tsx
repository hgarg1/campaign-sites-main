'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ConfirmationModal } from '@/components/shared/ConfirmationModal';

interface AdminDelegationPanelProps {
  systemAdminId: string;
  adminName: string;
}

export function AdminDelegationPanel({
  systemAdminId,
  adminName,
}: AdminDelegationPanelProps) {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <motion.div
      className="bg-white rounded-xl border border-gray-200 p-6 mt-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.4 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Admin Hierarchy Delegation
        </h3>
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {showInfo ? '−' : '+'} Manage
        </button>
      </div>

      {showInfo && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-sm text-gray-700">
          <p className="mb-3">
            <strong>Admin Delegation</strong> allows you to establish an admin hierarchy.
            You can:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-2 text-xs">
            <li>
              Make this admin subordinate to another admin (they inherit that admin's
              permissions)
            </li>
            <li>Promote other admins as subordinates to this one</li>
            <li>
              Use the full admin hierarchy view at /admin/portal/rbac/admin-hierarchy
            </li>
          </ul>
          <p className="mt-3 pt-3 border-t border-purple-200 text-xs">
            This feature is currently available via the admin hierarchy page. Direct
            delegation editing will be added here soon.
          </p>
        </div>
      )}
    </motion.div>
  );
}
