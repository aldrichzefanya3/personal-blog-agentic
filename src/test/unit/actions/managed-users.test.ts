import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/authz/guards', () => ({
  requireRole: vi.fn(),
}));

vi.mock('@/lib/db/queries/users', () => ({
  generateAnonymousDisplayName: vi.fn(() => 'Anonymous-deadbeef'),
  getAllUsers: vi.fn(),
  getUserById: vi.fn(),
  updateUserProfile: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/errors', () => ({
  AuthError: class AuthError extends Error {
    constructor(
      public code: string,
      public statusCode: number,
    ) {
      super(code);
      this.name = 'AuthError';
    }
  },
}));

import { createManagedUser, deleteUserAccount, updateMyDisplayName } from '@/actions/users';
import { createClient } from '@supabase/supabase-js';
import { requireRole } from '@/lib/authz/guards';
import { getUserById, updateUserProfile } from '@/lib/db/queries/users';
import { getServerSession } from '@/lib/auth/session';
import { AuthError } from '@/lib/errors';

const mockCreateClient = vi.mocked(createClient);
const mockRequireRole = vi.mocked(requireRole);
const mockGetUserById = vi.mocked(getUserById);
const mockUpdateUserProfile = vi.mocked(updateUserProfile);

describe('managed user actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserById.mockResolvedValue({
      id: 'editor-123',
      role: 'EDITOR',
      display_name: 'Anonymous-deadbeef',
      bio: null,
      avatar_url: null,
      created_at: '2024-01-01T00:00:00Z',
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('lets only an ADMIN create an EDITOR account with a random name and one-time password', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key');
    mockRequireRole.mockResolvedValue({ id: 'admin-456', role: 'ADMIN' } as never);
    const createUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'new-user-789' } },
      error: null,
    });
    mockCreateClient.mockReturnValue({
      auth: { admin: { createUser } },
    } as never);

    const result = await createManagedUser(' New@Example.com ');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.user).toEqual({
        id: 'new-user-789',
        email: 'new@example.com',
        role: 'EDITOR',
        display_name: 'Anonymous-deadbeef',
      });
      expect(result.temporaryPassword).toMatch(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{14}$/);
    }
    expect(createUser).toHaveBeenCalledWith(expect.objectContaining({
      app_metadata: { managed_role: 'EDITOR' },
      user_metadata: { display_name: 'Anonymous-deadbeef' },
    }));
    expect(mockRequireRole).toHaveBeenCalledWith('user:manage');
  });

  it('rejects account creation when the caller is not an ADMIN', async () => {
    mockRequireRole.mockRejectedValue(new AuthError('FORBIDDEN', 403));

    const result = await createManagedUser('editor@example.com');

    expect(result).toEqual({ success: false, error: 'Insufficient permissions' });
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('lets a signed-in user change their own display name', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      id: 'editor-123',
      email: 'editor@example.com',
      role: 'EDITOR',
      display_name: 'Anonymous-deadbeef',
      bio: null,
      avatar_url: null,
      created_at: '2024-01-01T00:00:00Z',
    });
    mockUpdateUserProfile.mockResolvedValue({
      id: 'editor-123',
      role: 'EDITOR',
      display_name: 'Editor Name',
    } as never);

    const result = await updateMyDisplayName('  Editor Name  ');

    expect(result.success).toBe(true);
    expect(mockUpdateUserProfile).toHaveBeenCalledWith('editor-123', { display_name: 'Editor Name' });
  });

  it('deletes another account through Supabase Auth', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key');
    mockRequireRole.mockResolvedValue({ id: 'admin-456', role: 'ADMIN' } as never);
    const deleteUser = vi.fn().mockResolvedValue({ error: null });
    mockCreateClient.mockReturnValue({
      auth: { admin: { deleteUser } },
    } as never);

    const result = await deleteUserAccount('editor-123');

    expect(result).toEqual({ success: true });
    expect(deleteUser).toHaveBeenCalledWith('editor-123');
  });

  it('prevents the only ADMIN from deleting their own account', async () => {
    mockRequireRole.mockResolvedValue({ id: 'admin-456', role: 'ADMIN' } as never);

    const result = await deleteUserAccount('admin-456');

    expect(result).toEqual({ success: false, error: 'You cannot remove your own account' });
    expect(mockCreateClient).not.toHaveBeenCalled();
  });
});