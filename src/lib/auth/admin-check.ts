/**
 * Admin user existence check utility.
 *
 * Used by the one-time admin signup flow to determine if the setup route
 * should be accessible (Req 8.1, 9.1, 17.1).
 *
 * The setup route `/auth/setup-admin` calls this function at render time and
 * returns 404 if an admin user already exists, preventing additional admin
 * signups via this route.
 */

import { sql } from '@/lib/db/client';

/**
 * Checks whether at least one user with role = 'ADMIN' exists in public.users.
 *
 * Returns `true` if one or more admin users exist, `false` otherwise.
 * This function performs a lightweight COUNT query rather than fetching full
 * user rows.
 *
 * Used by the admin signup route to self-destruct after the first admin is
 * created (defense-in-depth security measure).
 */
export async function hasAdminUser(): Promise<boolean> {
  const result = await sql<[{ count: string }]>`
    SELECT COUNT(*) AS count
    FROM public.users
    WHERE role = 'ADMIN'
  `;

  const count = parseInt(result[0].count, 10);
  return count > 0;
}
