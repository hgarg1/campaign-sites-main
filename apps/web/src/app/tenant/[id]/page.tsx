'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function TenantDashboardPage() {
  const params = useParams();
  const tenantId = params.id as string;

  // Mock tenant data
  const tenant = {
    id: tenantId,
    name: 'Progressive Democrats Coalition',
    slug: 'progressive-democrats',
    websites: 3,
    members: 12,
    storage: '2.4 GB / 10 GB',
  };

  const shortcuts = [
    { title: 'Create Website', icon: '🌐', color: 'from-blue-600 to-blue-400' },
    { title: 'Manage Team', icon: '👥', color: 'from-purple-600 to-purple-400' },
    { title: 'Settings', icon: '⚙️', color: 'from-orange-600 to-orange-400' },
    { title: 'Analytics', icon: '📊', color: 'from-green-600 to-green-400' },
  ];

  const recentWebsites = [
    { name: 'Campaign 2024 Home', status: 'Published', visitors: 12500 },
    { name: 'Volunteer Portal', status: 'Draft', visitors: 0 },
    { name: 'Fundraising Page', status: 'Published', visitors: 8200 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="sticky top-0 bg-white border-b border-gray-200 shadow-sm z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{tenant.name}</h1>
            <p className="text-sm text-gray-600">{tenant.slug}</p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/tenant-chooser"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Switch Workspace
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg transition-all duration-200 hover:bg-red-600 hover:text-white hover:border-red-600 hover:shadow-md hover:shadow-red-200"
            >
              Sign Out
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Stats Row */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {[
            { label: 'Websites', value: tenant.websites, icon: '🌐' },
            { label: 'Team Members', value: tenant.members, icon: '👥' },
            { label: 'Storage Used', value: tenant.storage, icon: '💾' },
          ].map((stat, index) => (
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

        {/* Quick Actions */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {shortcuts.map((shortcut, index) => (
              <motion.button
                key={shortcut.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative group"
              >
                <div className={`absolute inset-0 bg-gradient-to-r ${shortcut.color} rounded-2xl opacity-0 group-hover:opacity-100 blur transition-all duration-300 -z-10`} />
                <div className="relative bg-white rounded-2xl border border-gray-200 group-hover:border-transparent p-6 text-center transition-all duration-300 h-full flex flex-col items-center justify-center gap-3">
                  <span className="text-3xl">{shortcut.icon}</span>
                  <p className="font-semibold text-gray-900">{shortcut.title}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Recent Websites */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="bg-white rounded-2xl border border-gray-200 p-8"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Websites</h2>
          <div className="space-y-4">
            {recentWebsites.map((website, index) => (
              <div
                key={index}
                className="flex items-center justify-between pb-4 border-b border-gray-100 last:border-0"
              >
                <div>
                  <p className="font-medium text-gray-900">{website.name}</p>
                  <p className="text-sm text-gray-600">{website.visitors.toLocaleString()} visitors</p>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      website.status === 'Published'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {website.status}
                  </span>
                  <Link
                    href="#"
                    className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                  >
                    Edit →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
