/**
 * Next.js instrumentation hook
 * Runs when the server starts, before any requests are handled
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  try {
    const { initializeLogging } = await import('./src/lib/init-logging');
    initializeLogging();
  } catch (error) {
    console.error('Failed to initialize logging:', error);
    // Don't crash the app, just log the error
  }
}
