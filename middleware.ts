/**
 * Next.js middleware for authentication and security headers.
 *
 * This middleware runs on every request that matches the matcher config.
 * It performs two critical functions:
 *
 * 1. **Session Refresh** — Calls `supabase.auth.getUser()` on every request
 *    to transparently refresh expired access tokens using the refresh token
 *    cookie. This keeps sessions alive without requiring the user to log in
 *    again (Req 8.9).
 *
 * 2. **Authentication Guard** — Redirects unauthenticated requests attempting
 *    to access `/admin/**` routes to the login page with a `redirectTo` query
 *    parameter preserving the original path (Req 8.8).
 *
 * 3. **Security Headers** — Sets all required security headers on every
 *    response, including a CSP with per-request nonce (Req 15.1–15.5, 15.8).
 *
 * Requirements: 8.8, 8.9, 15.1, 15.2, 15.3, 15.4, 15.5, 15.8
 *
 * Req 8.8  — Redirect unauthenticated `/admin/**` requests to login with
 *             `redirectTo` query param.
 * Req 8.9  — Verify session server-side before rendering `/admin/**` content.
 * Req 15.1 — Set `Content-Security-Policy` with per-request nonce.
 * Req 15.2 — Set `X-Frame-Options: DENY`.
 * Req 15.3 — Set `X-Content-Type-Options: nosniff`.
 * Req 15.4 — Set `Referrer-Policy: strict-origin-when-cross-origin`.
 * Req 15.5 — Set `Strict-Transport-Security: max-age=31536000; includeSubDomains`.
 * Req 15.8 — Generate a cryptographically secure nonce per request for CSP.
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Middleware entry point.
 *
 * Runs on every request matching the `matcher` config (see bottom of file).
 * The response object is created immediately so that any cookie mutations
 * performed by the Supabase client can be propagated to the browser.
 *
 * Performance note: `supabase.auth.getUser()` performs a network round-trip to
 * Supabase's auth API on every call.  To keep non-admin requests fast, we only
 * invoke it when the request actually needs an authenticated session — i.e.
 * for `/admin/**` routes.  Public routes skip the call entirely and proceed
 * directly to security-header injection.
 */
export async function middleware(request: NextRequest) {
  // Create the response object early so we can mutate cookies/headers
  const response = NextResponse.next({
    request,
  });

  // =========================================================================
  // 2. Authentication Guard for /admin/** (Req 8.8)
  // =========================================================================
  //
  // If the request is for an admin route, we need an authenticated user.
  // Only then do we pay the cost of the Supabase auth round-trip.
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Create a Supabase client configured for middleware.  The cookie handlers
    // read from the request and write to both the request and response so that:
    //   - The request sees updated cookies if the token is refreshed mid-request
    //   - The response sends Set-Cookie headers to persist the new tokens
    const supabase = createServerClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Update the request so downstream code sees the new cookie
              request.cookies.set(name, value);
              // Update the response so the browser receives the Set-Cookie header
              response.cookies.set(name, value, options);
            });
          },
        },
      },
    );

    // Call getUser() to trigger a session refresh if the access token is
    // expired.  The Supabase client transparently exchanges the refresh token
    // for a new access token and writes the updated tokens to cookies via
    // setAll above.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const redirectUrl = new URL('/auth/login', request.url);
      redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // =========================================================================
  // 3. Security Headers (Req 15.1–15.5, 15.8)
  // =========================================================================
  //
  // Generate a cryptographically secure nonce for this request.  The nonce is
  // used in the Content-Security-Policy to allow inline scripts and styles
  // that carry the matching nonce attribute, while blocking all other inline
  // code.  This defends against XSS attacks (Req 15.8).
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  // Store the nonce in a custom header so Server Components and Route Handlers
  // can retrieve it via `headers().get('x-nonce')` and inject it into script/
  // style tags.  The x-nonce header is internal and is NOT exposed to the
  // browser (it's stripped by the CDN/reverse proxy).
  response.headers.set('x-nonce', nonce);

  // Req 15.1: Content-Security-Policy with per-request nonce
  response.headers.set('Content-Security-Policy', buildCSP(nonce));

  // Req 15.2: X-Frame-Options prevents the page from being embedded in an
  // iframe, mitigating clickjacking attacks.
  response.headers.set('X-Frame-Options', 'DENY');

  // Req 15.3: X-Content-Type-Options prevents the browser from MIME-sniffing
  // responses away from the declared Content-Type, reducing the risk of
  // drive-by downloads and content type confusion attacks.
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Req 15.4: Referrer-Policy controls how much referrer information is sent
  // with requests. `strict-origin-when-cross-origin` sends the full URL for
  // same-origin requests and only the origin for cross-origin requests
  // (HTTPS→HTTPS only), protecting user privacy.
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Req 15.5: Strict-Transport-Security (HSTS) instructs the browser to only
  // access the site over HTTPS for the next 365 days, including all subdomains.
  // This header is only effective when the site is accessed over HTTPS.
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains',
  );

  return response;
}

