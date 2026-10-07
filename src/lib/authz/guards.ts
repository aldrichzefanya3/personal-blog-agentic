/**
 * Authorization guard functions.
 *
 * Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.7, 9.8:
 *   - Verify session exists (9.1, 9.8)
 *   - Check role permissions (9.2, 9.3)
 *   - Enforce ownership rules (9.4, 9.5)
 *   - Throw typed errors with correct HTTP status codes (9.7)
 */

import { getServerSession, type SessionUser } from '@/lib/auth/session';
import { AuthError } from '@/lib/errors';
import { isAuthorized, type Action } from '@/lib/authz/roles';

/**
 * Verifies that a valid session exists and that the user's role has permission
 * to perform the specified action.
 *
 * Flow:
 *  1. Call `getServerSession()` to verify the session and fetch the user's role
 *  2. If no session exists, throw `AuthError('UNAUTHENTICATED', 401)`
 *  3. Check permission via `isAuthorized(role, action)`
 *  4. If unauthorized, throw `AuthError('FORBIDDEN', 403)`
 *  5. Return the SessionUser for use by the caller
 *
 * @param action - The action being attempted (e.g., 'post:create', 'user:manage')
 * @returns The authenticated SessionUser with verified permissions
 * @throws {AuthError} UNAUTHENTICATED (401) if no valid session exists
 * @throws {AuthError} FORBIDDEN (403) if the user's role lacks permission
 *
 * @example
 * ```typescript
 * // In a Server Action
 * export async function createPost(formData: FormData) {
 *   const session = await requireRole('post:create');
 *   // session.id is now guaranteed to exist and have EDITOR or ADMIN role
 * }
 * ```
 */
export async function requireRole(action: Action): Promise<SessionUser> {
  // Step 1 & 2: Verify session exists
  const session = await getServerSession();

  if (!session) {
    throw new AuthError('UNAUTHENTICATED', 401);
  }

  // Step 3 & 4: Check permission
  if (!isAuthorized(session.role, action)) {
    throw new AuthError('FORBIDDEN', 403);
  }

  // Step 5: Return the verified session
  return session;
}

/**
 * Verifies that a valid session exists, that the user's role has permission
 * to perform the specified action, AND that the user either owns the resource
 * or has ADMIN privileges.
 *
 * This guard enforces the ownership rules described in Requirements 9.4 and 9.5:
 *  - ADMIN can perform any action on any resource (bypass ownership check)
 *  - Non-ADMIN users can only perform actions on resources they own
 *
 * Flow:
 *  1. Call `requireRole(action)` to verify session and permissions
 *  2. If role is ADMIN, return immediately (ADMIN bypasses ownership check)
 *  3. Otherwise, verify `session.id === resourceOwnerId`
 *  4. If ownership check fails, throw `AuthError('FORBIDDEN', 403)`
 *
 * @param resourceOwnerId - The ID of the user who owns the resource
 * @param action - The action being attempted
 * @returns The authenticated SessionUser with verified permissions and ownership
 * @throws {AuthError} UNAUTHENTICATED (401) if no valid session exists
 * @throws {AuthError} FORBIDDEN (403) if the user lacks permission or doesn't own the resource
 *
 * @example
 * ```typescript
 * // In a Server Action that edits a post
 * export async function updatePost(postId: string, formData: FormData) {
 *   const post = await getPostById(postId);
 *   if (!post) throw new NotFoundError('Post');
 *
 *   const session = await requireOwnership(post.author_id, 'post:edit');
 *   // session.id now owns the post OR is an ADMIN
 * }
 * ```
 */
export async function requireOwnership(
  resourceOwnerId: string,
  action: Action,
): Promise<SessionUser> {
  // Step 1: Verify session and role permission
  const session = await requireRole(action);

  // Step 2: ADMIN bypasses ownership check (Req 9.5)
  if (session.role === 'ADMIN') {
    return session;
  }

  // Step 3 & 4: Verify ownership
  if (session.id !== resourceOwnerId) {
    throw new AuthError('FORBIDDEN', 403);
  }

  return session;
}
