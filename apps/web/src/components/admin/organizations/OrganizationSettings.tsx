'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Organization } from '@/hooks/useOrganizations';
import { useToast } from '../shared/ToastContext';

interface OrganizationSettingsProps {
  organization: Organization;
  onUpdate: (updates: Partial<Organization>) => Promise<void>;
}

export function OrganizationSettings({ organization, onUpdate }: OrganizationSettingsProps) {
  const { showToast } = useToast();
  const [updating, setUpdating] = useState(false);

  const handleToggleStatus = async () => {
    const newStatus = organization.status === 'active' ? 'suspended' : 'active';
    const action = newStatus === 'suspended' ? 'suspend' : 'activate';
    
    if (!confirm(`Are you sure you want to ${action} this organization?`)) {
      return;
    }

    try {
      setUpdating(true);
      await onUpdate({ status: newStatus });
      showToast('success', `Organization ${action}d successfully`);
    } catch (error) {
      showToast('error', `Failed to ${action} organization`);
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleWhiteLabel = async () => {
    const newValue = !organization.whiteLabel;
    const action = newValue ? 'enable' : 'disable';
    
    if (!confirm(`Are you sure you want to ${action} white label for this organization?`)) {
      return;
    }

    try {
      setUpdating(true);
      await onUpdate({ whiteLabel: newValue });
      showToast('success', `White label ${action}d successfully`);
    } catch (error) {
      showToast('error', `Failed to ${action} white label`);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.4 }}
      className="bg-white rounded-xl border border-gray-200 p-6"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Settings</h3>
      
      <div className="space-y-4">
        {/* Status Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium text-gray-900">Organization Status</p>
            <p className="text-sm text-gray-600">
              {organization.status === 'active' 
                ? 'Organization is active and operational' 
                : 'Organization is currently suspended'}
            </p>
          </div>
          <button
            onClick={handleToggleStatus}
            disabled={updating}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              organization.status === 'active'
                ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                : 'bg-green-100 text-green-800 hover:bg-green-200'
            } ${updating ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {organization.status === 'active' ? 'Suspend' : 'Activate'}
          </button>
        </div>

        {/* White Label Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium text-gray-900">White Label</p>
            <p className="text-sm text-gray-600">
              {organization.whiteLabel 
                ? 'Custom branding and domain enabled' 
                : 'Standard CampaignSites branding'}
            </p>
          </div>
          <button
            onClick={handleToggleWhiteLabel}
            disabled={updating}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              organization.whiteLabel
                ? 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            } ${updating ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {organization.whiteLabel ? 'Disable' : 'Enable'}
          </button>
        </div>

        {/* Custom Domain Info */}
        {organization.customDomain && (
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <p className="font-medium text-purple-900 mb-1">Custom Domain</p>
            <p className="text-sm text-purple-700 font-mono">{organization.customDomain}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
