'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin/shared';

export default function EmailPortalPage() {
  const [stats, setStats] = useState<{
    totalTemplates: number;
    activeTemplates: number;
    recentlySentTests: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/email/stats');
        if (!response.ok) {
          throw new Error('Failed to fetch email stats');
        }
        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const features = [
    {
      title: 'Email Templates',
      description: 'Manage and customize email templates for your campaigns',
      href: '/admin/portal/email/templates',
      icon: '📧',
      color: 'bg-blue-50 text-blue-600',
      stat: stats?.activeTemplates ?? '-',
      statLabel: 'Active Templates',
    },
    {
      title: 'Send Test Email',
      description: 'Test email templates with custom variables',
      href: '/admin/portal/email/send-test',
      icon: '✉️',
      color: 'bg-green-50 text-green-600',
      stat: stats?.recentlySentTests ?? '-',
      statLabel: 'Tests Sent (7d)',
    },
    {
      title: 'Email Settings',
      description: 'Configure sender email, SMTP settings, and preferences',
      href: '/admin/portal/email/settings',
      icon: '⚙️',
      color: 'bg-purple-50 text-purple-600',
      stat: '-',
      statLabel: 'Coming Soon',
    },
  ];

  return (
    <AdminLayout title="Email Management" subtitle="Manage email templates and settings">
      <div>
        {/* Error State */}
        {error && (
          <div className="mb-8 rounded-md bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Quick Stats */}
        {stats && !loading && (
          <div className="mb-12 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <p className="text-sm font-medium text-gray-600">Total Templates</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {stats.totalTemplates}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <p className="text-sm font-medium text-gray-600">Active Templates</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {stats.activeTemplates}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <p className="text-sm font-medium text-gray-600">Tests Sent (Last 7 days)</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {stats.recentlySentTests}
              </p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="mb-12 grid grid-cols-1 gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-lg bg-gray-200" />
            ))}
          </div>
        )}

        {/* Features Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <Link key={feature.href} href={feature.href}>
              <div className="group h-full rounded-lg border border-gray-200 bg-white p-6 transition-all duration-200 hover:border-gray-300 hover:shadow-lg">
                <div
                  className={`inline-flex rounded-lg ${feature.color} p-3 transition-transform group-hover:scale-110 text-2xl`}
                >
                  {feature.icon}
                </div>

                <h2 className="mt-4 text-lg font-semibold text-gray-900">
                  {feature.title}
                </h2>
                <p className="mt-2 text-sm text-gray-600">{feature.description}</p>

                {/* Stat */}
                <div className="mt-6 border-t border-gray-200 pt-4">
                  <p className="text-sm font-medium text-gray-900">{feature.stat}</p>
                  <p className="text-xs text-gray-500">{feature.statLabel}</p>
                </div>

                {/* Link Arrow */}
                <div className="mt-4 flex items-center gap-2 text-sm font-medium text-blue-600 transition-transform group-hover:translate-x-1">
                  View →
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Info Section */}
        <div className="mt-12 rounded-lg bg-blue-50 p-6">
          <h3 className="font-semibold text-blue-900">About Email Management</h3>
          <p className="mt-2 text-sm text-blue-800">
            The email management portal provides comprehensive tools for managing email
            templates, testing deliverability, and monitoring email performance. All email
            operations are logged for compliance and audit purposes.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
