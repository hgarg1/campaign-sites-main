'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout, PermissionErrorPage } from '@/components/admin/shared';
import { useSystemAdminPermissions } from '@/hooks/use-system-admin-permissions';
import { useToast } from '@/components/admin/shared/ToastContext';

interface ProtectedAdminLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  requiredClaim?: string;
  description?: string;
}

/**
 * Wrapper around AdminLayout that checks permissions
 * If user lacks permission, redirects to dashboard with toast notification
 */
export function ProtectedAdminLayout({
  children,
  title,
  subtitle,
  requiredClaim,
  description,
}: ProtectedAdminLayoutProps) {
  const router = useRouter();
  const { hasPermission, permissions, loading } = useSystemAdminPermissions();
  const { error } = useToast();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading) return;

    if (requiredClaim && !hasPermission(requiredClaim)) {
      // No permission - redirect with toast
      setHasAccess(false);

      // Show toast notification
      error(
        'Access Denied',
        `You don't have permission to access this page.`,
        5000
      );

      // Redirect to dashboard after brief delay
      const timeout = setTimeout(() => {
        router.push('/admin/portal');
      }, 500);

      return () => clearTimeout(timeout);
    }

    setHasAccess(true);
  }, [loading, requiredClaim, hasPermission, title, router, error]);

  // Still loading permissions
  if (loading || hasAccess === null) {
    return (
      <AdminLayout title={title} subtitle={subtitle}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-gray-600">Loading permissions...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Permission denied (but will redirect, so show brief message)
  if (!hasAccess) {
    return (
      <AdminLayout title="Access Denied" subtitle="Redirecting...">
        <PermissionErrorPage
          pageTitle={title}
          requiredClaim={requiredClaim || 'system_admin_portal:access'}
        />
      </AdminLayout>
    );
  }

  // Has permission - render normally
  return (
    <AdminLayout title={title} subtitle={subtitle}>
      {children}
    </AdminLayout>
  );
}
