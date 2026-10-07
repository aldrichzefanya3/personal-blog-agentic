'use client';

import { useState } from 'react';
import { updateMyDisplayName } from '@/actions/users';
import { changeMyPassword } from '@/actions/auth';
import type { UserRole } from '@/types/database';

interface ProfileFormProps {
  currentUser: {
    id: string;
    email: string;
    role: UserRole;
    display_name: string | null;
  };
}

export function ProfileForm({ currentUser }: ProfileFormProps) {
  const [displayName, setDisplayName] = useState(currentUser.display_name ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus(null);

    const result = await updateMyDisplayName(displayName);

    if (!result.success) {
      setStatus({ type: 'error', message: result.error ?? 'Unable to update profile.' });
      setIsSubmitting(false);
      return;
    }

    setDisplayName(result.user.display_name ?? '');
    setStatus({ type: 'success', message: 'Display name updated successfully.' });
    setIsSubmitting(false);
  };

  const handlePasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordStatus(null);

    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', message: 'Passwords do not match.' });
      return;
    }

    setIsPasswordSubmitting(true);
    const result = await changeMyPassword(newPassword);

    if (result.error) {
      setPasswordStatus({ type: 'error', message: result.error });
    } else {
      setPasswordStatus({ type: 'success', message: result.success ?? 'Password updated successfully.' });
      setNewPassword('');
      setConfirmPassword('');
    }

    setIsPasswordSubmitting(false);
  };

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Email</label>
          <input
            value={currentUser.email}
            disabled
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="display-name" className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Display name
          </label>
          <input
            id="display-name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-cyan-900"
            placeholder="Your display name"
            maxLength={50}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-slate-500 dark:text-slate-400">
          Role: <span className="font-medium text-slate-700 dark:text-slate-200">{currentUser.role}</span>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
        >
          {isSubmitting ? 'Saving...' : 'Save changes'}
        </button>
      </div>

      {status && (
        <div
          className={
            status.type === 'success'
              ? 'rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300'
          }
        >
          {status.message}
        </div>
      )}
      </form>

      <div className="border-t border-slate-200 pt-5 dark:border-slate-700">
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Change password</h2>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="new-password" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                New password
              </label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-cyan-900"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="confirm-password" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Confirm new password
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-cyan-900"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPasswordSubmitting}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {isPasswordSubmitting ? 'Updating...' : 'Update password'}
            </button>
          </div>
          {passwordStatus && (
            <div
              className={
                passwordStatus.type === 'success'
                  ? 'rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300'
              }
            >
              {passwordStatus.message}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
