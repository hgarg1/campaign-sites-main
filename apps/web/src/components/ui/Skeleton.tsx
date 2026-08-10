/**
 * The loading contract.
 *
 * 63 files showed a spinner and 30 showed a skeleton, with nothing deciding
 * between them — so the same navigation produced either depending on which
 * screen you landed on.
 *
 * The rule these primitives encode: **a skeleton when the shape of the result is
 * known ahead of time, a spinner only when it is not.** For a metric grid, a
 * table, or a list of owners the shape is known, and holding the layout means
 * nothing jumps when the data arrives. A spinner belongs to an indeterminate
 * in-place action — a form submitting, a vote being cast — where there is no
 * layout to hold.
 *
 * The `.skeleton` class (globals.css) sweeps a highlight in one direction rather
 * than pulsing. Several `animate-pulse` blocks fading out of phase read as broken
 * more than as loading, and the sweep implies progress. It disables itself under
 * `prefers-reduced-motion`.
 */

/**
 * One placeholder block. `className` carries the geometry, so callers size it to
 * whatever it stands in for.
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton rounded ${className}`} />;
}

/**
 * Lines of prose. The last line is short, because real paragraphs are — a stack
 * of equal-length bars reads as a table, not as text.
 */
export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div aria-hidden="true" className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className="skeleton h-3.5 rounded"
          style={{ width: i === lines - 1 ? '62%' : '100%' }}
        />
      ))}
    </div>
  );
}

/** A row of metric cards, matching the `MetricCard` footprint. */
export function SkeletonMetrics({ count = 4 }: { count?: number }) {
  return (
    <div aria-hidden="true" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton h-24 rounded-xl" />
      ))}
    </div>
  );
}

/**
 * A table placeholder that keeps the header row solid.
 *
 * Column headers are known before the data is, so blanking them out throws away
 * information the user could already have been reading.
 */
export function SkeletonTable({
  rows = 5,
  columns,
}: {
  rows?: number;
  columns: string[];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="min-w-full divide-y text-sm">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((c) => (
              <th key={c} scope="col" className="type-label px-4 py-2 text-left">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y" aria-hidden="true">
          {Array.from({ length: rows }, (_, r) => (
            <tr key={r}>
              {columns.map((c, i) => (
                <td key={c} className="px-4 py-3">
                  <div
                    className="skeleton h-3.5 rounded"
                    style={{ width: i === 0 ? '75%' : '45%' }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The whole-page loading state.
 *
 * Replaces the centred `h-12 w-12` spinner that appeared, character for
 * character, in 36 files. A spinner in the middle of an empty page says only
 * "wait"; this says what is coming — a title, a row of figures, a body of
 * content — so the page assembles rather than appears.
 */
export function PageLoading({ metrics = 4 }: { metrics?: number }) {
  return (
    <div role="status" aria-live="polite" className="space-y-6 py-2">
      <span className="sr-only">Loading</span>
      <div aria-hidden="true">
        <div className="skeleton h-6 w-52 rounded" />
        <div className="skeleton mt-2 h-3.5 w-72 rounded" />
      </div>
      <SkeletonMetrics count={metrics} />
      <div aria-hidden="true" className="skeleton h-56 rounded-xl" />
    </div>
  );
}

/**
 * A block within a page that is still resolving, where the page around it has
 * already painted.
 */
export function SectionLoading({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" aria-live="polite" className="space-y-2.5 py-2">
      <span className="sr-only">Loading</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} aria-hidden="true" className="skeleton h-14 rounded-lg" />
      ))}
    </div>
  );
}

/**
 * The one legitimate spinner: an indeterminate action with no layout to hold.
 *
 * Exported so call sites stop hand-rolling a `border-t-transparent` div and so
 * the label is never forgotten — an unlabelled spinner announces nothing.
 */
export function Spinner({
  label = 'Working',
  className = 'h-4 w-4',
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span role="status" className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className={`animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
