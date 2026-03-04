'use client';

import { motion } from 'framer-motion';

interface UserStatsCardProps {
  userId: string;
  apiCallsUsed?: number;
  storageUsedMB?: number;
  monthlyDAU?: boolean;
  last30DaysActivityCount?: number;
  featuresUsed?: string[];
}

const defaultStats = {
  apiCallsUsed: 4250,
  storageUsedMB: 2.4,
  monthlyDAU: true,
  last30DaysActivityCount: 18,
  featuresUsed: ['Website Builder', 'AI Content', 'Analytics', 'Email Campaigns'],
};

export function UserStatsCard({
  userId,
  apiCallsUsed = defaultStats.apiCallsUsed,
  storageUsedMB = defaultStats.storageUsedMB,
  monthlyDAU = defaultStats.monthlyDAU,
  last30DaysActivityCount = defaultStats.last30DaysActivityCount,
  featuresUsed = defaultStats.featuresUsed,
}: UserStatsCardProps) {
  const stats = [
    {
      label: 'API Calls (30 days)',
      value: apiCallsUsed.toLocaleString(),
      icon: '⚡',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Storage Used',
      value: `${storageUsedMB.toFixed(1)} MB`,
      icon: '💾',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      label: 'Monthly Active',
      value: monthlyDAU ? '✓ Yes' : '✗ No',
      icon: '📅',
      color: monthlyDAU ? 'text-green-600' : 'text-gray-600',
      bgColor: monthlyDAU ? 'bg-green-50' : 'bg-gray-50',
    },
    {
      label: 'Activity (30d)',
      value: `${last30DaysActivityCount} actions`,
      icon: '📊',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="bg-white rounded-xl border border-gray-200 p-6"
    >
      <h3 className="text-lg font-bold text-gray-900 mb-4">Usage & Engagement</h3>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.05 * idx }}
            className={`${stat.bgColor} rounded-lg p-3`}
          >
            <div className="flex items-start justify-between mb-2">
              <span className="text-2xl">{stat.icon}</span>
            </div>
            <p className="text-xs text-gray-600 mb-1">{stat.label}</p>
            <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Features Used */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Features Used</h4>
        <div className="flex flex-wrap gap-2">
          {featuresUsed.map((feature, idx) => (
            <motion.span
              key={feature}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: 0.05 * idx }}
              className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700"
            >
              {feature}
            </motion.span>
          ))}
        </div>
      </div>

      {/* Activity Sparkline Summary */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <p className="text-xs text-gray-600">
          Last activity: <span className="font-medium text-gray-900">2 hours ago</span>
        </p>
      </div>
    </motion.div>
  );
}
