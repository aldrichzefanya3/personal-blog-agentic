'use client';

/**
 * Admin Setup Form Client Component (Req 8.1, 8.10, 9.1)
 *
 * Handles form submission, validation, loading states, and error/success display.
 * Validates that password and confirm password match before submission.
 */

import { useState, useTransition } from 'react';
import { adminSignupAction } from '@/actions/auth';

export function SetupAdminForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const formData = new FormData(event.currentTarget);
    const password = formData.get('password')?.toString();
    const confirmPassword = formData.get('confirmPassword')?.toString();

    // Client-side validation: check if passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    startTransition(async () => {
      const result = await adminSignupAction(formData);

      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        setSuccess(result.success);
        // Clear form on success
        event.currentTarget.reset();
      }
    });
  };

  return (
    <div className="rounded-lg bg-white p-8 shadow-md dark:bg-gray-800">
      {error && (
        <div
          className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-200"
          role="alert"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          className="mb-4 rounded-md bg-green-50 p-4 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-200"
          role="status"
        >
          <p className="font-medium">{success}</p>
          <p className="mt-1">
            <a
              href="/auth/login"
              className="font-medium underline hover:no-underline"
            >
              Go to login page →
            </a>
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={isPending || !!success}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700"
            aria-describedby={error ? 'setup-error' : undefined}
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            disabled={isPending || !!success}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700"
            aria-describedby="password-requirements"
          />
          <p
            id="password-requirements"
            className="mt-1 text-xs text-gray-500 dark:text-gray-400"
          >
            8-128 characters, at least one uppercase, one lowercase, and one
            digit
          </p>
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="mb-2 block text-sm font-medium"
          >
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            disabled={isPending || !!success}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700"
          />
        </div>

        <div>
          <label htmlFor="secret" className="mb-2 block text-sm font-medium">
            Secret token
          </label>
          <input
            id="secret"
            name="secret"
            type="password"
            autoComplete="off"
            required
            disabled={isPending || !!success}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-mono shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700"
            aria-describedby="secret-help"
          />
          <p
            id="secret-help"
            className="mt-1 text-xs text-gray-500 dark:text-gray-400"
          >
            This must match the ADMIN_SIGNUP_SECRET environment variable
          </p>
        </div>

        <button
          type="submit"
          disabled={isPending || !!success}
          className="flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending
            ? 'Creating admin account...'
            : success
              ? 'Account created'
              : 'Create admin account'}
        </button>
      </form>
    </div>
  );
}
