/**
 * Server Actions for user management.
 *
 * Requirements: 9.1, 9.3
 *
 * Req 9.1 — Only ADMIN users can manage user roles
 * Req 9.3 — Role changes are persisted to the database
 */

'use server';

import { requireRole } from '@/lib/authz/guards';
import { updateUserRole } from '@/lib/db/queries/users';
import { AuthError } from '@/lib/errors';
import type { UserRole } from '@/types/database';

/**
 * Server Action to update a user's role.
 *
 * This action:
 * 1. Verifies the caller has 'user:manage' permission (ADMIN only)
 * 2. Validates the new role value
 * 3. Updates the user's role in the database
 * 4. Returns the updated user data or an error message
 *
 * @param userId - The UUID of the user whose role should be changed
 * @param newRole - The new role to assign ('ADMIN', 'EDITOR', or 'USER')
 * @returns An object with success flag and either user data or error message
 */
export async function changeUserRole(
  userId: string,
  newRole: UserRole,
): Promise<
  | { success: true; user: { id: string; role: UserRole; display_name: string | null } }
  | { success: false; error: string }
> {
  try {
    // Step 1: Verify caller has permission (Req 9.1)
    await requireRole('user:manage');

    // Step 2: Validate role value
    const validRoles: UserRole[] = ['ADMIN', 'EDITOR', 'USER'];
    if (!validRoles.includes(newRole)) {
      return { success: false, error: 'Invalid role value' };
    }

    // Step 3: Update role in database (Req 9.3)
    const updatedUser = await updateUserRole(userId, newRole);

    // Step 4: Return success response
    return {
      success: true,
      user: {
        id: updatedUser.id,
        role: updatedUser.role,
        display_name: updatedUser.display_name,
      },
    };
  } catch (error) {
    // Handle authorization errors
    if (error instanceof AuthError) {
      if (error.statusCode === 401) {
        return { success: false, error: 'Authentication required' };
      }
      if (error.statusCode === 403) {
        return { success: false, error: 'Insufficient permissions' };
      }
    }

    // Handle other errors
    console.error('Error changing user role:', error);
    return { success: false, error: 'Failed to update user role' };
  }
}
