'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function AdminPortalPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'settings'>('overview');

  const stats = [
    { label: 'Total Users', value: '1,234', icon: '👥' },
    { label: 'Organizations', value: '89', icon: '🏢' },
    { label: 'Websites Published', value: '2,456', icon: '🌐' },
    { label: 'System Health', value: '100%', icon: '✓' },
  ];

  const recentActivity = [
    { action: 'New user registered', user: 'jane.doe@example.com', time: '5 mins ago' },
    { action: 'Website published', org: 'Progressive Democrats', time: '23 mins ago' },
    { action: 'Organization created', org: 'Climate Action 2024', time: '2 hours ago' },
    { action: 'Security alert resolved', description: 'Rate limit exceeded', time: '4 hours ago' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="sticky top-0 bg-white border-b border-gray-200 shadow-sm z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              CampaignSites Admin
            </h1>
            <p className="text-sm text-gray-600">System Administration Portal</p>
          </div>
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg transition-all duration-200 hover:bg-red-600 hover:text-white hover:border-red-600 hover:shadow-md hover:shadow-red-200"
          >
            Sign Out
          </Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white rounded-2xl border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-600 font-medium">{stat.label}</p>
                <span className="text-2xl">{stat.icon}</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="mb-8 border-b border-gray-200">
          <div className="flex gap-8">
            {(['overview', 'users', 'settings'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-4 font-medium transition-colors border-b-2 ${
                  activeTab === tab
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-600 border-transparent hover:text-gray-900'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div>
          {activeTab === 'overview' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="bg-white rounded-2xl border border-gray-200 p-8"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Activity</h2>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between pb-4 border-b border-gray-100 last:border-0"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{activity.action}</p>
                      <p className="text-sm text-gray-600">
                        {activity.user || activity.org || activity.description}
                      </p>
                    </div>
                    <p className="text-sm text-gray-500">{activity.time}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'users' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="bg-white rounded-2xl border border-gray-200 p-8"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">User Management</h2>
              <div className="space-y-4">
                <p className="text-gray-600">User management interface would go here:</p>
                <ul className="list-disc list-inside space-y-2 text-gray-600">
                  <li>View all users in the system</li>
                  <li>Manage user roles and permissions</li>
                  <li>Suspend/delete users</li>
                  <li>Reset passwords</li>
                  <li>View user audit logs</li>
                </ul>
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="bg-white rounded-2xl border border-gray-200 p-8"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">System Settings</h2>
              <div className="space-y-4">
                <p className="text-gray-600">System settings interface would go here:</p>
                <ul className="list-disc list-inside space-y-2 text-gray-600">
                  <li>Email configuration</li>
                  <li>API keys and webhooks</li>
                  <li>Security policies</li>
                  <li>Rate limiting</li>
                  <li>Data retention policies</li>
                  <li>Backup settings</li>
                </ul>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
