/**
 * CSRF token generation and verification for non-Server Action requests.
 *
 * Requirements 15.6, 15.7:
 *   - Generate a per-session CSRF token stored in a separate non-HttpOnly cookie
 *   - Verify the submitted token server-side for admin Route Handlers
 *   - Return HTTP 403 with "CSRF validation failure" body when validation fails
 *
 * Note: Next.js Server Actions have built-in CSRF protection via Origin header
 * checks. This module is ONLY for Route Handlers that handle form POSTs.
 * See src/actions/README.md for details.
 */

import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { randomBytes, timingSafeEqual } from 'crypto';

/**
 * Cookie name for the CSRF token.
 * Non-HttpOnly so client-side JavaScript can read and submit it.
 */
const CSRF_COOKIE_NAME = 'csrf_token';

/**
 * Header name where clients should submit the CSRF token.
 */
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Token length in bytes (will be hex-encoded, so 32 bytes = 64 characters).
 */
const TOKEN_BYTES = 32;

/**
 * Generates a cryptographically secure random CSRF token.
 * Returns a hex-encoded string.
 */
function generateRandomToken(): string {
  return randomBytes(TOKEN_BYTES).toString('hex');
}

/**
 * Generates a CSRF token for the current session and stores it in a cookie.
 * The cookie is NOT HttpOnly so client-side JavaScript can read it.
 *
 * If a token already exists, it returns the existing token instead of generating a new one.
 * This prevents unnecessary token regeneration on repeated calls.
 *
 * Call this function when establishing a new admin session (e.g., after login)
 * or when the token is missing.
 *
 * @returns The generated or existing CSRF token (hex-encoded string).
 *
 * Requirements:
 *   - 15.6: Token is stored in a separate non-HttpOnly cookie
 */
export async function generateCsrfToken(): Promise<string> {
  const cookieStore = await cookies();
  
  // Check if a token already exists
  const existingToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;
  if (existingToken) {
    return existingToken;
  }

  // Generate a new token
  const token = generateRandomToken();

  // Store the token in a non-HttpOnly cookie so the client can read it
  // SameSite=Strict provides additional CSRF protection
  // Secure=true ensures the cookie is only sent over HTTPS
  cookieStore.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // MUST be false so client can read it
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours (matches session duration)
  });

  return token;
}

/**
 * Gets the current CSRF token from cookies, or generates a new one if absent.
 *
 * @returns The CSRF token (hex-encoded string).
 */
export async function getCsrfToken(): Promise<string> {
  const cookieStore = await cookies();
  const existingToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;

  if (existingToken) {
    return existingToken;
  }

  // No token exists — generate and store a new one
  return generateCsrfToken();
}

/**
 * Verifies the CSRF token submitted in the request against the token stored
 * in the cookie.
 *
 * The token can be submitted in:
 *   1. The `x-csrf-token` request header (preferred for API calls)
 *   2. The `csrf_token` request body field (for form submissions)
 *
 * Uses constant-time comparison to prevent timing attacks.
 *
 * @param request - The Next.js request object
 * @returns `true` if the token is valid, `false` otherwise
 *
 * Requirements:
 *   - 15.7: Verify submitted token server-side
 *   - 15.7: Return false when token is missing or mismatched
 */
export async function verifyCsrfToken(
  request: NextRequest,
): Promise<boolean> {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;

  // No token in cookie — fail validation
  if (!cookieToken) {
    return false;
  }

  // Check for token in header first (preferred for API calls)
  let submittedToken = request.headers.get(CSRF_HEADER_NAME);

  // If not in header, try to parse from body (for form submissions)
  if (!submittedToken) {
    try {
      const contentType = request.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        // Clone the request to avoid consuming the body stream
        const clonedRequest = request.clone();
        const body = await clonedRequest.json();
        submittedToken = body?.csrf_token ?? null;
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const clonedRequest = request.clone();
        const formData = await clonedRequest.formData();
        submittedToken = formData.get('csrf_token')?.toString() ?? null;
      } else if (contentType.includes('multipart/form-data')) {
        const clonedRequest = request.clone();
        const formData = await clonedRequest.formData();
        submittedToken = formData.get('csrf_token')?.toString() ?? null;
      }
    } catch {
      // Body parsing failed — fall through to return false
    }
  }

  // No token submitted — fail validation
  if (!submittedToken) {
    return false;
  }

  // Use constant-time comparison to prevent timing attacks
  try {
    const cookieBuffer = Buffer.from(cookieToken, 'hex');
    const submittedBuffer = Buffer.from(submittedToken, 'hex');

    // Buffers must be same length for timingSafeEqual
    if (cookieBuffer.length !== submittedBuffer.length) {
      return false;
    }

    return timingSafeEqual(cookieBuffer, submittedBuffer);
  } catch {
    // Buffer conversion or comparison failed (invalid hex, etc.)
    return false;
  }
}

/**
 * Clears the CSRF token cookie.
 * Call this when a user logs out to invalidate any existing tokens.
 */
export async function clearCsrfToken(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(CSRF_COOKIE_NAME);
}
