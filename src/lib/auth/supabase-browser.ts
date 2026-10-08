/**
 * Supabase browser-side client factory.
 *
 * Use `createSupabaseBrowserClient()` in Client Components (`'use client'`
 * files) that need to interact with Supabase directly from the browser —
 * for example, to subscribe to Realtime events or to trigger auth flows that
 * require a client-side redirect (OAuth, magic link, etc.).
 *
 * Requirements 8.2, 8.3, 17.1, 17.2
 *
 * Req 8.2 — Session tokens are NEVER stored in localStorage or sessionStorage;
 *            `@supabase/ssr`'s `createBrowserClient` persists sessions via
 *            cookies only, which the server-side client can also read.
 * Req 8.3 — Only the anon key is used here; the service role key MUST NOT
 *            appear in any browser-executed code.
 */

'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Creates (or re-uses) a Supabase client for use in Client Components.
 *
 * `createBrowserClient` from `@supabase/ssr` maintains a single shared
 * instance per page so multiple components can call this function without
 * creating redundant connections.
 *
 * Security constraints:
 *  - Only the public `NEXT_PUBLIC_SUPABASE_ANON_KEY` is passed. The
 *    service role key MUST NOT be referenced here or in any client bundle.
 *  - Sessions are stored in cookies (not localStorage) so that SSR and
 *    Server Actions can read the same session.
 *
 * @throws {Error} If the required environment variables are not defined.
 */
export function createSupabaseBrowserClient() {
  // NEXT_PUBLIC_ prefix makes these values available in the browser bundle.
  // The anon key is intentionally public — it is scoped to anon/public RLS
  // policies and does not grant admin privileges.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and/or ' +
        'NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env.local and fill in real values.',
    );
  }

  // `createBrowserClient` automatically persists the session via cookies so
  // that server-side renders can read the same session without the token ever
  // touching localStorage (Req 8.2).
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
