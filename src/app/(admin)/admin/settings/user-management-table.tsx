/**
 * User Management Table (Client Component)
 *
 * Requirements: 9.3
 *
 * Req 9.3 — Provides role promotion/demotion controls for each user
 */

'use client';

import { useState, useTransition } from 'react';
import { changeUserRole } from '@/actions/users';
import type { User, UserRole } from '@/types/database';

interface UserManagementTableProps {
  users: User[];
}

/**
 * Formats an ISO 8601 timestamp to a human-readable date string.
 *
 * Example: "2024-01-15T10:30:00Z" → "Jan 15, 2024"
 */
function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Returns styling classes for a role badge.
 */
function getRoleBadgeStyles(role: UserRole): string {
  switch (role) {
    case 'ADMIN':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    case 'EDITOR':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'USER':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }
}

/**
 * Role badge component to display a user's current role.
 */
function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeStyles(
        role,
      )}`}
    >
      {role}
    </span>
  );
}

/**
 * User row component with role management controls.
 */
function UserRow({ user }: { user: User }) {
  const [isPending, startTransition] = useTransition();
  const [currentRole, setCurrentRole] = useState<UserRole>(user.role);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleRoleChange = (newRole: UserRole) => {
    if (newRole === currentRole) return;

    startTransition(async () => {
      setMessage(null);

      const result = await changeUserRole(user.id, newRole);

      if (result.success) {
        setCurrentRole(result.user.role);
        setMessage({
          type: 'success',
          text: `Role updated to ${result.user.role}`,
        });
        // Clear success message after 3 seconds
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({
          type: 'error',
          text: result.error,
        });
      }
    });
  };

  return (
    <tr className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
      <td className="px-6 py-4">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10">
            {user.avatar_url ? (
              <img
                className="h-10 w-10 rounded-full"
                src={user.avatar_url}
                alt={user.display_name || 'User avatar'}
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                <span className="text-gray-600 dark:text-gray-300 font-medium text-sm">
                  {(user.display_name || user.id).charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {user.display_name || 'Unnamed User'}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              ID: {user.id.substring(0, 8)}...
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
        {formatDate(user.created_at)}
      </td>
      <td className="px-6 py-4">
        <RoleBadge role={currentRole} />
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <select
            value={currentRole}
            onChange={(e) => handleRoleChange(e.target.value as UserRole)}
            disabled={isPending}
            className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <option value="USER">USER</option>
            <option value="EDITOR">EDITOR</option>
            <option value="ADMIN">ADMIN</option>
          </select>
          {isPending && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 dark:border-gray-100"></div>
          )}
        </div>
        {message && (
          <div
            className={`mt-2 text-xs ${
              message.type === 'success'
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {message.text}
          </div>
        )}
      </td>
    </tr>
  );
}

/**
 * User management table component.
 *
 * Displays all users with their roles and provides controls to change roles.
 * Uses React transitions for optimistic UI updates during role changes.
 */
export function UserManagementTable({ users }: UserManagementTableProps) {
  if (users.length === 0) {
    return (
      <div className="px-6 py-12 text-center">
        <p className="text-gray-600 dark:text-gray-400 text-sm">No users found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-900">
          <tr>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
            >
              User
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
            >
              Joined
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
            >
              Current Role
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
            >
              Change Role
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {users.map((user) => (
            <UserRow key={user.id} user={user} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
