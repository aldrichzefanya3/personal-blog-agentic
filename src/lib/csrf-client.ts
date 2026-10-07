/**
 * Client-side CSRF token utilities.
 *
 * This module provides functions for reading the CSRF token from the cookie
 * and including it in fetch requests.
 *
 * Requirements 15.6: Token stored in non-HttpOnly cookie for client access
 */

/**
 * Cookie name for the CSRF token (must match server-side).
 */
const CSRF_COOKIE_NAME = 'csrf_token';

/**
 * Header name for submitting the CSRF token (must match server-side).
 */
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Reads the CSRF token from the cookie.
 * Returns the token value or null if not found.
 *
 * This works because the CSRF cookie is set with httpOnly=false.
 */
export function getCsrfTokenFromCookie(): string | null {
  if (typeof document === 'undefined') {
    // Server-side - cookies are not accessible via document
    return null;
  }

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === CSRF_COOKIE_NAME) {
      return value || null;
    }
  }

  return null;
}

/**
 * Creates fetch options with the CSRF token included.
 * Use this helper when making POST/PUT/PATCH/DELETE requests to admin endpoints.
 *
 * @param options - Base fetch options to extend
 * @returns Fetch options with CSRF token header added
 *
 * @example
 * ```typescript
 * const response = await fetch('/api/preview', withCsrfToken({
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ markdown: '# Hello' })
 * }));
 * ```
 */
export function withCsrfToken(
  options: RequestInit = {},
): RequestInit {
  const token = getCsrfTokenFromCookie();

  if (!token) {
    console.warn('CSRF token not found in cookie');
    return options;
  }

  return {
    ...options,
    headers: {
      ...options.headers,
      [CSRF_HEADER_NAME]: token,
    },
  };
}

/**
 * Adds the CSRF token to FormData.
 * Use this when submitting forms with FormData that need CSRF protection.
 *
 * @param formData - The FormData to append the token to
 * @returns The same FormData instance (for chaining)
 *
 * @example
 * ```typescript
 * const formData = new FormData();
 * formData.append('markdown', '# Hello');
 * addCsrfTokenToFormData(formData);
 *
 * const response = await fetch('/api/preview', {
 *   method: 'POST',
 *   body: formData
 * });
 * ```
 */
export function addCsrfTokenToFormData(formData: FormData): FormData {
  const token = getCsrfTokenFromCookie();

  if (token) {
    formData.append('csrf_token', token);
  } else {
    console.warn('CSRF token not found in cookie');
  }

  return formData;
}
