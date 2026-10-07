/**
 * User Management Settings Page (ADMIN only)
 *
 * Requirements: 9.1, 9.3
 *
 * Req 9.1 — Only ADMIN users can access this page (enforced via requireRole)
 * Req 9.3 — Provides UI to promote/demote user roles
 */

import { requireRole } from '@/lib/authz/guards';
import { getAllUsers } from '@/lib/db/queries/users';
import { UserManagementTable } from './user-management-table';

/**
 * User Management Settings Page component.
 *
 * Server Component that:
 * 1. Verifies caller has 'user:manage' permission (ADMIN only) - throws 403 if unauthorized
 * 2. Fetches all users from the database
 * 3. Renders a table with role management controls
 *
 * Authorization check happens at request time on the server.
 * If the user lacks permission, requireRole throws AuthError with status 403.
 */
export default async function SettingsPage() {
  // Step 1: Verify caller has ADMIN role (Req 9.1)
  // This throws AuthError('FORBIDDEN', 403) if unauthorized
  await requireRole('user:manage');

  // Step 2: Fetch all users (Req 9.3)
  const users = await getAllUsers();

  // Step 3: Render user management interface
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          User Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage user roles and permissions
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <UserManagementTable users={users} />
      </div>
    </div>
  );
}
