'use client';

import { motion } from 'framer-motion';
import { useState, useCallback } from 'react';
import { useToast } from '../shared/ToastContext';
import { VariableForm } from './VariableForm';
import { TemplatePreview } from './TemplatePreview';

interface TestEmailRecord {
  id: string;
  recipientEmail: string;
  templateKey: string;
  sentAt: string;
  status: 'success' | 'failed';
}

interface TemplateTestEmailProps {
  templateKey: string;
  requiredVars?: string[];
  optionalVars?: string[];
  onSuccess?: () => void;
}

/**
 * Test email sender component
 * Combines variable form, preview, and sending functionality
 */
export function TemplateTestEmail({
  templateKey,
  requiredVars = [],
  optionalVars = [],
  onSuccess,
}: TemplateTestEmailProps) {
  const { showToast } = useToast();
  const [recipientEmail, setRecipientEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formVariables, setFormVariables] = useState<Record<string, any>>({});
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [sentEmails, setSentEmails] = useState<TestEmailRecord[]>([]);

  const validateEmail = (email: string): boolean => {
    if (!email.trim()) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = useCallback((value: string) => {
    setRecipientEmail(value);
    if (value && !validateEmail(value)) {
      setEmailError('Invalid email address');
    } else {
      setEmailError(null);
    }
  }, []);

  const handleVariablesSubmit = useCallback(
    (variables: Record<string, any>) => {
      setFormVariables(variables);
      setShowPreview(true);
    },
    [],
  );

  const handleSendTest = async () => {
    if (!recipientEmail || !validateEmail(recipientEmail)) {
      setEmailError('Please enter a valid email address');
      showToast('error', 'Validation Error', 'Invalid email address');
      return;
    }

    try {
      setSending(true);

      const response = await fetch(`/api/admin/email/templates/${templateKey}/send-test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientEmail,
          variables: formVariables,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to send test email: ${response.status}`);
      }

      // Record sent email
      const sentEmail: TestEmailRecord = {
        id: Math.random().toString(36).substr(2, 9),
        recipientEmail,
        templateKey,
        sentAt: new Date().toISOString(),
        status: 'success',
      };
      setSentEmails((prev) => [sentEmail, ...prev]);

      showToast('success', 'Test Email Sent', `Email sent to ${recipientEmail}`);
      setRecipientEmail('');
      setFormVariables({});
      setShowPreview(false);
      onSuccess?.();
    } catch (error) {
      console.error('Send test email error:', error);
      showToast(
        'error',
        'Failed to Send',
        error instanceof Error ? error.message : 'Could not send test email',
      );

      // Record failed email
      const failedEmail: TestEmailRecord = {
        id: Math.random().toString(36).substr(2, 9),
        recipientEmail,
        templateKey,
        sentAt: new Date().toISOString(),
        status: 'failed',
      };
      setSentEmails((prev) => [failedEmail, ...prev]);
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Email Input Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recipient Email</h3>

        <div>
          <label htmlFor="recipient-email" className="block text-sm font-medium text-gray-700 mb-2">
            Email Address <span className="text-red-600">*</span>
          </label>
          <input
            id="recipient-email"
            type="email"
            value={recipientEmail}
            onChange={(e) => handleEmailChange(e.target.value)}
            disabled={sending}
            placeholder="test@example.com"
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
              emailError ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
          />
          {emailError && <p className="text-red-600 text-sm mt-1">{emailError}</p>}
        </div>
      </div>

      {/* Template Variables Section */}
      {(requiredVars.length > 0 || optionalVars.length > 0) && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Template Variables</h3>
          <VariableForm
            templateKey={templateKey}
            requiredVars={requiredVars}
            optionalVars={optionalVars}
            onSubmit={handleVariablesSubmit}
            submitButtonLabel="Preview & Continue"
            loading={sending}
          />
        </div>
      )}

      {/* Preview Section */}
      {showPreview && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Preview</h3>
          <TemplatePreview templateKey={templateKey} variables={formVariables} />

          {/* Send Button */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={handleSendTest}
              disabled={sending || !validateEmail(recipientEmail)}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
            >
              {sending && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {sending ? 'Sending...' : '✉️ Send Test Email'}
            </button>
            <button
              onClick={() => setShowPreview(false)}
              disabled={sending}
              className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors font-medium"
            >
              Edit
            </button>
          </div>
        </div>
      )}

      {/* Recently Sent Tests */}
      {sentEmails.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recently Sent Tests</h3>
            <p className="text-xs text-gray-600 mt-1">{sentEmails.length} test email(s)</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">Email</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">Status</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">Sent At</th>
                </tr>
              </thead>
              <tbody>
                {sentEmails.slice(0, 10).map((email) => (
                  <tr key={email.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-3 text-gray-900">{email.recipientEmail}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          email.status === 'success'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {email.status === 'success' ? '✓ Sent' : '✗ Failed'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-600">
                      {new Date(email.sentAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
}
