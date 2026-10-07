'use client';

/**
 * Update Password Form Client Component (Req 8.5, 8.6, 8.10)
 *
 * Handles password update form submission with client-side validation.
 * Displays password policy requirements.
 */

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { updatePasswordAction } from '@/actions/auth';

export function UpdatePasswordForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (password.length > 128) {
      setError('Password must not exceed 128 characters');
      return;
    }

    const formData = new FormData();
    formData.append('password', password);

    startTransition(async () => {
      const result = await updatePasswordAction(formData);

      if (result?.error) {
        // Req 8.6: Handle expired/consumed token links
        if (
          result.error.includes('invalid') ||
          result.error.includes('expired')
        ) {
          // Redirect to reset-request page with error message
          router.push(
            `/auth/reset-password?error=${encodeURIComponent(result.error)}`,
          );
        } else {
          setError(result.error);
        }
      }
      // On success, updatePasswordAction redirects automatically
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

      {/* Password Policy Requirements (Req 8.10) */}
      <div className="mb-6 rounded-md bg-blue-50 p-4 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
        <p className="mb-2 font-medium">Password requirements:</p>
        <ul className="list-inside list-disc space-y-1">
          <li>8-128 characters long</li>
          <li>At least one uppercase letter</li>
          <li>At least one lowercase letter</li>
          <li>At least one digit</li>
        </ul>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-medium">
            New password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            disabled={isPending}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700"
            aria-describedby="password-requirements"
          />
        </div>

        <div>
          <label
            htmlFor="confirm-password"
            className="mb-2 block text-sm font-medium"
          >
            Confirm new password
          </label>
          <input
            id="confirm-password"
            name="confirm-password"
            type="password"
            autoComplete="new-password"
            required
            disabled={isPending}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? 'Updating password...' : 'Update password'}
        </button>
      </form>
    </div>
  );
}
