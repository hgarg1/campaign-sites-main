'use client';

import { useParams, useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/shared';
import {
  OrganizationProfile,
  OrganizationMembers,
  OrganizationWebsitesSection,
  OrganizationUsageCard,
  OrganizationSettings,
} from '@/components/admin/organizations';
import {
  useOrganization,
  useOrganizationMembers,
  useOrganizationWebsites,
  useOrganizationUsage,
} from '@/hooks/useOrganizations';

export default function OrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const organizationId = params.id as string;

  const { data: organization, loading, updateOrganization } = useOrganization(organizationId);
  const { data: members, loading: membersLoading, updateMemberRole, removeMember } = useOrganizationMembers(organizationId);
  const { data: websites, loading: websitesLoading } = useOrganizationWebsites(organizationId);
  const { data: usage, loading: usageLoading } = useOrganizationUsage(organizationId);

  if (loading) {
    return (
      <AdminLayout title="Loading..." subtitle="">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!organization) {
    return (
      <AdminLayout title="Not Found" subtitle="">
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-600">Organization not found</p>
          <button
            onClick={() => router.push('/admin/portal/organizations')}
            className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Organizations
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={organization.name}
      subtitle={`Organization Details - ${organization.slug}`}
    >
      {/* Back Button */}
      <button
        onClick={() => router.push('/admin/portal/organizations')}
        className="mb-6 text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
      >
        ← Back to Organizations
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile */}
          <OrganizationProfile organization={organization} />

          {/* Members */}
          <OrganizationMembers
            members={members}
            loading={membersLoading}
            onUpdateRole={updateMemberRole}
            onRemoveMember={removeMember}
          />

          {/* Websites */}
          <OrganizationWebsitesSection
            websites={websites}
            loading={websitesLoading}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Settings */}
          <OrganizationSettings
            organization={organization}
            onUpdate={updateOrganization}
          />

          {/* Usage */}
          <OrganizationUsageCard
            usage={usage}
            loading={usageLoading}
          />
        </div>
      </div>
    </AdminLayout>
  );
}
