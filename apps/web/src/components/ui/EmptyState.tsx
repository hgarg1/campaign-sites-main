'use client';

/**
 * Empty state primitive.
 *
 * Six of twenty-four tenant pages rendered nothing at all when they had no
 * data, which is indistinguishable from a failed load. An empty state should
 * say what is missing, why, and what fills it.
 */

import type { ReactNode } from 'react';

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  /** Why it is empty, in a sentence. Not decoration. */
  description?: string;
  action?: ReactNode;
  icon?: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 px-6 py-10 text-center">
      {icon && (
        <div className="mb-2 text-2xl" aria-hidden="true">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-gray-900">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
