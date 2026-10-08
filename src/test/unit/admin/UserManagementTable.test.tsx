import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  changeManagedUserRole,
  createManagedUser,
  setManagedAiWriterEnabled,
} from '@/actions/users';
import { runAiWriterTest } from '@/actions/ai-writer';
import { UserManagementTable } from '@/app/(admin)/admin/settings/user-management-table';
import type { User } from '@/types/database';

vi.mock('@/actions/users', () => ({
  changeManagedUserRole: vi.fn(),
  createManagedUser: vi.fn(),
  deleteUserAccount: vi.fn(),
  setManagedAiWriterEnabled: vi.fn(),
}));

vi.mock('@/actions/ai-writer', () => ({
  runAiWriterTest: vi.fn(),
}));

const aiWriter: User = {
  id: 'ai-writer-123',
  role: 'AI_WRITER',
  display_name: 'Draft Writer',
  bio: null,
  avatar_url: null,
  created_at: '2026-10-08T00:00:00Z',
  ai_writer_enabled: false,
};

describe('UserManagementTable AI Writer controls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates an AI Writer account in the paused state', async () => {
    vi.mocked(createManagedUser).mockResolvedValue({
      success: true,
      user: {
        id: 'new-writer-456',
        email: 'writer@example.com',
        role: 'AI_WRITER',
        display_name: 'AI Writer',
      },
      temporaryPassword: null,
    });

    render(<UserManagementTable users={[]} currentUserId="admin-789" />);
    fireEvent.change(screen.getByLabelText('Role'), {
      target: { value: 'AI_WRITER' },
    });
    fireEvent.change(screen.getByLabelText('New account email'), {
      target: { value: 'writer@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create user' }));

    await waitFor(() => {
      expect(createManagedUser).toHaveBeenCalledWith(
        'writer@example.com',
        'AI_WRITER',
      );
      expect(
        screen.getByText('AI Writer account created. It starts paused.'),
      ).toBeInTheDocument();
    });
  });

  it('lets an admin enable daily runs for an AI Writer', async () => {
    vi.mocked(setManagedAiWriterEnabled).mockResolvedValue({
      success: false,
      error: 'Test response',
    });

    render(
      <UserManagementTable users={[aiWriter]} currentUserId="admin-789" />,
    );
    fireEvent.click(screen.getByLabelText('Run daily'));

    await waitFor(() => {
      expect(setManagedAiWriterEnabled).toHaveBeenCalledWith(
        'ai-writer-123',
        true,
      );
    });
  });

  it('generates a one-off test draft for a paused AI Writer', async () => {
    vi.mocked(runAiWriterTest).mockResolvedValue({
      success: true,
      title: 'A generated test draft',
      status: 'DRAFT',
      notificationWarning: null,
    });

    render(
      <UserManagementTable users={[aiWriter]} currentUserId="admin-789" />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Generate test draft' }),
    );

    await waitFor(() => {
      expect(runAiWriterTest).toHaveBeenCalledWith('ai-writer-123');
      expect(
        screen.getByText('Created test draft: “A generated test draft”.'),
      ).toBeInTheDocument();
    });
  });

  it('lets an admin assign the AI Writer role to an existing account', async () => {
    vi.mocked(changeManagedUserRole).mockResolvedValue({
      success: false,
      error: 'Test response',
    });

    render(
      <UserManagementTable
        users={[{ ...aiWriter, role: 'EDITOR' }]}
        currentUserId="admin-789"
      />,
    );
    fireEvent.change(screen.getByLabelText('Role for Draft Writer'), {
      target: { value: 'AI_WRITER' },
    });

    await waitFor(() => {
      expect(changeManagedUserRole).toHaveBeenCalledWith(
        'ai-writer-123',
        'AI_WRITER',
      );
    });
  });
});
