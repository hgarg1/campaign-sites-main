'use client';

import { motion } from 'framer-motion';

interface PermissionAlertProps {
  claim: string;
  title?: string;
  message?: string;
  showIcon?: boolean;
}

export function PermissionAlert({ 
  claim, 
  title = 'Access Denied',
  message = 'You do not have permission to access this page or perform this action.',
  showIcon = true 
}: PermissionAlertProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-lg border border-red-200 bg-red-50 p-4"
    >
      <div className="flex gap-3">
        {showIcon && (
          <div className="flex-shrink-0">
            <span className="text-2xl">🔒</span>
          </div>
        )}
        <div className="flex-1">
          <h3 className="font-semibold text-red-900">{title}</h3>
          <p className="text-sm text-red-800 mt-1">{message}</p>
          <p className="text-xs text-red-700 mt-2 font-mono bg-red-100 px-2 py-1 rounded w-fit">
            Required: {claim}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

interface PermissionErrorPageProps {
  pageTitle?: string;
  requiredClaim?: string;
}

export function PermissionErrorPage({ 
  pageTitle = 'Page',
  requiredClaim = 'system_admin_portal:resource:action'
}: PermissionErrorPageProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex items-center justify-center min-h-[400px]"
    >
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">🔐</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-4">
          You don't have permission to view the {pageTitle} page.
        </p>
        <div className="bg-gray-100 rounded-lg p-4 text-left mb-4">
          <p className="text-xs text-gray-500 mb-1">Required permission:</p>
          <p className="text-sm font-mono text-red-600 break-all">{requiredClaim}</p>
        </div>
        <p className="text-sm text-gray-500">
          If you believe you should have access to this resource, please contact an administrator.
        </p>
      </div>
    </motion.div>
  );
}
