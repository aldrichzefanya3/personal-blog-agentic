// User query functions — Requirements 9.9, 9.10, 16.1, 16.2

import { randomBytes } from 'node:crypto';
import { sql } from '@/lib/db/client';
import type { User } from '@/types/database';

export function generateAnonymousDisplayName(): string {
  return `Anonymous-${randomBytes(4).toString('hex')}`;
}

/**
 * Returns the public.users row for the given id, or null if not found.
 * Role is always read from the DB (public.users), never from client-supplied
 * values or JWT claims, satisfying Req 9.9. Reading directly from DB also
 * ensures role changes propagate immediately (Req 9.10). (Req 16.1, 16.2)
 */
export async function getUserById(id: string): Promise<User | null> {
  const rows = await sql<User[]>`
    SELECT id, role, display_name, bio, avatar_url, created_at
    FROM public.users
    WHERE id = ${id}
  `;
  return rows[0] ?? null;
}

/**
 * Returns all rows from public.users, ordered by created_at ascending.
 * Used by the admin user-management panel (Req 9.1). (Req 16.1, 16.2)
 */
export async function getAllUsers(): Promise<User[]> {
  const rows = await sql<User[]>`
    SELECT id, role, display_name, bio, avatar_url, created_at
    FROM public.users
    ORDER BY created_at ASC
  `;
  return rows;
}

/**
 * Updates mutable profile fields for a user and returns the updated row.
 * Only the fields present in `data` are written; unset fields remain unchanged.
 * All values are parameterized — no string concatenation. (Req 16.1, 16.2)
 */
export async function updateUserProfile(
  id: string,
  data: Partial<Pick<User, 'display_name' | 'bio' | 'avatar_url'>>,
): Promise<User> {
  const rows = await sql<User[]>`
    UPDATE public.users
    SET
      display_name = COALESCE(${data.display_name ?? null}, display_name),
      bio          = COALESCE(${data.bio ?? null}, bio),
      avatar_url   = COALESCE(${data.avatar_url ?? null}, avatar_url)
    WHERE id = ${id}
    RETURNING id, role, display_name, bio, avatar_url, created_at
  `;
  if (rows.length === 0) {
    throw new Error(`User not found: ${id}`);
  }
  return rows[0];
}
