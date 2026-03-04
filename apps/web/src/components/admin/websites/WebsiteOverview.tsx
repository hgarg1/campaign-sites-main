'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Website } from '@/hooks/useWebsites';

interface WebsiteOverviewProps {
  website: Website;
  onTriggerRebuild: () => void;
  onDelete: () => void;
  rebuilding: boolean;
}

const statusColors = {
  DRAFT: { bg: 'bg-gray-100', text: 'text-gray-800' },
  BUILDING: { bg: 'bg-blue-100', text: 'text-blue-800' },
  AUDITING: { bg: 'bg-purple-100', text: 'text-purple-800' },
  DEPLOYING: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  PUBLISHED: { bg: 'bg-green-100', text: 'text-green-800' },
  FAILED: { bg: 'bg-red-100', text: 'text-red-800' },
};

export function WebsiteOverview({ website, onTriggerRebuild, onDelete, rebuilding }: WebsiteOverviewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-xl border border-gray-200 p-6"
    >
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">{website.name}</h3>
          <p className="text-gray-600 font-mono text-sm mt-1">{website.slug}</p>
          {website.domain && (
            <a
              href={`https://${website.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 text-sm mt-1 inline-block"
            >
              {website.domain} ↗
            </a>
          )}
        </div>

        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
          statusColors[website.status].bg
        } ${statusColors[website.status].text}`}>
          {website.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <label className="text-sm font-medium text-gray-600">Organization</label>
          <Link
            href={`/admin/portal/organizations/${website.organization.id}`}
            className="text-gray-900 font-medium hover:text-blue-600 block mt-1"
          >
            {website.organization.name}
          </Link>
          <p className="text-gray-500 text-sm">{website.organization.slug}</p>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-600">Owner</label>
          <p className="text-gray-900 font-medium mt-1">{website.owner.name || 'Unnamed'}</p>
          <p className="text-gray-500 text-sm">{website.owner.email}</p>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-600">Created</label>
          <p className="text-gray-900 text-sm mt-1">
            {new Date(website.createdAt).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-600">Last Updated</label>
          <p className="text-gray-900 text-sm mt-1">
            {new Date(website.updatedAt).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>

        {website.publishedAt && (
          <div className="col-span-2">
            <label className="text-sm font-medium text-gray-600">Published</label>
            <p className="text-gray-900 text-sm mt-1">
              {new Date(website.publishedAt).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-6 border-t border-gray-200">
        <button
          onClick={onTriggerRebuild}
          disabled={rebuilding}
          className={`px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors ${
            rebuilding ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {rebuilding ? 'Rebuilding...' : 'Trigger Rebuild'}
        </button>

        <button
          onClick={onDelete}
          className="px-6 py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors"
        >
          Delete Website
        </button>
      </div>
    </motion.div>
  );
}
