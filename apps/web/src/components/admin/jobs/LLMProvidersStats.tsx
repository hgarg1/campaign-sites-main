'use client';

import { motion } from 'framer-motion';
import { ProviderStats } from '@/hooks/useBuildJobs';

interface LLMProvidersStatsProps {
  providers: ProviderStats[];
  loading: boolean;
}

export function LLMProvidersStats({ providers, loading }: LLMProvidersStatsProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">LLM Providers</h3>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  const formatCost = (cost: number) => `$${cost.toFixed(2)}`;
  const formatNumber = (num: number) => num.toLocaleString();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="bg-white rounded-xl border border-gray-200 p-6"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-4">LLM Providers</h3>
      
      <div className="space-y-4">
        {providers.map((provider, index) => (
          <motion.div
            key={provider.provider}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: index * 0.1 }}
            className="bg-gray-50 rounded-lg p-4"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-semibold text-gray-900 capitalize">{provider.provider}</h4>
                <p className="text-sm text-gray-600">{provider.model}</p>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                provider.status === 'active' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {provider.status === 'active' ? '✓ Active' : '✗ Error'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <p className="text-xs text-gray-600 mb-1">Total Calls</p>
                <p className="text-lg font-bold text-blue-900">{formatNumber(provider.totalCalls)}</p>
              </div>

              <div>
                <p className="text-xs text-gray-600 mb-1">Total Tokens</p>
                <p className="text-lg font-bold text-purple-900">{formatNumber(provider.totalTokens)}</p>
              </div>

              <div>
                <p className="text-xs text-gray-600 mb-1">Total Cost</p>
                <p className="text-lg font-bold text-green-900">{formatCost(provider.totalCost)}</p>
              </div>

              <div>
                <p className="text-xs text-gray-600 mb-1">Avg. Latency</p>
                <p className="text-lg font-bold text-orange-900">{provider.averageLatency}ms</p>
              </div>
            </div>

            {provider.lastError && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                <p className="text-xs font-medium text-red-800">Last Error:</p>
                <p className="text-xs text-red-700 mt-1">{provider.lastError}</p>
              </div>
            )}
          </motion.div>
        ))}

        {providers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No provider data available
          </div>
        )}
      </div>
    </motion.div>
  );
}
