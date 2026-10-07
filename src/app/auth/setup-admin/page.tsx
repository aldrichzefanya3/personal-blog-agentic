/**
 * One-time Admin Setup Page (Req 8.1, 8.10, 9.1, 17.1)
 *
 * Creates the first admin user account using a secret token for authorization.
 * This page is only accessible before any admin user exists in the system.
 * After the first admin is created, this page returns 404 (defense-in-depth).
 *
 * Security model:
 * - Requires ADMIN_SIGNUP_SECRET environment variable (validated at startup)
 * - Secret must be communicated out-of-band to blog owner
 * - Route self-destructs after first admin exists (returns 404)
 * - Password validation enforces policy (8-128 chars, uppercase, lowercase, digit)
 *
 * Requirements: 8.1, 8.10, 9.1, 17.1, 17.3
 */

import { notFound } from 'next/navigation';
import { hasAdminUser } from '@/lib/auth/admin-check';
import { SetupAdminForm } from './setup-admin-form';

export default async function SetupAdminPage() {
  // Check if an admin user already exists (Req 9.1 — one-time only)
  // If true, return 404 to make the route inaccessible (defense-in-depth)
  const adminExists = await hasAdminUser();

  if (adminExists) {
    notFound();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-900">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h1 className="text-center text-3xl font-bold">
            Admin Account Setup
          </h1>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Create the first admin account
          </p>
        </div>

        <div className="rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
          <p className="font-medium">⚠️ One-time setup</p>
          <p className="mt-1">
            This is a one-time setup. After creating the first admin account,
            this page will no longer be accessible.
          </p>
        </div>

        <SetupAdminForm />

        <div className="rounded-lg bg-gray-100 p-4 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
          <p className="font-medium mb-2">Security Information:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              The secret token is required and must match the
              ADMIN_SIGNUP_SECRET environment variable
            </li>
            <li>
              Password must be 8-128 characters with at least one uppercase
              letter, one lowercase letter, and one digit
            </li>
            <li>
              After creating the admin account, sign in at{' '}
              <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">
                /auth/login
              </code>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
