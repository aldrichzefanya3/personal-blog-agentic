/**
 * Next.js Instrumentation Hook
 *
 * This module is loaded by Next.js before the server accepts any requests.
 * Validate required environment variables in the Node.js runtime without
 * pulling Node-only modules into the Edge runtime bundle.
 *
 * Requirements 17.1, 17.2, 17.3
 */

/**
 * Called once by the Next.js runtime during server startup. An uncaught
 * validation error prevents the Node.js server from starting.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnv } = await import('@/lib/env');
    validateEnv();
  }
}
