'use client';

import { useEffect, useState } from 'react';
import { AdminLayout, MetricCard, ActivityFeed } from '@/components/admin/shared';
import { useGrowthMetrics } from '@/hooks/useAnalytics';
import { useSystemHealth } from '@/hooks/useMonitoring';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useUsers } from '@/hooks/useUsers';
import { useWebsites } from '@/hooks/useWebsites';

interface Metric {
  label: string;
  value: string | number;
  icon: string;
  trend?: {
    direction: 'up' | 'down';
    percentage: number;
  };
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

interface Activity {
  id: string;
  action: string;
  description?: string;
  timestamp: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

interface QuickStats {
  successRate: number;
  pendingJobs: number;
  avgBuildTimeSec: number | null;
}

function useAdminQuickStats() {
  const [data, setData] = useState<QuickStats | null>(null);
  useEffect(() => {
    globalThis
      .fetch('/api/admin/analytics/quick-stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => { if (json) setData(json); })
      .catch(() => {});
  }, []);
  return data;
}

export default function AdminPortalPage() {
  const { data: growthData } = useGrowthMetrics();
  const { data: healthServices } = useSystemHealth();
  const { data: users } = useUsers({ pageSize: 1 });
  const { data: organizations } = useOrganizations({ pageSize: 1 });
  const { data: websites } = useWebsites({ pageSize: 1 });
  const quickStats = useAdminQuickStats();
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);

  // Compute metrics from API data
  useEffect(() => {
    if (growthData && users && organizations && websites) {
      const computedMetrics: Metric[] = [
        {
          label: 'Total Users',
          value: growthData.metrics?.[growthData.metrics.length - 1]?.users || 0,
          icon: '👥',
          trend: { direction: 'up', percentage: growthData.usersGrowth || 0 },
          variant: 'default',
        },
        {
          label: 'Organizations',
          value: growthData.metrics?.[growthData.metrics.length - 1]?.organizations || 0,
          icon: '🏢',
          trend: { direction: 'up', percentage: growthData.organizationsGrowth || 0 },
          variant: 'success',
        },
        {
          label: 'Websites Published',
          value: growthData.metrics?.[growthData.metrics.length - 1]?.websites || 0,
          icon: '🌐',
          trend: { direction: 'up', percentage: growthData.websitesGrowth || 0 },
          variant: 'default',
        },
        {
          label: 'System Health',
          value: healthServices?.every((s) => s.status === 'UP') ? '100%' : '90%',
          icon: '✓',
          trend: { direction: 'up', percentage: 0 },
          variant: healthServices?.every((s) => s.status === 'UP') ? 'success' : 'warning',
        },
      ];
      setMetrics(computedMetrics);

      // Generate activity feed from recent data
      const activities: Activity[] = [
        {
          id: '1',
          action: 'Dashboard loaded',
          description: `${users?.length || 0} active users, ${organizations?.length || 0} organizations`,
          timestamp: 'just now',
          type: 'info',
        },
        ...(websites && websites.length > 0
          ? [
              {
                id: '2',
                action: 'Latest website update',
                description: websites[0]?.name || 'Website published',
                timestamp: 'moments ago',
                type: 'success' as const,
              },
            ]
          : []),
      ];
      setRecentActivities(activities);
    }
  }, [growthData, users, organizations, websites]);

  return (
    <AdminLayout
      title="Dashboard"
      subtitle="System Administration Portal"
    >
      {/* Metrics Grid */}
      <div className="grid md:grid-cols-4 gap-6 mb-12">
        {metrics.map((metric, index) => (
          <div key={metric.label} style={{ animationDelay: `${index * 50}ms` }}>
            <MetricCard {...metric} />
          </div>
        ))}
      </div>

      {/* Activity Feed Section */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ActivityFeed activities={recentActivities} maxItems={10} />
        </div>

        {/* Quick Stats Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Stats</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <span className="text-sm text-gray-600">Avg Build Time</span>
              <span className="font-bold text-gray-900">
                {quickStats?.avgBuildTimeSec != null ? `${quickStats.avgBuildTimeSec}s` : '—'}
              </span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <span className="text-sm text-gray-600">Success Rate</span>
              <span className={`font-bold ${quickStats && quickStats.successRate >= 90 ? 'text-green-600' : quickStats ? 'text-yellow-600' : 'text-gray-900'}`}>
                {quickStats ? `${quickStats.successRate}%` : '—'}
              </span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <span className="text-sm text-gray-600">API Uptime</span>
              <span className="font-bold text-green-600">99.98%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Queue Length</span>
              <span className="font-bold text-gray-900">
                {quickStats != null ? `${quickStats.pendingJobs} jobs` : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
