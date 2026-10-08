'use client';

import { useState, useTransition } from 'react';
import {
  changeManagedUserRole,
  createManagedUser,
  deleteUserAccount,
  setManagedAiWriterEnabled,
} from '@/actions/users';
import { runAiWriterTest } from '@/actions/ai-writer';
import type { User, UserRole } from '@/types/database';

interface UserManagementTableProps {
  users: User[];
  currentUserId: string;
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getRoleBadgeStyles(role: UserRole): string {
  switch (role) {
    case 'ADMIN':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    case 'EDITOR':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }
}

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getRoleBadgeStyles(role)}`}
    >
      {role}
    </span>
  );
}

function UserRow({
  user,
  currentUserId,
}: {
  user: User;
  currentUserId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [runMessage, setRunMessage] = useState<string | null>(null);
  const isCurrentUser = user.id === currentUserId;

  const handleRoleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const role = event.currentTarget.value as 'EDITOR' | 'AI_WRITER';
    startTransition(async () => {
      setMessage(null);
      const result = await changeManagedUserRole(user.id, role);
      if (!result.success) {
        setMessage({ type: 'error', text: result.error });
        return;
      }
      window.location.reload();
    });
  };

  const handleAiWriterEnabledChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const enabled = event.currentTarget.checked;
    startTransition(async () => {
      setMessage(null);
      const result = await setManagedAiWriterEnabled(user.id, enabled);
      if (!result.success) {
        setMessage({ type: 'error', text: result.error });
        return;
      }
      window.location.reload();
    });
  };

  const handleRunTest = () => {
    startTransition(async () => {
      setRunMessage(null);
      const result = await runAiWriterTest(user.id);
      if (!result.success) {
        setRunMessage(`Test failed: ${result.error}`);
        return;
      }
      setRunMessage(
        `Created test draft: “${result.title}”.${result.notificationWarning ? ` ${result.notificationWarning}` : ''}`,
      );
    });
  };

  const handleDelete = () => {
    const confirmed = window.confirm(
      `Remove ${user.display_name || 'this account'}? Their posts and media will remain without an active author account.`,
    );

    if (!confirmed) return;

    startTransition(async () => {
      setMessage(null);
      const result = await deleteUserAccount(user.id);

      if (!result.success) {
        setMessage({ type: 'error', text: result.error });
        return;
      }

      setMessage({ type: 'success', text: 'User deleted successfully' });
      window.location.reload();
    });
  };

  return (
    <tr className="border-b border-slate-200 last:border-b-0 dark:border-slate-700">
      <td className="px-6 py-4">
        <div className="flex items-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-300 text-sm font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
            {(user.display_name || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {user.display_name || 'Anonymous user'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              ID: {user.id.slice(0, 8)}...
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
        {formatDate(user.created_at)}
      </td>
      <td className="px-6 py-4">
        {user.role === 'ADMIN' ? (
          <RoleBadge role={user.role} />
        ) : (
          <select
            aria-label={`Role for ${user.display_name || 'user'}`}
            value={user.role}
            onChange={handleRoleChange}
            disabled={isPending}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="EDITOR">EDITOR</option>
            <option value="AI_WRITER">AI_WRITER</option>
          </select>
        )}
        {user.role === 'AI_WRITER' && (
          <div className="mt-2 space-y-2">
            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={user.ai_writer_enabled}
                onChange={handleAiWriterEnabledChange}
                disabled={isPending}
                className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
              />
              Run daily
            </label>
            <button
              type="button"
              onClick={handleRunTest}
              disabled={isPending}
              className="rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-900 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-200 dark:hover:bg-cyan-950/70"
            >
              {isPending ? 'Generating...' : 'Generate test draft'}
            </button>
            {runMessage && (
              <p
                role="status"
                className="max-w-xs text-xs text-slate-600 dark:text-slate-300"
              >
                {runMessage}
              </p>
            )}
          </div>
        )}
      </td>
      <td className="px-6 py-4">
        {!isCurrentUser && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-950/50"
          >
            Remove
          </button>
        )}

        {message && (
          <div
            className={`mt-2 text-xs ${
              message.type === 'success'
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {message.text}
          </div>
        )}
      </td>
    </tr>
  );
}

export function UserManagementTable({
  users,
  currentUserId,
}: UserManagementTableProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'EDITOR' | 'AI_WRITER'>('EDITOR');
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(
    null,
  );
  const [createdAccount, setCreatedAccount] = useState(false);

  const handleCreateUser = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      setStatus(null);
      setTemporaryPassword(null);
      setCreatedAccount(false);

      const result = await createManagedUser(email, role);

      if (!result.success) {
        setStatus({ type: 'error', text: result.error });
        return;
      }

      setEmail('');
      setStatus({
        type: 'success',
        text: `Created ${result.user.role} account for ${result.user.email}`,
      });
      setTemporaryPassword(result.temporaryPassword);
      setCreatedAccount(true);
    });
  };

  return (
    <div className="space-y-6 p-6">
      <form
        onSubmit={handleCreateUser}
        className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50"
      >
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end">
          <div>
            <label
              htmlFor="new-user-email"
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              New account email
            </label>
            <input
              id="new-user-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-cyan-900"
              required
            />
          </div>

          <div>
            <label
              htmlFor="new-user-role"
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Role
            </label>
            <select
              id="new-user-role"
              value={role}
              onChange={(event) =>
                setRole(event.currentTarget.value as 'EDITOR' | 'AI_WRITER')
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="EDITOR">EDITOR</option>
              <option value="AI_WRITER">AI_WRITER</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
          >
            {isPending ? 'Creating...' : 'Create user'}
          </button>
        </div>

        {role === 'AI_WRITER' && (
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
            AI Writer accounts start paused. Enable “Run daily” in the user list
            when the agent should generate posts.
          </p>
        )}

        {status && (
          <div
            className={`mt-3 rounded-lg px-3 py-2 text-sm ${
              status.type === 'success'
                ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300'
                : 'border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300'
            }`}
          >
            {status.text}
          </div>
        )}

        {createdAccount && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
            {temporaryPassword ? (
              <span>
                Temporary password:{' '}
                <span className="font-semibold">{temporaryPassword}</span>
              </span>
            ) : (
              <span>AI Writer account created. It starts paused.</span>
            )}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-md border border-amber-300 px-3 py-1.5 font-semibold transition hover:bg-amber-100 dark:border-amber-800 dark:hover:bg-amber-900/40"
            >
              Refresh user list
            </button>
          </div>
        )}
      </form>

      {users.length === 0 ? (
        <div className="px-6 py-12 text-center text-sm text-slate-600 dark:text-slate-400">
          No users found.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-900/70">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                  Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-950/30">
              {users.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  currentUserId={currentUserId}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
