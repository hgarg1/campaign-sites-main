'use client';

/**
 * Last resort: catches throws in the root layout itself, where `app/error.tsx`
 * cannot help because the layout that renders it is the thing that failed.
 *
 * Next replaces the entire document here, so this file must supply its own
 * `<html>` and `<body>` — and cannot rely on globals.css having been applied.
 * Styles are therefore inline.
 */

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f9fafb',
          color: '#111827',
          fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
        }}
      >
        <main style={{ maxWidth: 420, padding: '0 24px', textAlign: 'center' }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>
            CampaignSites could not start
          </h1>
          <p style={{ fontSize: 14, color: '#4b5563', marginTop: 8 }}>
            Something failed before the page could load. Reloading usually clears it.
          </p>
          {error.digest && (
            <p style={{ fontSize: 12, color: '#9ca3af', fontFamily: 'monospace', marginTop: 16 }}>
              Reference: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 24,
              padding: '8px 16px',
              fontSize: 14,
              fontWeight: 500,
              color: '#fff',
              background: '#2563eb',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </main>
      </body>
    </html>
  );
}
