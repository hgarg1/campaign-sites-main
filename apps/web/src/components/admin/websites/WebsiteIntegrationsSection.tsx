'use client';

import { motion } from 'framer-motion';
import { WebsiteIntegration } from '@/hooks/useWebsites';

interface WebsiteIntegrationsProps {
  integrations: WebsiteIntegration[];
  loading: boolean;
}

const typeColors = {
  FUNDRAISING: { bg: 'bg-green-100', text: 'text-green-800' },
  CRM: { bg: 'bg-blue-100', text: 'text-blue-800' },
  EMAIL: { bg: 'bg-purple-100', text: 'text-purple-800' },
  ANALYTICS: { bg: 'bg-orange-100', text: 'text-orange-800' },
};

export function WebsiteIntegrationsSection({ integrations, loading }: WebsiteIntegrationsProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.3 }}
      className="bg-white rounded-xl border border-gray-200 p-6"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Integrations ({integrations.length})</h3>
      
      <div className="space-y-3">
        {integrations.map((integration, index) => (
          <motion.div
            key={integration.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium text-gray-900 capitalize">{integration.provider}</p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  typeColors[integration.type].bg
                } ${typeColors[integration.type].text}`}>
                  {integration.type}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Added {new Date(integration.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>

            <div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                integration.isActive 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {integration.isActive ? '✓ Active' : 'Inactive'}
              </span>
            </div>
          </motion.div>
        ))}

        {integrations.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No integrations configured
          </div>
        )}
      </div>
    </motion.div>
  );
}
