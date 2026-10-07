'use server';

/**
 * CSRF Token Server Actions
 *
 * Server Actions to initialize and manage CSRF tokens.
 * These can be called from Client Components to lazily generate tokens.
 *
 * Requirements 15.6: Generate per-session CSRF token in non-HttpOnly cookie
 */

import { generateCsrfToken } from '@/lib/csrf';

/**
 * Initializes a CSRF token if one doesn't exist.
 * Can be called from Client Components to ensure a token is available.
 *
 * @returns The CSRF token value
 */
export async function initializeCsrfTokenAction(): Promise<string> {
  return generateCsrfToken();
}
