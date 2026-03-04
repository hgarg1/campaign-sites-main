'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/shared';
import {
  ServiceStatusDashboard,
  MetricsChart,
  PerformanceMonitor,
  AlertsList,
  AlertRulesManager,
  AlertChannelsConfig,
} from '@/components/admin/monitoring';
import {
  useSystemHealth,
  useSystemMetrics,
  usePerformanceMetrics,
  useAlerts,
  useAlertRules,
  useAlertChannels,
} from '@/hooks/useMonitoring';

type TabType = 'health' | 'alerts' | 'rules' | 'channels';

export default function MonitoringPage() {
  const [activeTab, setActiveTab] = useState<TabType>('health');
  const handleTabChange = useCallback((tabId: TabType) => {
    setActiveTab(tabId);
  }, []);
  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get('tab');
    if (tab === 'alerts' || tab === 'rules' || tab === 'channels') {
      setActiveTab(tab);
    }
  }, []);
  const [metricsTimeRange, setMetricsTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const isHealthTab = activeTab === 'health';
  const isAlertsTab = activeTab === 'alerts';
  const isRulesTab = activeTab === 'rules';
  const isChannelsTab = activeTab === 'channels';
  const alertFilters = useMemo(() => ({ status: 'NEW' as const }), []);

  // Hooks
  const { data: services, loading: healthLoading } = useSystemHealth(true, 30000, isHealthTab);
  const { data: metrics, loading: metricsLoading } = useSystemMetrics(metricsTimeRange, isHealthTab);
  const { data: performance, loading: perfLoading } = usePerformanceMetrics(true, 60000, isHealthTab);
  const { 
    data: alerts, 
    loading: alertsLoading, 
    acknowledgeAlert, 
    resolveAlert 
  } = useAlerts(alertFilters, true, 30000, isAlertsTab);
  const { 
    data: alertRules, 
    loading: rulesLoading, 
    toggleAlertRule 
  } = useAlertRules(isRulesTab);
  const { 
    data: alertChannels, 
    loading: channelsLoading, 
    toggleChannel 
  } = useAlertChannels(isChannelsTab);

  const tabs = useMemo<{ id: TabType; label: string; count?: number }[]>(() => [
    { id: 'health', label: 'Health & Performance' },
    { id: 'alerts', label: 'Active Alerts', count: alerts?.filter(a => a.status !== 'RESOLVED').length || 0 },
    { id: 'rules', label: 'Alert Rules', count: alertRules?.filter(r => r.enabled).length || 0 },
    { id: 'channels', label: 'Notification Channels', count: alertChannels?.filter(c => c.enabled).length || 0 },
  ], [alerts, alertRules, alertChannels]);

  return (
    <AdminLayout
      title="System Monitoring"
      subtitle="Monitor system health, performance, and alerts"
    >
      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Health & Performance Tab */}
      {activeTab === 'health' && (
        <div className="space-y-6">
          {/* Service Status */}
          <ServiceStatusDashboard services={services} loading={healthLoading} />

          {/* System Metrics Chart */}
          <MetricsChart
            metrics={metrics}
            loading={metricsLoading}
            timeRange={metricsTimeRange}
            onTimeRangeChange={setMetricsTimeRange}
          />

          {/* Performance Monitor */}
          <PerformanceMonitor metrics={performance} loading={perfLoading} />
        </div>
      )}

      {/* Active Alerts Tab */}
      {activeTab === 'alerts' && (
        <AlertsList
          alerts={alerts}
          loading={alertsLoading}
          onAcknowledge={acknowledgeAlert}
          onResolve={resolveAlert}
        />
      )}

      {/* Alert Rules Tab */}
      {activeTab === 'rules' && (
        <AlertRulesManager
          rules={alertRules}
          loading={rulesLoading}
          onToggleRule={toggleAlertRule}
        />
      )}

      {/* Notification Channels Tab */}
      {activeTab === 'channels' && (
        <AlertChannelsConfig
          channels={alertChannels}
          loading={channelsLoading}
          onToggleChannel={toggleChannel}
        />
      )}
    </AdminLayout>
  );
}

