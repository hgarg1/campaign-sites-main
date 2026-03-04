'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/shared';
import {
  WebsiteOverview,
  BuildJobsTimeline,
  WebsitePagesSection,
  WebsiteIntegrationsSection,
  LLMLogsViewer,
} from '@/components/admin/websites';
import {
  useWebsite,
  useWebsitePages,
  useWebsiteIntegrations,
} from '@/hooks/useWebsites';
import { useBuildJobs, useLLMLogs } from '@/hooks/useBuildJobs';
import { useToast } from '@/components/admin/shared/ToastContext';

export default function WebsiteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const websiteId = params.id as string;

  const [rebuilding, setRebuilding] = useState(false);

  const { data: website, loading, triggerRebuild, deleteWebsite } = useWebsite(websiteId);
  const { data: pages, loading: pagesLoading } = useWebsitePages(websiteId);
  const { data: integrations, loading: integrationsLoading } = useWebsiteIntegrations(websiteId);
  const { data: buildJobs, loading: jobsLoading } = useBuildJobs({ websiteId, pageSize: 50 });
  const { data: llmLogs, loading: logsLoading } = useLLMLogs(websiteId);

  const handleRebuild = async () => {
    if (!confirm('Are you sure you want to trigger a rebuild for this website?')) {
      return;
    }

    try {
      setRebuilding(true);
      await triggerRebuild();
      showToast('success', 'Rebuild triggered successfully');
    } catch (error) {
      showToast('error', 'Failed to trigger rebuild');
    } finally {
      setRebuilding(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this website? This action cannot be undone.')) {
      return;
    }

    const confirmText = prompt('Type "DELETE" to confirm:');
    if (confirmText !== 'DELETE') {
      showToast('info', 'Deletion cancelled');
      return;
    }

    try {
      await deleteWebsite();
      showToast('success', 'Website deleted successfully');
      router.push('/admin/portal/websites');
    } catch (error) {
      showToast('error', 'Failed to delete website');
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Loading..." subtitle="">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!website) {
    return (
      <AdminLayout title="Not Found" subtitle="">
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-600">Website not found</p>
          <button
            onClick={() => router.push('/admin/portal/websites')}
            className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Websites
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={website.name}
      subtitle={`Website Details - ${website.slug}`}
    >
      {/* Back Button */}
      <button
        onClick={() => router.push('/admin/portal/websites')}
        className="mb-6 text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
      >
        ← Back to Websites
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overview */}
          <WebsiteOverview
            website={website}
            onTriggerRebuild={handleRebuild}
            onDelete={handleDelete}
            rebuilding={rebuilding}
          />

          {/* Build Jobs Timeline */}
          <BuildJobsTimeline
            jobs={buildJobs}
            loading={jobsLoading}
          />

          {/* LLM Execution Logs */}
          <LLMLogsViewer
            logs={llmLogs}
            loading={logsLoading}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Pages */}
          <WebsitePagesSection
            pages={pages}
            loading={pagesLoading}
          />

          {/* Integrations */}
          <WebsiteIntegrationsSection
            integrations={integrations}
            loading={integrationsLoading}
          />
        </div>
      </div>
    </AdminLayout>
  );
}
