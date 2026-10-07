/**
 * Server-side CSRF token initialization helper.
 *
 * IMPORTANT: This function only READS cookies to check if a token exists.
 * It does NOT generate or set cookies because Server Components cannot modify cookies.
 * 
 * The CSRF token is generated lazily on first use:
 * - When a Route Handler that requires CSRF protection is called
 * - The token is generated via a Server Action if needed
 *
 * Requirements 15.6: Generate per-session CSRF token
 */

import { cookies } from 'next/headers';

const CSRF_COOKIE_NAME = 'csrf_token';

/**
 * Checks if a CSRF token exists in the cookie.
 * This is safe to call from Server Components because it only reads cookies.
 *
 * Returns the token value if it exists, or null if no token is set yet.
 * The token will be generated lazily when first needed by client-side code.
 *
 * @example
 * ```typescript
 * // In an admin layout.tsx (Server Component):
 * import { checkCsrfToken } from '@/lib/csrf-init';
 *
 * export default async function AdminLayout({ children }) {
 *   // Just check if token exists (optional - for debugging)
 *   const token = await checkCsrfToken();
 *   return <div>{children}</div>;
 * }
 * ```
 */
export async function checkCsrfToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const existingToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;
  return existingToken || null;
}
