'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { OrganizationMember } from '@/hooks/useOrganizations';
import { useToast } from '../shared/ToastContext';

interface OrganizationMembersProps {
  members: OrganizationMember[];
  loading: boolean;
  onUpdateRole: (memberId: string, role: 'OWNER' | 'ADMIN' | 'MEMBER') => Promise<void>;
  onRemoveMember: (memberId: string) => Promise<void>;
}

const roleColors = {
  OWNER: { bg: 'bg-red-100', text: 'text-red-800' },
  ADMIN: { bg: 'bg-purple-100', text: 'text-purple-800' },
  MEMBER: { bg: 'bg-blue-100', text: 'text-blue-800' },
};

export function OrganizationMembers({ members, loading, onUpdateRole, onRemoveMember }: OrganizationMembersProps) {
  const { showToast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleRoleChange = async (memberId: string, newRole: 'OWNER' | 'ADMIN' | 'MEMBER') => {
    try {
      setProcessingId(memberId);
      await onUpdateRole(memberId, newRole);
      showToast('success', 'Member role updated successfully');
    } catch (error) {
      showToast('error', 'Failed to update member role');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRemove = async (memberId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from this organization?`)) {
      return;
    }

    try {
      setProcessingId(memberId);
      await onRemoveMember(memberId);
      showToast('success', 'Member removed successfully');
    } catch (error) {
      showToast('error', 'Failed to remove member');
    } finally {
      setProcessingId(null);
    }
  };

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
      transition={{ duration: 0.3, delay: 0.1 }}
      className="bg-white rounded-xl border border-gray-200 p-6"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Members ({members.length})</h3>
      
      <div className="space-y-3">
        {members.map((member, index) => (
          <motion.div
            key={member.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex-1">
              <p className="font-medium text-gray-900">{member.user.name || 'Unnamed'}</p>
              <p className="text-sm text-gray-600">{member.user.email}</p>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={member.role}
                onChange={(e) => handleRoleChange(member.id, e.target.value as 'OWNER' | 'ADMIN' | 'MEMBER')}
                disabled={processingId === member.id}
                className={`px-3 py-1.5 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  processingId === member.id ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
                <option value="OWNER">Owner</option>
              </select>

              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                roleColors[member.role].bg
              } ${roleColors[member.role].text}`}>
                {member.role}
              </span>

              <button
                onClick={() => handleRemove(member.id, member.user.name || member.user.email)}
                disabled={processingId === member.id}
                className={`text-red-600 hover:text-red-700 text-sm font-medium ${
                  processingId === member.id ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                Remove
              </button>
            </div>
          </motion.div>
        ))}

        {members.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No members found
          </div>
        )}
      </div>
    </motion.div>
  );
}
