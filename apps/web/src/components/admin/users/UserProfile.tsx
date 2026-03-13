'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

interface UserProfileProps {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: 'USER' | 'ADMIN' | 'GLOBAL_ADMIN';
    status: 'active' | 'suspended' | 'deleted';
    organizationCount: number;
    websiteCount: number;
    createdAt: string;
    lastLogin?: string;
    suspendedAt?: string;
    suspendedReason?: string;
  };
  onEmailChange?: (newEmail: string, confirmationSent: boolean) => void;
}

const statusColors = {
  active: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
  suspended: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
  deleted: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' },
};

export function UserProfile({ user, onEmailChange }: UserProfileProps) {
  const colors = statusColors[user.status];
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState(user.email);
  const [emailError, setEmailError] = useState('');
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleEmailEdit = () => {
    setEditingEmail(true);
    setNewEmail(user.email);
    setEmailError('');
    setEmailConfirmed(false);
    setEmailSent(false);
  };

  const handleEmailCancel = () => {
    setEditingEmail(false);
    setNewEmail(user.email);
    setEmailError('');
    setEmailConfirmed(false);
    setEmailSent(false);
  };

  const handleEmailChange = async () => {
    if (!newEmail.trim()) {
      setEmailError('Email cannot be empty');
      return;
    }

    if (newEmail === user.email) {
      setEmailError('New email must be different from current email');
      return;
    }

    if (!validateEmail(newEmail)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    if (!emailConfirmed) {
      setEmailError('Please confirm the new email by checking the checkbox');
      return;
    }

    setEmailLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${user.id}/change-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newEmail: newEmail.trim(),
          justification: 'Email updated via admin portal',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update email');
      }

      // Success - show email sent message
      setEmailSent(true);
      
      // Call parent callback
      if (onEmailChange) {
        onEmailChange(newEmail, true);
      }

      // Reset after success
      setTimeout(() => {
        setEditingEmail(false);
        setEmailConfirmed(false);
        setEmailSent(false);
      }, 2000);
    } catch (error) {
      setEmailError(error instanceof Error ? error.message : 'Failed to update email. Please try again.');
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-xl border border-gray-200 p-6 mb-6"
    >
      <div className="flex items-start justify-between mb-6">
        <div className="flex gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
            {(user.name || user.email).charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{user.name || user.email}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text} border ${colors.border}`}>
                {user.status.toUpperCase()}
              </span>
            </div>
            
            {/* Email Section with Inline Edit */}
            <div className="mt-3">
              {editingEmail ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => {
                        setNewEmail(e.target.value);
                        setEmailError('');
                      }}
                      placeholder="Enter new email"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm flex-1"
                      disabled={emailLoading}
                    />
                    <button
                      onClick={handleEmailCancel}
                      disabled={emailLoading}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                      title="Cancel"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>

                  {/* Email Confirmation Checkbox */}
                  <div className="flex items-start gap-3 bg-blue-50 p-3 rounded-lg">
                    <input
                      type="checkbox"
                      checked={emailConfirmed}
                      onChange={(e) => setEmailConfirmed(e.target.checked)}
                      disabled={emailLoading}
                      className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                    />
                    <div className="flex-1">
                      <label className="text-sm text-gray-700 font-medium">
                        I confirm this is my new email address
                      </label>
                      <p className="text-xs text-gray-600 mt-1">
                        A verification link will be sent to <span className="font-semibold">{newEmail}</span>
                      </p>
                    </div>
                  </div>

                  {/* Error Message */}
                  {emailError && (
                    <div className="flex items-start gap-2 bg-red-50 p-3 rounded-lg border border-red-200">
                      <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <p className="text-sm text-red-800">{emailError}</p>
                    </div>
                  )}

                  {/* Success Message */}
                  {emailSent && (
                    <div className="flex items-start gap-2 bg-green-50 p-3 rounded-lg border border-green-200">
                      <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <p className="text-sm text-green-800">Verification email sent to <span className="font-semibold">{newEmail}</span></p>
                    </div>
                  )}

                  {/* Save Button */}
                  <button
                    onClick={handleEmailChange}
                    disabled={!emailConfirmed || emailLoading || !validateEmail(newEmail)}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition text-sm"
                  >
                    {emailLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Sending...
                      </span>
                    ) : (
                      'Save & Send Verification'
                    )}
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleEmailEdit}
                  className="flex items-center gap-2 text-gray-600 hover:text-blue-600 text-sm group"
                >
                  <span className="text-gray-600 group-hover:text-blue-600">{user.email}</span>
                  <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                </button>
              )}
            </div>

            <p className="text-sm text-gray-500 mt-1">ID: {user.id}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 rounded-lg p-4">
        <div>
          <p className="text-xs text-gray-600 uppercase font-semibold">Role</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{user.role}</p>
        </div>
        <div>
          <p className="text-xs text-gray-600 uppercase font-semibold">Organizations</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{user.organizationCount}</p>
        </div>
        <div>
          <p className="text-xs text-gray-600 uppercase font-semibold">Websites</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{user.websiteCount}</p>
        </div>
        <div>
          <p className="text-xs text-gray-600 uppercase font-semibold">Created</p>
          <p className="text-lg font-bold text-gray-900 mt-1">
            {new Date(user.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {user.lastLogin && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-gray-700">
            <span className="font-medium">Last Login:</span>{' '}
            {new Date(user.lastLogin).toLocaleString()}
          </p>
        </div>
      )}

      {user.status === 'suspended' && user.suspendedAt && (
        <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-sm text-gray-700">
            <span className="font-medium">Suspended:</span>{' '}
            {new Date(user.suspendedAt).toLocaleString()}
          </p>
          {user.suspendedReason && (
            <p className="text-sm text-gray-700 mt-2">
              <span className="font-medium">Reason:</span> {user.suspendedReason}
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}
