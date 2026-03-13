'use client';

import { motion } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../shared/ToastContext';

interface Template {
  key: string;
  name: string;
  isActive: boolean;
  category: string;
}

interface DashboardStats {
  totalTemplates: number;
  activeTemplates: number;
  recentlySentTests: number;
  successRate?: number;
}

interface SentTestRecord {
  id: string;
  templateKey: string;
  templateName: string;
  recipientEmail: string;
  sentAt: string;
  status: 'success' | 'failed';
}

/**
 * Email template management dashboard
 * Shows overview statistics and recently sent test emails
 */
export function TemplateDashboard() {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [recentTests, setRecentTests] = useState<SentTestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalTemplates: 0,
    activeTemplates: 0,
    recentlySentTests: 0,
  });

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [templatesRes, statsRes] = await Promise.all([
        fetch('/api/admin/email/templates'),
        fetch('/api/admin/email/stats'),
      ]);

      if (!templatesRes.ok || !statsRes.ok) {
        throw new Error('Failed to load dashboard data');
      }

      const templatesData = await templatesRes.json();
      const statsData = await statsRes.json();

      const templatesList = Array.isArray(templatesData) ? templatesData : templatesData.templates || [];
      setTemplates(templatesList);

      // Calculate stats
      const activeCount = templatesList.filter((t: Template) => t.isActive).length;
      const calculatedStats: DashboardStats = {
        totalTemplates: templatesList.length || statsData.totalTemplates || 0,
        activeTemplates: activeCount,
        recentlySentTests: statsData.recentlySentTests || 0,
        successRate: statsData.successRate || 0,
      };

      setStats(calculatedStats);

      // Load recent test records
      if (statsData.recentTests && Array.isArray(statsData.recentTests)) {
        setRecentTests(statsData.recentTests.slice(0, 10));
      }
    } catch (err) {
      console.error('Load dashboard error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleRefresh = async () => {
    await loadDashboardData();
    showToast('success', 'Refreshed', 'Dashboard data updated');
  };

  const handleToggleTemplate = async (templateKey: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/email/templates/${templateKey}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update template: ${response.status}`);
      }

      setTemplates((prev) =>
        prev.map((t) => (t.key === templateKey ? { ...t, isActive: !isActive } : t)),
      );

      setStats((prev) => ({
        ...prev,
        activeTemplates: isActive ? prev.activeTemplates - 1 : prev.activeTemplates + 1,
      }));

      showToast('success', 'Updated', 'Template status changed');
    } catch (err) {
      console.error('Toggle template error:', err);
      showToast('error', 'Failed', 'Could not update template');
    }
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse bg-gray-200 h-24 rounded-lg" />
          ))}
        </div>
        <div className="animate-pulse bg-gray-200 h-96 rounded-lg" />
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-red-50 border border-red-200 rounded-lg p-6"
      >
        <h3 className="text-red-900 font-semibold mb-2">Error</h3>
        <p className="text-red-700 text-sm">{error}</p>
        <button
          onClick={handleRefresh}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Email Template Dashboard</h1>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Templates */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 p-6"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-blue-700 font-medium">Total Templates</p>
              <p className="text-3xl font-bold text-blue-900 mt-2">{stats.totalTemplates}</p>
            </div>
            <span className="text-4xl">📧</span>
          </div>
          <p className="text-xs text-blue-700 mt-3">Email templates in system</p>
        </motion.div>

        {/* Active Templates */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200 p-6"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-green-700 font-medium">Active Templates</p>
              <p className="text-3xl font-bold text-green-900 mt-2">{stats.activeTemplates}</p>
            </div>
            <span className="text-4xl">✓</span>
          </div>
          <p className="text-xs text-green-700 mt-3">Currently enabled</p>
        </motion.div>

        {/* Recently Sent Tests */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200 p-6"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-purple-700 font-medium">Recent Tests</p>
              <p className="text-3xl font-bold text-purple-900 mt-2">{stats.recentlySentTests}</p>
            </div>
            <span className="text-4xl">✉️</span>
          </div>
          <p className="text-xs text-purple-700 mt-3">Test emails sent</p>
        </motion.div>

        {/* Success Rate */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200 p-6"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-orange-700 font-medium">Success Rate</p>
              <p className="text-3xl font-bold text-orange-900 mt-2">
                {stats.successRate ? `${stats.successRate}%` : '—'}
              </p>
            </div>
            <span className="text-4xl">📊</span>
          </div>
          <p className="text-xs text-orange-700 mt-3">Test email success</p>
        </motion.div>
      </div>

      {/* Templates Status Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-xl border border-gray-200 overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Template Status</h2>
          <p className="text-sm text-gray-600 mt-1">Manage and monitor all email templates</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-gray-700">Template</th>
                <th className="px-6 py-3 text-left font-medium text-gray-700">Category</th>
                <th className="px-6 py-3 text-left font-medium text-gray-700">Status</th>
                <th className="px-6 py-3 text-right font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-600">
                    No templates available
                  </td>
                </tr>
              ) : (
                templates.slice(0, 10).map((template) => (
                  <tr key={template.key} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{template.name}</p>
                        <p className="text-xs text-gray-600">{template.key}</p>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                        {template.category}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          template.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {template.isActive ? '✓ Active' : '○ Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => handleToggleTemplate(template.key, template.isActive)}
                        className="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 underline"
                      >
                        Toggle
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {templates.length > 10 && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-600">
            Showing 10 of {templates.length} templates
          </div>
        )}
      </motion.div>

      {/* Recently Sent Tests Table */}
      {recentTests.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-xl border border-gray-200 overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recently Sent Test Emails</h2>
            <p className="text-sm text-gray-600 mt-1">Latest test email deliveries</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">Template</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">Recipient</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">Status</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">Sent At</th>
                </tr>
              </thead>
              <tbody>
                {recentTests.map((test) => (
                  <tr key={test.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{test.templateName}</p>
                        <p className="text-xs text-gray-600">{test.templateKey}</p>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-gray-900">{test.recipientEmail}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          test.status === 'success'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {test.status === 'success' ? '✓ Sent' : '✗ Failed'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-600">
                      {new Date(test.sentAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Empty State for Recent Tests */}
      {recentTests.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center"
        >
          <p className="text-gray-600 text-sm">No test emails sent yet</p>
          <p className="text-gray-500 text-xs mt-1">
            Test emails will appear here once you start sending them
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
