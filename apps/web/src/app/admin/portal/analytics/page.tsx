'use client';

import { useState, useMemo, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/shared';
import {
  GrowthMetrics,
  UsageAnalytics,
  EngagementDashboard,
  CostAnalytics,
  BillingOverview,
  ReportGenerator,
  ReportLibrary,
} from '@/components/admin/analytics';
import {
  useGrowthMetrics,
  useUsageAnalytics,
  useEngagementMetrics,
  useCostAnalytics,
  useBillingData,
  useReportGeneration,
} from '@/hooks/useAnalytics';

type TabType = 'growth' | 'usage' | 'engagement' | 'costs' | 'billing' | 'reports';

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('growth');
  const [costPeriod, setCostPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const handleTabChange = useCallback((tabId: TabType) => {
    setActiveTab(tabId);
  }, []);
  const handleCostPeriodChange = useCallback((period: 'day' | 'week' | 'month' | 'year') => {
    setCostPeriod(period);
  }, []);

  // Hooks
  const growthMetrics = useGrowthMetrics();
  const usageAnalytics = useUsageAnalytics();
  const engagementMetrics = useEngagementMetrics();
  const costAnalytics = useCostAnalytics(costPeriod);
  const billingData = useBillingData();
  const reportGeneration = useReportGeneration();

  const tabs = useMemo<{ id: TabType; label: string; icon: string }[]>(() => [
    { id: 'growth', label: 'Growth', icon: '📈' },
    { id: 'usage', label: 'Usage', icon: '📊' },
    { id: 'engagement', label: 'Engagement', icon: '👥' },
    { id: 'costs', label: 'Costs', icon: '💰' },
    { id: 'billing', label: 'Billing', icon: '💳' },
    { id: 'reports', label: 'Reports', icon: '📄' },
  ], []);

  return (
    <AdminLayout
      title="Analytics & Reports"
      subtitle="View system analytics and generate reports"
    >
      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 overflow-x-auto">
        <nav className="-mb-px flex gap-6 sm:gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Growth Tab */}
      {activeTab === 'growth' && (
        <div className="space-y-6">
          <GrowthMetrics
            data={growthMetrics.data}
            loading={growthMetrics.loading}
          />
        </div>
      )}

      {/* Usage Tab */}
      {activeTab === 'usage' && (
        <div className="space-y-6">
          <UsageAnalytics
            data={usageAnalytics.data}
            loading={usageAnalytics.loading}
          />
        </div>
      )}

      {/* Engagement Tab */}
      {activeTab === 'engagement' && (
        <div className="space-y-6">
          <EngagementDashboard
            data={engagementMetrics.data}
            loading={engagementMetrics.loading}
          />
        </div>
      )}

      {/* Costs Tab */}
      {activeTab === 'costs' && (
        <div className="space-y-6">
          <CostAnalytics
            data={costAnalytics.data}
            loading={costAnalytics.loading}
            onPeriodChange={setCostPeriod}
          />
        </div>
      )}

      {/* Billing Tab */}
      {activeTab === 'billing' && (
        <div className="space-y-6">
          <BillingOverview
            data={billingData.data}
            loading={billingData.loading}
          />
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-1">
            <ReportGenerator
              loading={reportGeneration.generating}
              onGenerate={reportGeneration.generateReport}
            />
          </div>
          <div className="xl:col-span-2">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <ReportLibrary
                reports={reportGeneration.reports}
                loading={reportGeneration.loading}
                onDownload={reportGeneration.downloadReport}
              />
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
