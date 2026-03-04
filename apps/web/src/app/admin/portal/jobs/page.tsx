'use client';

import { AdminLayout } from '@/components/admin/shared';
import {
  QueueStatusPanel,
  LLMProvidersStats,
  CostAnalyticsPanel,
  ActiveJobsList,
} from '@/components/admin/jobs';
import {
  useQueueStatus,
  useProviderStats,
  useCostAnalytics,
  useBuildJobs,
} from '@/hooks/useBuildJobs';

export default function JobsPage() {
  const { data: queueStatus, loading: queueLoading } = useQueueStatus();
  const { data: providerStats, loading: providersLoading } = useProviderStats();
  const { data: costAnalytics, loading: costsLoading } = useCostAnalytics();
  const { data: buildJobs, loading: jobsLoading } = useBuildJobs({ pageSize: 50 });

  return (
    <AdminLayout
      title="Build Jobs & LLM Pipeline"
      subtitle="Monitor build jobs and LLM provider costs"
    >
      <div className="space-y-6">
        {/* Queue Status */}
        <QueueStatusPanel status={queueStatus} loading={queueLoading} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Jobs */}
          <ActiveJobsList jobs={buildJobs} loading={jobsLoading} />

          {/* LLM Providers Stats */}
          <LLMProvidersStats providers={providerStats} loading={providersLoading} />
        </div>

        {/* Cost Analytics */}
        <CostAnalyticsPanel analytics={costAnalytics} loading={costsLoading} />
      </div>
    </AdminLayout>
  );
}
