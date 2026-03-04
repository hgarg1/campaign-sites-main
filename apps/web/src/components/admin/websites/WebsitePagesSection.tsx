'use client';

import { motion } from 'framer-motion';
import { WebsitePage } from '@/hooks/useWebsites';

interface WebsitePagesProps {
  pages: WebsitePage[];
  loading: boolean;
}

export function WebsitePagesSection({ pages, loading }: WebsitePagesProps) {
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
      transition={{ duration: 0.3, delay: 0.2 }}
      className="bg-white rounded-xl border border-gray-200 p-6"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Pages ({pages.length})</h3>
      
      <div className="space-y-3">
        {pages.map((page, index) => (
          <motion.div
            key={page.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex-1">
              <p className="font-medium text-gray-900">{page.title}</p>
              <p className="text-sm text-gray-600 font-mono">{page.path}</p>
              <p className="text-xs text-gray-500 mt-1">
                Updated {new Date(page.updatedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </motion.div>
        ))}

        {pages.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No pages found
          </div>
        )}
      </div>
    </motion.div>
  );
}
