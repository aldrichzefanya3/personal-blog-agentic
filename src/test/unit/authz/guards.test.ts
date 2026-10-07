/**
 * Unit tests for authorization guard functions.
 * Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.7, 9.8
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireRole, requireOwnership } from '@/lib/authz/guards';
import { AuthError } from '@/lib/errors';
import * as sessionModule from '@/lib/auth/session';
import * as rolesModule from '@/lib/authz/roles';
import type { SessionUser } from '@/lib/auth/session';

// Mock dependencies
vi.mock('@/lib/auth/session', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/authz/roles', async () => {
  const actual = await vi.importActual('@/lib/authz/roles');
  return {
    ...actual,
    isAuthorized: vi.fn(),
  };
});

describe('requireRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return session when authenticated and authorized', async () => {
    // Arrange
    const mockSession: SessionUser = {
      id: 'user-123',
      email: 'editor@example.com',
      role: 'EDITOR',
      display_name: 'Test Editor',
      bio: null,
      avatar_url: null,
      created_at: '2024-01-01T00:00:00Z',
    };

    vi.mocked(sessionModule.getServerSession).mockResolvedValue(mockSession);
    vi.mocked(rolesModule.isAuthorized).mockReturnValue(true);

    // Act
    const result = await requireRole('post:create');

    // Assert
    expect(result).toEqual(mockSession);
    expect(sessionModule.getServerSession).toHaveBeenCalledOnce();
    expect(rolesModule.isAuthorized).toHaveBeenCalledWith(
      'EDITOR',
      'post:create',
    );
  });

  it('should throw UNAUTHENTICATED when no session exists', async () => {
    // Arrange
    vi.mocked(sessionModule.getServerSession).mockResolvedValue(null);

    // Act & Assert
    await expect(requireRole('post:create')).rejects.toThrow(AuthError);
    await expect(requireRole('post:create')).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
      statusCode: 401,
    });

    expect(rolesModule.isAuthorized).not.toHaveBeenCalled();
  });

  it('should throw FORBIDDEN when role lacks permission', async () => {
    // Arrange
    const mockSession: SessionUser = {
      id: 'user-456',
      email: 'user@example.com',
      role: 'EDITOR',
      display_name: 'Regular User',
      bio: null,
      avatar_url: null,
      created_at: '2024-01-01T00:00:00Z',
    };

    vi.mocked(sessionModule.getServerSession).mockResolvedValue(mockSession);
    vi.mocked(rolesModule.isAuthorized).mockReturnValue(false);

    // Act & Assert
    await expect(requireRole('post:create')).rejects.toThrow(AuthError);
    await expect(requireRole('post:create')).rejects.toMatchObject({
      code: 'FORBIDDEN',
      statusCode: 403,
    });

    expect(rolesModule.isAuthorized).toHaveBeenCalledWith(
      'EDITOR',
      'post:create',
    );
  });

  it('should allow ADMIN to perform any action', async () => {
    // Arrange
    const mockSession: SessionUser = {
      id: 'admin-789',
      email: 'admin@example.com',
      role: 'ADMIN',
      display_name: 'Admin User',
      bio: null,
      avatar_url: null,
      created_at: '2024-01-01T00:00:00Z',
    };

    vi.mocked(sessionModule.getServerSession).mockResolvedValue(mockSession);
    vi.mocked(rolesModule.isAuthorized).mockReturnValue(true);

    // Act
    const result = await requireRole('user:manage');

    // Assert
    expect(result).toEqual(mockSession);
    expect(rolesModule.isAuthorized).toHaveBeenCalledWith(
      'ADMIN',
      'user:manage',
    );
  });
});

describe('requireOwnership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return session when user owns the resource', async () => {
    // Arrange
    const mockSession: SessionUser = {
      id: 'user-123',
      email: 'editor@example.com',
      role: 'EDITOR',
      display_name: 'Test Editor',
      bio: null,
      avatar_url: null,
      created_at: '2024-01-01T00:00:00Z',
    };

    vi.mocked(sessionModule.getServerSession).mockResolvedValue(mockSession);
    vi.mocked(rolesModule.isAuthorized).mockReturnValue(true);

    // Act
    const result = await requireOwnership('user-123', 'post:edit');

    // Assert
    expect(result).toEqual(mockSession);
    expect(sessionModule.getServerSession).toHaveBeenCalledOnce();
  });

  it('should throw FORBIDDEN when user does not own the resource', async () => {
    // Arrange
    const mockSession: SessionUser = {
      id: 'user-123',
      email: 'editor@example.com',
      role: 'EDITOR',
      display_name: 'Test Editor',
      bio: null,
      avatar_url: null,
      created_at: '2024-01-01T00:00:00Z',
    };

    vi.mocked(sessionModule.getServerSession).mockResolvedValue(mockSession);
    vi.mocked(rolesModule.isAuthorized).mockReturnValue(true);

    // Act & Assert
    await expect(requireOwnership('user-456', 'post:edit')).rejects.toThrow(
      AuthError,
    );
    await expect(
      requireOwnership('user-456', 'post:edit'),
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
      statusCode: 403,
    });
  });

  it('should allow ADMIN to bypass ownership check (Req 9.5)', async () => {
    // Arrange
    const mockSession: SessionUser = {
      id: 'admin-789',
      email: 'admin@example.com',
      role: 'ADMIN',
      display_name: 'Admin User',
      bio: null,
      avatar_url: null,
      created_at: '2024-01-01T00:00:00Z',
    };

    vi.mocked(sessionModule.getServerSession).mockResolvedValue(mockSession);
    vi.mocked(rolesModule.isAuthorized).mockReturnValue(true);

    // Act - ADMIN accessing resource owned by different user
    const result = await requireOwnership('user-123', 'post:edit');

    // Assert
    expect(result).toEqual(mockSession);
    expect(result.id).not.toBe('user-123'); // Different user
    expect(result.role).toBe('ADMIN');
  });

  it('should throw UNAUTHENTICATED when no session exists', async () => {
    // Arrange
    vi.mocked(sessionModule.getServerSession).mockResolvedValue(null);

    // Act & Assert
    await expect(requireOwnership('user-123', 'post:edit')).rejects.toThrow(
      AuthError,
    );
    await expect(
      requireOwnership('user-123', 'post:edit'),
    ).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
      statusCode: 401,
    });
  });

  it('should throw FORBIDDEN when role lacks permission before checking ownership', async () => {
    // Arrange
    const mockSession: SessionUser = {
      id: 'user-123',
      email: 'user@example.com',
      role: 'EDITOR',
      display_name: 'Regular User',
      bio: null,
      avatar_url: null,
      created_at: '2024-01-01T00:00:00Z',
    };

    vi.mocked(sessionModule.getServerSession).mockResolvedValue(mockSession);
    vi.mocked(rolesModule.isAuthorized).mockReturnValue(false);

    // Act & Assert - Even though user-123 owns the resource, they lack permission
    await expect(requireOwnership('user-123', 'post:create')).rejects.toThrow(
      AuthError,
    );
    await expect(
      requireOwnership('user-123', 'post:create'),
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
      statusCode: 403,
    });
  });
});
