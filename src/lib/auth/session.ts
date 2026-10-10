/**
 * Server-side session helper.
 *
 * Requirements 8.9, 9.9:
 *   - Sessions are verified server-side before rendering any admin content.
 *   - The user's Role is derived exclusively from `public.users` (the DB), never
 *     from client-supplied values or JWT claims.
 */

import { cache } from 'react';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';

import { getUserById } from '@/lib/db/queries/users';
import type { UserRole } from '@/types/database';

/**
 * The shape returned by `getServerSession`.
 * Combines the Supabase Auth identity fields with the role and profile data
 * stored in `public.users`.
 *
 * Also exported as `SessionUser` — the name used by guard functions in the
 * authz layer (task 10.2).
 */
export interface SessionUser {
  /** The user's UUID — shared between auth.users and public.users. */
  id: string;
  /** The user's email address from Supabase Auth. */
  email: string;
  /** The user's Role fetched from public.users (never from JWT claims). Req 9.9. */
  role: UserRole;
  /** Display name from public.users. */
  display_name: string | null;
  /** Short biography from public.users. */
  bio: string | null;
  /** Avatar URL from public.users. */
  avatar_url: string | null;
  /** ISO 8601 timestamp when the public.users row was created. */
  created_at: string;
}

/** @deprecated Use `SessionUser` instead. */
export type ServerSession = SessionUser;

/**
 * Verifies the current request's session server-side and returns a merged
 * session object, or `null` when no valid session exists.
 *
 * Flow:
 *  1. Build a per-request Supabase client via `createSupabaseServerClient()`,
 *     which reads/writes HTTP-only cookies from the Next.js `cookies()` store.
 *  2. Call `supabase.auth.getUser()` — this performs a server-side token
 *     verification against Supabase Auth (Req 8.9).
 *  3. Fetch the corresponding row from `public.users` via `getUserById` to
 *     obtain the Role and profile fields (Req 9.9).
 *  4. Return the merged `SessionUser` or `null` if either step fails.
 *
 * This function is safe to call from Server Components, Route Handlers, and
 * Server Functions (middleware). It is intentionally async.
 */
export const getServerSession = cache(async function getServerSession(): Promise<SessionUser | null> {
  const supabase = await createSupabaseServerClient();

  // Step 2: verify the session token against Supabase Auth.
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return null;
  }

  // Step 3: fetch the role and profile from public.users (Req 9.9).
  const dbUser = await getUserById(authUser.id);

  if (!dbUser) {
    // The auth token is valid but there is no matching public.users row.
    // Treat as unauthenticated — the user has not been provisioned yet.
    return null;
  }

  // Step 4: merge and return.
  return {
    id: dbUser.id,
    email: authUser.email ?? '',
    role: dbUser.role,
    display_name: dbUser.display_name,
    bio: dbUser.bio,
    avatar_url: dbUser.avatar_url,
    created_at: dbUser.created_at,
  };
});
