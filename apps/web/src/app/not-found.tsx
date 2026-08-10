import Link from 'next/link';

/**
 * 404. Previously Next's default, which offers no route back into the product.
 */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <p className="font-mono text-sm text-gray-400">404</p>
      <h1 className="mt-2 text-xl font-semibold text-gray-900">This page does not exist</h1>
      <p className="mt-2 text-sm text-gray-600">
        The link may be out of date, or the organization it pointed at may have been renamed.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-fg transition-colors duration-fast hover:bg-brand-hover"
        >
          Go to home
        </Link>
        <Link
          href="/tenant-chooser"
          className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors duration-fast hover:bg-gray-100"
        >
          Choose an organization
        </Link>
      </div>
    </main>
  );
}
