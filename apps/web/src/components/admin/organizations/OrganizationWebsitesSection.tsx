'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { OrganizationWebsite } from '@/hooks/useOrganizations';

interface OrganizationWebsitesProps {
  websites: OrganizationWebsite[];
  loading: boolean;
}

const statusColors = {
  DRAFT: { bg: 'bg-gray-100', text: 'text-gray-800' },
  BUILDING: { bg: 'bg-blue-100', text: 'text-blue-800' },
  AUDITING: { bg: 'bg-purple-100', text: 'text-purple-800' },
  DEPLOYING: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  PUBLISHED: { bg: 'bg-green-100', text: 'text-green-800' },
  FAILED: { bg: 'bg-red-100', text: 'text-red-800' },
};

export function OrganizationWebsitesSection({ websites, loading }: OrganizationWebsitesProps) {
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
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Websites ({websites.length})</h3>
      
      <div className="space-y-3">
        {websites.map((website, index) => (
          <motion.div
            key={website.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex-1">
              <p className="font-medium text-gray-900">{website.name}</p>
              <p className="text-sm text-gray-600 font-mono">{website.slug}</p>
              <p className="text-xs text-gray-500 mt-1">
                Created {new Date(website.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                statusColors[website.status].bg
              } ${statusColors[website.status].text}`}>
                {website.status}
              </span>

              <Link
                href={`/admin/portal/websites/${website.id}`}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                View →
              </Link>
            </div>
          </motion.div>
        ))}

        {websites.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No websites found
          </div>
        )}
      </div>
    </motion.div>
  );
}
