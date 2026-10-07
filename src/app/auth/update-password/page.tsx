/**
 * Update Password Page (Req 8.5, 8.6, 8.10)
 *
 * Allows users to set a new password after following a password reset link.
 * Handles expired/consumed token links by redirecting to reset-request with error.
 */

import { UpdatePasswordForm } from './update-password-form';

export default function UpdatePasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-900">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h1 className="text-center text-3xl font-bold">Set new password</h1>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Enter your new password below
          </p>
        </div>

        <UpdatePasswordForm />
      </div>
    </div>
  );
}
