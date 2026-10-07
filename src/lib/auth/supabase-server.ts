/**
 * Supabase server-side client factory.
 *
 * Use `createSupabaseServerClient()` in Server Components, Server Actions,
 * Route Handlers, and middleware — anywhere that has access to Next.js's
 * `cookies()` store.  A new client instance must be created per request;
 * never share one across requests.
 *
 * Requirements 8.1, 8.2, 8.3, 17.1, 17.2
 *
 * Req 8.1 — Sessions are stored exclusively in HTTP-only, Secure,
 *            SameSite=Lax cookies so the token is inaccessible to JavaScript.
 * Req 8.3 — Only the anon key is used here; the service-role key is never
 *            passed to a client that could be invoked from browser code.
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Creates a Supabase client configured for server-side use.
 *
 * Cookie handling follows the `getAll` / `setAll` pattern required by
 * `@supabase/ssr` v0.12+.  The `setAll` handler accepts the second `headers`
 * argument emitted by the library on token-refresh responses; in Server
 * Components and Route Handlers there is no writable response object at this
 * point, so the headers are intentionally not forwarded — middleware is
 * responsible for applying them on every request edge.
 *
 * Cookie security attributes are configured via `cookieOptions`, which the
 * library merges into its defaults for every Set-Cookie operation it emits
 * (including token refreshes via `applyServerStorage`):
 *
 *   - `httpOnly: true`  — prevents client-side JavaScript access (Req 8.1)
 *   - `secure`          — true in production, false in development
 *   - `sameSite: 'lax'` — protects against CSRF while allowing top-level
 *                          navigations from external links (Req 8.1)
 *   - `path: '/'`       — cookie is sent with every request
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing required environment variables: SUPABASE_URL and/or SUPABASE_ANON_KEY. ' +
        'Copy .env.example to .env.local and fill in real values.',
    );
  }

  const isProduction = process.env.NODE_ENV === 'production';

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    // Req 8.1: Cookie security attributes applied to every Set-Cookie the
    // library emits (the library merges these into its own defaults).
    cookieOptions: {
      // Prevent client-side JavaScript from reading the session token.
      httpOnly: true,
      // Require TLS in production; relax for local dev (http://localhost).
      secure: isProduction,
      // Lax prevents CSRF while allowing navigations from external links.
      sameSite: 'lax',
      path: '/',
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      /**
       * Called by the library after a token refresh or auth state change.
       *
       * The second `headers` argument carries cache-control directives that
       * should be set on the HTTP response to prevent CDN caching of
       * auth-cookie responses.  In Server Components the response is already
       * committed by Next.js and is not directly accessible here, so the
       * headers are not forwarded.  Middleware handles this for the edge
       * cases where it matters (see middleware.ts).
       */
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}