/**
 * Builds the Content-Security-Policy header value with all required directives.
 *
 * The CSP is a defense-in-depth measure that restricts which resources the
 * browser is allowed to load, significantly reducing the attack surface for
 * XSS and data injection attacks.
 *
 * @param nonce - A base64-encoded cryptographically secure random value,
 *                unique per request. Scripts and styles with a matching
 *                `nonce="..."` attribute are allowed to execute/apply.
 *
 * Directive explanations:
 *
 * - `default-src 'self'` — By default, only load resources from the same origin.
 * - `script-src 'self' 'nonce-{nonce}' 'strict-dynamic'` — Allow scripts from
 *   the same origin and inline scripts with the matching nonce. `strict-dynamic`
 *   allows scripts loaded by nonce-verified scripts to run, which is required
 *   for modern frameworks like Next.js that dynamically load chunks.
 * - `style-src 'self' 'nonce-{nonce}' 'unsafe-inline'` — Allow styles from the
 *   same origin and inline styles with the matching nonce. `unsafe-inline` is
 *   a fallback for older browsers that don't support nonces; it's ignored by
 *   modern browsers when a nonce is present.
 * - `img-src 'self' data: https:` — Allow images from the same origin, data
 *   URIs (for inlined images), and any HTTPS URL (for Supabase Storage and
 *   external CDN images).
 * - `font-src 'self' data:` — Allow fonts from the same origin and data URIs.
 * - `connect-src 'self' https://*.supabase.co` — Allow fetch/XHR/WebSocket
 *   connections to the same origin and Supabase API endpoints.
 * - `frame-ancestors 'none'` — Prevent the page from being embedded in any
 *   iframe (equivalent to X-Frame-Options: DENY).
 * - `base-uri 'self'` — Restrict the `<base>` tag to only use same-origin URLs,
 *   preventing attackers from injecting a malicious base href.
 * - `form-action 'self'` — Restrict form submissions to the same origin,
 *   preventing forms from being hijacked to submit data to attacker-controlled
 *   endpoints.
 * - `upgrade-insecure-requests` — Automatically upgrade HTTP requests to HTTPS
 *   when the page is served over HTTPS.
 *
 * Requirements: 15.1, 15.8
 */
function buildCSP(nonce: string): string {
  const directives = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'nonce-${nonce}' 'unsafe-inline'`,
    `img-src 'self' data: https:`,
    `font-src 'self' data:`,
    `connect-src 'self' https://*.supabase.co`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `upgrade-insecure-requests`,
  ];

  return directives.join('; ');
}

/**
 * Matcher configuration for Next.js middleware.
 *
 * The middleware runs on every request EXCEPT:
 *   - `_next/static/*` — Next.js static assets (immutable JS/CSS bundles)
 *   - `_next/image/*`  — Next.js Image Optimization API responses
 *   - `favicon.ico`    — The site favicon
 *   - `*.svg`, `*.png`, `*.jpg`, `*.jpeg`, `*.gif`, `*.webp` — Static image files
 *
 * This exclusion list improves performance by skipping middleware for requests
 * that don't require authentication or dynamic headers. Static assets are served
 * directly from the CDN or filesystem without executing middleware.
 *
 * The regex uses a negative lookahead `(?! ... )` to exclude paths matching the
 * static file pattern. The pattern matches:
 *   - Paths starting with `_next/static` or `_next/image`
 *   - `favicon.ico` at any path level
 *   - Files ending with common image extensions
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
