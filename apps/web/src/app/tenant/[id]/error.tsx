'use client';

import { useParams } from 'next/navigation';
import { ErrorScreen } from '@/components/ui/ErrorScreen';

/**
 * Scoped to one tenant portal, so recovery lands back inside the organization
 * the user was working in rather than at the marketing site.
 */
export default function TenantPortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams<{ id: string }>();

  return (
    <ErrorScreen
      error={error}
      reset={reset}
      homeHref={params?.id ? `/tenant/${params.id}` : '/tenant-chooser'}
      homeLabel="Back to the dashboard"
      title="This page failed to load"
    />
  );
}
