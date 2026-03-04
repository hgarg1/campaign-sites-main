'use client';

import { motion } from 'framer-motion';
import { OrganizationUsage } from '@/hooks/useOrganizations';

interface OrganizationUsageProps {
  usage: OrganizationUsage | null;
  loading: boolean;
}

export function OrganizationUsageCard({ usage, loading }: OrganizationUsageProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!usage) {
    return null;
  }

  const formatCost = (cost: number) => `$${cost.toFixed(2)}`;
  const formatStorage = (mb: number) => `${mb.toFixed(1)} MB`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.3 }}
      className="bg-white rounded-xl border border-gray-200 p-6"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage & Billing</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-600 font-medium mb-1">Monthly Builds</p>
          <p className="text-2xl font-bold text-blue-900">{usage.monthlyBuilds}</p>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <p className="text-sm text-purple-600 font-medium mb-1">API Calls</p>
          <p className="text-2xl font-bold text-purple-900">{usage.apiCalls.toLocaleString()}</p>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm text-green-600 font-medium mb-1">Storage Used</p>
          <p className="text-2xl font-bold text-green-900">{formatStorage(usage.storageUsed)}</p>
        </div>

        <div className="bg-orange-50 p-4 rounded-lg">
          <p className="text-sm text-orange-600 font-medium mb-1">LLM Costs</p>
          <p className="text-2xl font-bold text-orange-900">{formatCost(usage.llmCosts)}</p>
        </div>
      </div>
    </motion.div>
  );
}
