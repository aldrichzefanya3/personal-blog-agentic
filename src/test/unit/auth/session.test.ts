/**
 * Unit tests for the server session helper.
 *
 * Requirements 8.9, 9.9:
 *  - Server-side session verification
 *  - Role must come from public.users, not JWT claims
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from '@/lib/auth/session';
import type { SessionUser } from '@/lib/auth/session';

// Mock the dependencies
vi.mock('@/lib/auth/supabase-server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock('@/lib/db/queries/users', () => ({
  getUserById: vi.fn(),
}));

import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { getUserById } from '@/lib/db/queries/users';

describe('getServerSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null when supabase auth returns an error', async () => {
    // Arrange
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: new Error('Invalid token'),
        }),
      },
    };
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabase as unknown as Awaited<
        ReturnType<typeof createSupabaseServerClient>
      >,
    );

    // Act
    const result = await getServerSession();

    // Assert
    expect(result).toBeNull();
    expect(mockSupabase.auth.getUser).toHaveBeenCalledOnce();
    expect(getUserById).not.toHaveBeenCalled();
  });

  it('should return null when supabase auth returns no user', async () => {
    // Arrange
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    };
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabase as unknown as Awaited<
        ReturnType<typeof createSupabaseServerClient>
      >,
    );

    // Act
    const result = await getServerSession();

    // Assert
    expect(result).toBeNull();
    expect(mockSupabase.auth.getUser).toHaveBeenCalledOnce();
    expect(getUserById).not.toHaveBeenCalled();
  });

  it('should return null when user exists in auth but not in public.users', async () => {
    // Arrange
    const mockAuthUser = {
      id: 'auth-user-123',
      email: 'test@example.com',
    };
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockAuthUser },
          error: null,
        }),
      },
    };
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabase as unknown as Awaited<
        ReturnType<typeof createSupabaseServerClient>
      >,
    );
    vi.mocked(getUserById).mockResolvedValue(null);

    // Act
    const result = await getServerSession();

    // Assert
    expect(result).toBeNull();
    expect(mockSupabase.auth.getUser).toHaveBeenCalledOnce();
    expect(getUserById).toHaveBeenCalledWith('auth-user-123');
  });

  it('should return merged session when both auth and db user exist', async () => {
    // Arrange
    const mockAuthUser = {
      id: 'user-123',
      email: 'admin@example.com',
      // Note: JWT may contain a role claim, but we ignore it (Req 9.9)
    };
    const mockDbUser = {
      id: 'user-123',
      role: 'ADMIN' as const,
      display_name: 'Admin User',
      bio: 'I am an admin',
      avatar_url: 'https://example.com/avatar.jpg',
      created_at: '2024-01-01T00:00:00Z',
    };
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockAuthUser },
          error: null,
        }),
      },
    };
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabase as unknown as Awaited<
        ReturnType<typeof createSupabaseServerClient>
      >,
    );
    vi.mocked(getUserById).mockResolvedValue(mockDbUser);

    // Act
    const result = await getServerSession();

    // Assert
    expect(result).toEqual<SessionUser>({
      id: 'user-123',
      email: 'admin@example.com',
      role: 'ADMIN',
      display_name: 'Admin User',
      bio: 'I am an admin',
      avatar_url: 'https://example.com/avatar.jpg',
      created_at: '2024-01-01T00:00:00Z',
    });
    expect(mockSupabase.auth.getUser).toHaveBeenCalledOnce();
    expect(getUserById).toHaveBeenCalledWith('user-123');
  });

  it('should fetch role from public.users, not JWT claims (Req 9.9)', async () => {
    // Arrange - simulate JWT containing role claim that differs from DB
    const mockAuthUser = {
      id: 'user-456',
      email: 'editor@example.com',
      // In a real scenario, JWT might contain outdated or client-supplied role
      app_metadata: { role: 'USER' }, // This should be IGNORED
    };
    const mockDbUser = {
      id: 'user-456',
      role: 'EDITOR' as const, // The ACTUAL role from DB
      display_name: 'Editor User',
      bio: null,
      avatar_url: null,
      created_at: '2024-01-02T00:00:00Z',
    };
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockAuthUser },
          error: null,
        }),
      },
    };
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabase as unknown as Awaited<
        ReturnType<typeof createSupabaseServerClient>
      >,
    );
    vi.mocked(getUserById).mockResolvedValue(mockDbUser);

    // Act
    const result = await getServerSession();

    // Assert - role MUST come from DB, not JWT
    expect(result).not.toBeNull();
    expect(result?.role).toBe('EDITOR'); // DB role
    expect(result?.role).not.toBe('USER'); // NOT the JWT claim
    expect(getUserById).toHaveBeenCalledWith('user-456');
  });

  it('should handle user with null profile fields', async () => {
    // Arrange
    const mockAuthUser = {
      id: 'user-789',
      email: 'minimal@example.com',
    };
    const mockDbUser = {
      id: 'user-789',
      role: 'EDITOR' as const,
      display_name: null,
      bio: null,
      avatar_url: null,
      created_at: '2024-01-03T00:00:00Z',
    };
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockAuthUser },
          error: null,
        }),
      },
    };
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabase as unknown as Awaited<
        ReturnType<typeof createSupabaseServerClient>
      >,
    );
    vi.mocked(getUserById).mockResolvedValue(mockDbUser);

    // Act
    const result = await getServerSession();

    // Assert
    expect(result).toEqual<SessionUser>({
      id: 'user-789',
      email: 'minimal@example.com',
      role: 'EDITOR',
      display_name: null,
      bio: null,
      avatar_url: null,
      created_at: '2024-01-03T00:00:00Z',
    });
  });

  it('should handle auth user with no email', async () => {
    // Arrange
    const mockAuthUser = {
      id: 'user-no-email',
      email: undefined, // Some auth methods may not provide email
    };
    const mockDbUser = {
      id: 'user-no-email',
      role: 'EDITOR' as const,
      display_name: 'No Email User',
      bio: null,
      avatar_url: null,
      created_at: '2024-01-04T00:00:00Z',
    };
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockAuthUser },
          error: null,
        }),
      },
    };
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabase as unknown as Awaited<
        ReturnType<typeof createSupabaseServerClient>
      >,
    );
    vi.mocked(getUserById).mockResolvedValue(mockDbUser);

    // Act
    const result = await getServerSession();

    // Assert
    expect(result).not.toBeNull();
    expect(result?.email).toBe(''); // Falls back to empty string
  });
});
