'use client';

/**
 * Password Reset Request Form Client Component (Req 8.4)
 *
 * Handles form submission for requesting password reset links.
 */

import { useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { requestPasswordResetAction } from '@/actions/auth';

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const errorFromUrl = searchParams?.get('error');

  const [error, setError] = useState<string | null>(errorFromUrl);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (formData: FormData) => {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await requestPasswordResetAction(formData);

      if (result.error) {
        setError(result.error);
      } else if (result.success) {
        setSuccess(result.success);
      }
    });
  };

  return (
    <div className="rounded-lg bg-white p-8 shadow-md dark:bg-gray-800">
      {success && (
        <div
          className="mb-4 rounded-md bg-green-50 p-4 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-200"
          role="status"
        >
          {success}
        </div>
      )}

      {error && (
        <div
          className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-200"
          role="alert"
        >
          {error}
        </div>
      )}

      <form action={handleSubmit} className="space-y-6">
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
            disabled={isPending}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700"
            aria-describedby={error ? 'reset-error' : undefined}
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? 'Sending...' : 'Send reset link'}
        </button>

        <div className="text-center text-sm">
          <a
            href="/auth/login"
            className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Back to sign in
          </a>
        </div>
      </form>
    </div>
  );
}
