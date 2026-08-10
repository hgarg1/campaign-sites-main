/**
 * Suspense boundary for the admin portal.
 *
 * There was no `loading.tsx` on any of the 79 routes, so App Router had nothing
 * to stream — a navigation held the previous screen until the next one was fully
 * ready, which reads as a dead click.
 *
 * The skeleton mirrors the shell geometry (w-64 sidebar, sticky top bar,
 * max-w-7xl content) so the chrome does not visibly collapse and rebuild on
 * every navigation.
 */
export default function AdminPortalLoading() {
  return (
    <div className="flex h-dscreen overflow-hidden bg-gray-50" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>

      <div aria-hidden="true" className="hidden w-64 flex-shrink-0 bg-slate-800 lg:block" />

      <div className="flex min-w-0 flex-1 flex-col">
        <div
          aria-hidden="true"
          className="border-b border-gray-200 bg-white px-4 py-4 shadow-raised sm:px-6"
        >
          <div className="skeleton h-7 w-56 rounded" />
          <div className="skeleton mt-2 h-4 w-80 rounded" />
        </div>

        <div aria-hidden="true" className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-24 rounded-xl" />
            ))}
          </div>
          <div className="skeleton mt-6 h-64 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
