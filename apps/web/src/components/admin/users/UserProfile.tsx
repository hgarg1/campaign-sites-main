'use client';

import { motion } from 'framer-motion';

interface UserProfileProps {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: 'USER' | 'ADMIN' | 'GLOBAL_ADMIN';
    status: 'active' | 'suspended' | 'deleted';
    organizationCount: number;
    websiteCount: number;
    createdAt: string;
    lastLogin?: string;
    suspendedAt?: string;
    suspendedReason?: string;
  };
}

const statusColors = {
  active: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
  suspended: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
  deleted: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' },
};

export function UserProfile({ user }: UserProfileProps) {
  const colors = statusColors[user.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-xl border border-gray-200 p-6 mb-6"
    >
      <div className="flex items-start justify-between mb-6">
        <div className="flex gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
            {(user.name || user.email).charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{user.name || user.email}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text} border ${colors.border}`}>
                {user.status.toUpperCase()}
              </span>
            </div>
            <p className="text-gray-600">{user.email}</p>
            <p className="text-sm text-gray-500 mt-1">ID: {user.id}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 rounded-lg p-4">
        <div>
          <p className="text-xs text-gray-600 uppercase font-semibold">Role</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{user.role}</p>
        </div>
        <div>
          <p className="text-xs text-gray-600 uppercase font-semibold">Organizations</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{user.organizationCount}</p>
        </div>
        <div>
          <p className="text-xs text-gray-600 uppercase font-semibold">Websites</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{user.websiteCount}</p>
        </div>
        <div>
          <p className="text-xs text-gray-600 uppercase font-semibold">Created</p>
          <p className="text-lg font-bold text-gray-900 mt-1">
            {new Date(user.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {user.lastLogin && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-gray-700">
            <span className="font-medium">Last Login:</span>{' '}
            {new Date(user.lastLogin).toLocaleString()}
          </p>
        </div>
      )}

      {user.status === 'suspended' && user.suspendedAt && (
        <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-sm text-gray-700">
            <span className="font-medium">Suspended:</span>{' '}
            {new Date(user.suspendedAt).toLocaleString()}
          </p>
          {user.suspendedReason && (
            <p className="text-sm text-gray-700 mt-2">
              <span className="font-medium">Reason:</span> {user.suspendedReason}
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}
