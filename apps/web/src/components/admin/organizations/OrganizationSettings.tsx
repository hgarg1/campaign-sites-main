'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Organization } from '@/hooks/useOrganizations';
import { useToast } from '../shared/ToastContext';
import { ConfirmationModal } from '../../shared/ConfirmationModal';

interface OrganizationSettingsProps {
  organization: Organization;
  onUpdate: (updates: Partial<Organization>) => Promise<void>;
}

export function OrganizationSettings({ organization, onUpdate }: OrganizationSettingsProps) {
  const { showToast } = useToast();
  const [updating, setUpdating] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showWhiteLabelModal, setShowWhiteLabelModal] = useState(false);

  const handleToggleStatus = async () => {
    const newStatus = organization.status === 'active' ? 'suspended' : 'active';
    setShowStatusModal(true);
  };

  const confirmStatusChange = async () => {
    const newStatus = organization.status === 'active' ? 'suspended' : 'active';
    try {
      setUpdating(true);
      await onUpdate({ status: newStatus });
      const successMessage = newStatus === 'active' 
        ? 'Organization activated successfully'
        : 'Organization suspended successfully';
      showToast('success', successMessage);
      setShowStatusModal(false);
    } catch (error) {
      showToast('error', `Failed to ${newStatus === 'active' ? 'activate' : 'suspend'} organization`);
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleWhiteLabel = async () => {
    setShowWhiteLabelModal(true);
  };

  const confirmWhiteLabelChange = async () => {
    const newValue = !organization.whiteLabel;
    try {
      setUpdating(true);
      await onUpdate({ whiteLabel: newValue });
      const successMessage = newValue
        ? 'White label enabled successfully'
        : 'White label disabled successfully';
      showToast('success', successMessage);
      setShowWhiteLabelModal(false);
    } catch (error) {
      showToast('error', `Failed to ${newValue ? 'enable' : 'disable'} white label`);
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

      {/* Status Confirmation Modal */}
      <ConfirmationModal
        isOpen={showStatusModal}
        title={organization.status === 'active' ? 'Suspend Organization?' : 'Activate Organization?'}
        message={
          organization.status === 'active'
            ? 'This will suspend the organization and all its resources. Users will not be able to access the organization.'
            : 'This will activate the organization and restore access to all users.'
        }
        confirmText={organization.status === 'active' ? 'Suspend' : 'Activate'}
        cancelText="Cancel"
        isDangerous={organization.status === 'active'}
        isLoading={updating}
        icon={organization.status === 'active' ? 'warning' : 'info'}
        onConfirm={confirmStatusChange}
        onCancel={() => setShowStatusModal(false)}
      />

      {/* White Label Confirmation Modal */}
      <ConfirmationModal
        isOpen={showWhiteLabelModal}
        title={organization.whiteLabel ? 'Disable White Label?' : 'Enable White Label?'}
        message={
          organization.whiteLabel
            ? 'This will disable white label features. The default CampaignSites branding will be used.'
            : 'This will enable white label features. Custom branding and domains will be available.'
        }
        confirmText={organization.whiteLabel ? 'Disable' : 'Enable'}
        cancelText="Cancel"
        isDangerous={false}
        isLoading={updating}
        icon="info"
        onConfirm={confirmWhiteLabelChange}
        onCancel={() => setShowWhiteLabelModal(false)}
      />
    </motion.div>
  );
}
