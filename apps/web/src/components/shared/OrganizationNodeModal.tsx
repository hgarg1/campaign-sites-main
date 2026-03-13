'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { HierarchyOrgNode } from './HierarchyGraph';

interface OrganizationNodeModalProps {
  isOpen: boolean;
  org: HierarchyOrgNode | null;
  onClose: () => void;
}

export function OrganizationNodeModal({ isOpen, org, onClose }: OrganizationNodeModalProps) {
  if (!org) return null;

  const statusColors = {
    ACTIVE: { bg: 'bg-green-100', text: 'text-green-800', label: 'Active' },
    SUSPENDED: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Suspended' },
    DEACTIVATED: { bg: 'bg-red-100', text: 'text-red-800', label: 'Deactivated' },
  };

  const status = statusColors[org.ownStatus];
  const createdDate = org.setupCompletedAt
    ? new Date(org.setupCompletedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Not set';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal - centered with proper mobile padding */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-lg w-full">
              {/* Header */}
              <div className="px-6 pt-6 pb-4 bg-gradient-to-r from-blue-50 to-blue-50 border-b border-gray-200">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900">{org.name}</h2>
                    <p className="text-sm text-gray-600 mt-1 font-mono">{org.slug}</p>
                  </div>
                  <motion.div
                    initial={{ scale: 0, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${status.bg} ${status.text}`}
                  >
                    {status.label}
                  </motion.div>
                </div>
              </div>

              {/* Content */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="px-6 py-6 space-y-6"
              >
                {/* Organization ID */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Organization ID</p>
                  <p className="text-sm text-gray-800 font-mono bg-gray-50 p-3 rounded-lg break-all">{org.id}</p>
                </div>

                {/* Status and Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Members */}
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <p className="text-2xl font-bold text-blue-600">{org.memberCount ?? 0}</p>
                    <p className="text-xs text-blue-600 mt-1">Members</p>
                  </div>

                  {/* Websites */}
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <p className="text-2xl font-bold text-purple-600">{org.websiteCount ?? 0}</p>
                    <p className="text-xs text-purple-600 mt-1">Websites</p>
                  </div>
                </div>

                {/* Timeline */}
                <div className="space-y-3 border-l-2 border-gray-200 pl-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Setup Completed</p>
                    <p className="text-sm text-gray-700 mt-1">{createdDate}</p>
                  </div>

                  {org.partyAffiliation && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Party Affiliation</p>
                      <p className="text-sm text-gray-700 mt-1 font-medium">{org.partyAffiliation}</p>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Footer */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end"
              >
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-lg font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
