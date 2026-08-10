'use client';

import { ErrorScreen } from '@/components/ui/ErrorScreen';

/**
 * Scoped to the admin portal so a failure on one screen does not tear down the
 * whole application, and "go back" leads somewhere an operator can act from.
 */
export default function AdminPortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorScreen
      error={error}
      reset={reset}
      homeHref="/admin/portal"
      homeLabel="Back to the portal"
      title="This admin screen failed to load"
    />
  );
}
