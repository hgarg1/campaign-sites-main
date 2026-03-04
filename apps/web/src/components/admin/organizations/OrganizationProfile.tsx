'use client';

import { motion } from 'framer-motion';
import { Organization } from '@/hooks/useOrganizations';

interface OrganizationProfileProps {
  organization: Organization;
}

export function OrganizationProfile({ organization }: OrganizationProfileProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-xl border border-gray-200 p-6"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Organization Profile</h3>
      
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-600">Name</label>
          <p className="text-gray-900 font-medium mt-1">{organization.name}</p>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-600">Slug</label>
          <p className="text-gray-900 font-mono text-sm mt-1">{organization.slug}</p>
        </div>

        {organization.customDomain && (
          <div>
            <label className="text-sm font-medium text-gray-600">Custom Domain</label>
            <p className="text-gray-900 mt-1">{organization.customDomain}</p>
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-gray-600">White Label</label>
          <div className="mt-1">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              organization.whiteLabel ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {organization.whiteLabel ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-600">Status</label>
          <div className="mt-1">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              organization.status === 'active' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {organization.status.charAt(0).toUpperCase() + organization.status.slice(1)}
            </span>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-600">Created</label>
          <p className="text-gray-900 text-sm mt-1">
            {new Date(organization.createdAt).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>

        {organization.owner && (
          <div>
            <label className="text-sm font-medium text-gray-600">Owner</label>
            <div className="mt-1">
              <p className="text-gray-900 font-medium">{organization.owner.name || 'Unnamed'}</p>
              <p className="text-gray-600 text-sm">{organization.owner.email}</p>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-gray-200 grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-600">Members</label>
            <p className="text-2xl font-bold text-blue-600 mt-1">{organization.memberCount}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Websites</label>
            <p className="text-2xl font-bold text-purple-600 mt-1">{organization.websiteCount}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
