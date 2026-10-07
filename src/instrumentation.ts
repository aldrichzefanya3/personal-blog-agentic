/**
 * Next.js Instrumentation Hook
 *
 * This module is loaded by Next.js before the server accepts any requests.
 * Calling `validateEnv()` here ensures the application fails fast with a
 * descriptive error when required environment variables are absent, rather
 * than producing obscure runtime failures deep inside request handlers.
 *
 * Requirements 17.1, 17.2, 17.3
 */

import { validateEnv } from '@/lib/env';

/**
 * Called once by the Next.js runtime during server startup (both Node.js and
 * Edge runtimes, when applicable).  Any uncaught error — or the `process.exit`
 * triggered by `validateEnv` — will prevent the server from starting.
 */
export async function register(): Promise<void> {
  validateEnv();
}
