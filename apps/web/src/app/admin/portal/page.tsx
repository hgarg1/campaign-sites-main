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
    direction: 'up' | 'down' | 'flat';
    percentage: number;
    label?: string;
  };
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

/**
 * Turns a signed percentage change into a trend descriptor.
 * The direction must follow the sign — hard-coding 'up' renders a decline as
 * an upward arrow with a negative number next to it.
 */
function toTrend(percentage: number | undefined, label: string): Metric['trend'] {
  const value = typeof percentage === 'number' && Number.isFinite(percentage) ? percentage : 0;
  return {
    direction: value > 0 ? 'up' : value < 0 ? 'down' : 'flat',
    percentage: value,
    label,
  };
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
      .then((json) => {
        if (json) setData(json);
      })
      .catch(() => {});
  }, []);
  return data;
}

export default function AdminPortalPage() {
  const { data: growthData } = useGrowthMetrics();
  const { data: healthServices } = useSystemHealth();
  // pageSize: 1 — we want the totals from pagination, not the rows.
  const { pagination: usersPage } = useUsers({ pageSize: 1 });
  const { pagination: orgsPage } = useOrganizations({ pageSize: 1 });
  const { data: websites, pagination: websitesPage } = useWebsites({ pageSize: 1 });
  const quickStats = useAdminQuickStats();
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);

  // Compute metrics from API data
  useEffect(() => {
    const metrics: Metric[] = [];
    const period = 'vs prior 30 days';

    // Totals come from each collection's pagination count. They previously read
    // growthData.metrics[last].users, which is the number of records created on
    // the most recent day — so "Total Users" showed today's signups, usually 0.
    metrics.push(
      {
        label: 'Total Users',
        value: usersPage.total,
        icon: '👥',
        trend: toTrend(growthData?.usersGrowth, period),
        variant: 'default',
      },
      {
        label: 'Organizations',
        value: orgsPage.total,
        icon: '🏢',
        trend: toTrend(growthData?.organizationsGrowth, period),
        variant: 'success',
      },
      {
        label: 'Websites',
        value: websitesPage.total,
        icon: '🌐',
        trend: toTrend(growthData?.websitesGrowth, period),
        variant: 'default',
      }
    );

    if (healthServices && healthServices.length > 0) {
      const up = healthServices.filter((s) => s.status === 'UP').length;
      const allUp = up === healthServices.length;
      metrics.push({
        label: 'Services Up',
        value: `${up}/${healthServices.length}`,
        icon: allUp ? '✓' : '!',
        variant: allUp ? 'success' : 'warning',
      });
    }

    setMetrics(metrics);

    // Activity feed. The daily buckets genuinely are per-day counts, so they
    // are described as such here rather than presented as totals.
    const today = growthData?.metrics?.[growthData.metrics.length - 1];
    const activities: Activity[] = [];

    if (today) {
      const newToday = (today.users ?? 0) + (today.organizations ?? 0) + (today.websites ?? 0);
      activities.push({
        id: 'today',
        action: newToday > 0 ? 'New records today' : 'No new records today',
        description:
          newToday > 0
            ? `${today.users ?? 0} users, ${today.organizations ?? 0} organizations, ${today.websites ?? 0} websites`
            : 'Nothing created in the last 24 hours',
        timestamp: 'today',
        type: 'info',
      });
    }

    if (websites && websites.length > 0) {
      activities.push({
        id: 'latest-website',
        action: 'Most recent website',
        description: websites[0]?.name || 'Untitled website',
        timestamp: 'latest',
        type: 'success' as const,
      });
    }

    setRecentActivities(activities);
  }, [growthData, healthServices, websites, usersPage.total, orgsPage.total, websitesPage.total]);

  return (
    <AdminLayout title="Dashboard" subtitle="System Administration Portal">
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
              <span
                className={`font-bold ${quickStats && quickStats.successRate >= 90 ? 'text-green-600' : quickStats ? 'text-yellow-600' : 'text-gray-900'}`}
              >
                {quickStats ? `${quickStats.successRate}%` : '—'}
              </span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <span className="text-sm text-gray-600">Services Reporting Up</span>
              <span className="font-bold text-gray-900">
                {healthServices && healthServices.length > 0
                  ? `${healthServices.filter((s) => s.status === 'UP').length}/${healthServices.length}`
                  : '—'}
              </span>
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
