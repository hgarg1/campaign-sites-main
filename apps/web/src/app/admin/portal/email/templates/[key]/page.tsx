import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { AdminLayout } from '@/components/admin/shared';
import { TemplatePreview } from '@/components/admin/email/TemplatePreview';
import { TemplateTestEmail } from '@/components/admin/email/TemplateTestEmail';
import { parseAndVerifySessionToken } from '@/lib/session-auth';
import { hasSystemAdminPermission } from '@/lib/rbac';

interface TemplateDetails {
  key: string;
  name: string;
  subject: string;
  category: string;
  description?: string;
  isActive: boolean;
  version: number;
  requiredVars: string[];
  optionalVars: string[];
  createdAt: string;
  updatedAt: string;
  stats?: {
    sent: number;
    opens: number;
    clicks: number;
    bounces: number;
  };
}

export async function generateMetadata({
  params,
}: {
  params: { key: string };
}): Promise<Metadata> {
  return {
    title: `Email Template: ${params.key} - Admin Portal`,
  };
}

export default async function TemplateDetailPage({
  params,
}: {
  params: { key: string };
}) {
  // Check session
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('campaignsites_session')?.value;

  if (!sessionToken) {
    redirect('/login');
  }

  const parsedToken = parseAndVerifySessionToken(sessionToken);
  if (!parsedToken?.userId) {
    redirect('/login');
  }

  // Check permissions
  const hasPermission = await hasSystemAdminPermission(
    parsedToken.userId,
    'system_admin_portal:templates:read'
  );

  if (!hasPermission) {
    notFound();
  }

  // Fetch template
  let template: TemplateDetails | null = null;
  let fetchError: string | null = null;

  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const response = await fetch(
      `${baseUrl}/api/admin/email/templates/${params.key}`,
      {
        headers: {
          Cookie: `campaignsites_session=${sessionToken}`,
        },
      }
    );

    if (response.status === 404) {
      notFound();
    }

    if (!response.ok) {
      fetchError = 'Failed to fetch template details';
    } else {
      template = await response.json();
    }
  } catch (error) {
    fetchError = 'Failed to load template';
    console.error('Template fetch error:', error);
  }

  if (fetchError || !template) {
    return (
      <AdminLayout title="Template Not Found" subtitle="Error loading template">
        <div>
          {/* Back Link */}
          <div className="mb-4">
            <Link
              href="/admin/portal/email/templates"
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Back to Templates
            </Link>
          </div>

          {/* Error */}
          <div className="rounded-md bg-red-50 p-4 flex gap-3">
            <span className="text-red-600 flex-shrink-0 mt-0.5">⚠️</span>
            <div>
              <h3 className="font-medium text-red-900">Error Loading Template</h3>
              <p className="text-sm text-red-700">{fetchError || 'Template not found'}</p>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const tabs = [
    { id: 'preview' as const, label: 'Preview' },
    { id: 'test' as const, label: 'Test Email' },
    { id: 'statistics' as const, label: 'Statistics' },
    { id: 'settings' as const, label: 'Settings' },
  ];

  return (
    <AdminLayout title={template.name} subtitle={template.description ?? undefined}>
      <div>
        {/* Back Link */}
        <div className="mb-6">
          <Link
            href="/admin/portal/email/templates"
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Templates
          </Link>
        </div>

        {/* Status Badges */}
        <div className="mb-6 flex gap-2">
          <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800">
            {template.category}
          </span>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
              template.isActive
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {template.isActive ? 'Active' : 'Inactive'}
          </span>
          <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
            v{template.version}
          </span>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Preview Tab */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Template Preview</h2>
            <TemplatePreview templateKey={params.key} variables={{}} />
          </div>

          {/* Test Email Tab */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Send Test Email</h2>
            <TemplateTestEmail
              templateKey={params.key}
              requiredVars={template.requiredVars}
              optionalVars={template.optionalVars}
              onSuccess={() => {
                // Success is handled by toast notifications in component
              }}
            />
          </div>

          {/* Statistics Tab */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Statistics</h2>
            {template.stats ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-lg border border-gray-200 bg-white p-6">
                  <p className="text-sm font-medium text-gray-600">Sent</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {template.stats.sent}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-6">
                  <p className="text-sm font-medium text-gray-600">Opens</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {template.stats.opens}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-6">
                  <p className="text-sm font-medium text-gray-600">Clicks</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {template.stats.clicks}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-6">
                  <p className="text-sm font-medium text-gray-600">Bounces</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {template.stats.bounces}
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
                <p className="text-gray-600">No statistics available yet</p>
              </div>
            )}
          </div>

          {/* Settings Tab */}
          <div className="space-y-6">
            {/* Metadata */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Template Metadata</h3>
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-600">Template Key</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    <code className="bg-gray-100 px-2 py-1 rounded font-mono">
                      {template.key}
                    </code>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-600">Subject</dt>
                  <dd className="mt-1 text-sm text-gray-900">{template.subject}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-600">Created</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(template.createdAt).toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-600">Last Updated</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(template.updatedAt).toLocaleString()}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Variables */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Variables</h3>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">
                    Required Variables
                  </p>
                  <div className="space-y-2">
                    {template.requiredVars.length > 0 ? (
                      template.requiredVars.map((v) => (
                        <code
                          key={v}
                          className="block text-sm bg-red-50 text-red-900 px-3 py-2 rounded border border-red-200 font-mono"
                        >
                          {v}
                        </code>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">None</p>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">
                    Optional Variables
                  </p>
                  <div className="space-y-2">
                    {template.optionalVars.length > 0 ? (
                      template.optionalVars.map((v) => (
                        <code
                          key={v}
                          className="block text-sm bg-blue-50 text-blue-900 px-3 py-2 rounded border border-blue-200 font-mono"
                        >
                          {v}
                        </code>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">None</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
