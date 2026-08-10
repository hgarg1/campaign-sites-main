'use client';

/**
 * The screen a user sees when a route segment throws.
 *
 * There was no `error.tsx` anywhere across 79 routes, so any render-time throw
 * escaped to Next's built-in handler and produced "Application error: a
 * client-side exception has occurred" on a blank white page — no way back, no
 * indication of what failed, and nothing to quote to support.
 *
 * Shared by every boundary so the recovery affordance is identical wherever the
 * failure happens.
 */

import Link from 'next/link';
import { Button } from './Button';

export function ErrorScreen({
  error,
  reset,
  /** Where "go back" should lead — the portal root the failure happened inside. */
  homeHref = '/',
  homeLabel = 'Go to home',
  title = 'Something went wrong',
}: {
  error: Error & { digest?: string };
  reset: () => void;
  homeHref?: string;
  homeLabel?: string;
  title?: string;
}) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <div
        aria-hidden="true"
        className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-xl text-red-600"
      >
        !
      </div>

      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>

      <p className="mt-2 text-sm text-gray-600">
        This page failed to load. Nothing you were doing has been saved, and no changes were
        applied.
      </p>

      {/*
       * The digest is the only handle support has on a production stack trace,
       * which is stripped from the client bundle. Showing it is the difference
       * between a reproducible report and "it broke".
       */}
      {error.digest && (
        <p className="mt-4 font-mono text-xs text-gray-400">Reference: {error.digest}</p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button type="button" onClick={reset}>
          Try again
        </Button>
        <Link
          href={homeHref}
          className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors duration-fast hover:bg-gray-100"
        >
          {homeLabel}
        </Link>
      </div>
    </div>
  );
}
