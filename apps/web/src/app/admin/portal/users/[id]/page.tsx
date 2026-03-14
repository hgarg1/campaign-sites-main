'use client';

import { AdminLayout } from '@/components/admin/shared';
import {
  UserProfile,
  UserActivityTimeline,
  PermissionsManager,
  UserActionsPanel,
  UserStatsCard,
  ApiUsagePanel,
} from '@/components/admin/users';
import Link from 'next/link';
import { useUser } from '@/hooks/useUsers';
import { useSystemAdminPermissions } from '@/hooks/use-system-admin-permissions';

interface PageProps {
  params: {
    id: string;
  };
}

const SAMPLE_ORGANIZATIONS = [
  { id: 'org1', name: 'Progressive Democrats', memberRole: 'OWNER' as const },
  { id: 'org2', name: 'Climate Action 2024', memberRole: 'ADMIN' as const },
];

const SAMPLE_ACTIVITIES = [
  {
    id: '1',
    type: 'login' as const,
    title: 'User logged in',
    timestamp: '2024-02-28T14:22:00Z',
  },
  {
    id: '2',
    type: 'website_published' as const,
    title: 'Website published',
    description: 'Progressive Campaign Website',
    timestamp: '2024-02-27T11:45:00Z',
  },
  {
    id: '3',
    type: 'website_created' as const,
    title: 'Website created',
    description: 'Climate Action Campaign',
    timestamp: '2024-02-20T16:30:00Z',
  },
  {
    id: '4',
    type: 'invite_sent' as const,
    title: 'Invited user to organization',
    description: 'Climate Action 2024',
    timestamp: '2024-02-15T09:30:00Z',
  },
  {
    id: '5',
    type: 'login' as const,
    title: 'User logged in',
    timestamp: '2024-02-10T13:15:00Z',
  },
];

export default function UserDetailPage({ params }: PageProps) {
  const userId = params.id;
  const { data: user, loading, error, refetch } = useUser(userId);
  const { hasPermission } = useSystemAdminPermissions();

  if (loading) {
    return (
      <AdminLayout title="Loading user..." subtitle="Fetching user details">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !user) {
    return (
      <AdminLayout title="User not found" subtitle="Unable to load user details">
        <Link
          href="/admin/portal/users"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
        >
          ← Back to Users
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error?.message || 'User not found'}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={user.name || user.email}
      subtitle="User details and management"
    >
      <Link
        href="/admin/portal/users"
        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
      >
        ← Back to Users
      </Link>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <UserProfile 
            user={user}
            onEmailChange={(newEmail, confirmationSent) => {
              if (confirmationSent) {
                // Refetch user data to get updated email
                setTimeout(() => refetch(), 1000);
              }
            }}
          />
          <UserStatsCard userId={user.id} />
          <UserActivityTimeline activities={SAMPLE_ACTIVITIES} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <ApiUsagePanel userId={user.id} />

          <PermissionsManager
            systemRole={user.role}
            organizations={SAMPLE_ORGANIZATIONS}
            onRoleChange={(newRole) => {
              console.log('Change role:', newRole);
            }}
            onOrgRoleChange={(orgId, role) => {
              console.log('Change org role:', orgId, role);
              alert(`Organization role change would be processed here`);
            }}
          />

          <UserActionsPanel
            userId={user.id}
            userStatus={user.status}
            onRefresh={refetch}
          />
        </div>
      </div>
    </AdminLayout>
  );
}
