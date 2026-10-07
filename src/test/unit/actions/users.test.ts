/**
 * Unit tests for user management Server Actions
 *
 * Requirements: 9.1, 9.3
 *
 * Tests the authorization logic and role change validation in changeUserRole.
 * Full integration tests require mocking Supabase and the database layer.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { UserRole } from '@/types/database';

// Mock the dependencies
vi.mock('@/lib/authz/guards', () => ({
  requireRole: vi.fn(),
}));

vi.mock('@/lib/db/queries/users', () => ({
  updateUserRole: vi.fn(),
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

import { changeUserRole } from '@/actions/users';
import { requireRole } from '@/lib/authz/guards';
import { updateUserRole } from '@/lib/db/queries/users';
import { AuthError } from '@/lib/errors';

describe('changeUserRole (Req 9.1, 9.3)', () => {
  const mockRequireRole = requireRole as Mock;
  const mockUpdateUserRole = updateUserRole as Mock;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('successful role changes', () => {
    it('changes role to ADMIN when caller has permission', async () => {
      // Arrange
      const userId = 'user-123';
      const newRole: UserRole = 'ADMIN';
      mockRequireRole.mockResolvedValue({
        id: 'admin-456',
        role: 'ADMIN',
      });
      mockUpdateUserRole.mockResolvedValue({
        id: userId,
        role: newRole,
        display_name: 'Test User',
        bio: null,
        avatar_url: null,
        created_at: '2024-01-01T00:00:00Z',
      });

      // Act
      const result = await changeUserRole(userId, newRole);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.user.id).toBe(userId);
        expect(result.user.role).toBe(newRole);
        expect(result.user.display_name).toBe('Test User');
      }
      expect(mockRequireRole).toHaveBeenCalledWith('user:manage');
      expect(mockUpdateUserRole).toHaveBeenCalledWith(userId, newRole);
    });

    it('changes role to EDITOR when caller has permission', async () => {
      // Arrange
      const userId = 'user-123';
      const newRole: UserRole = 'EDITOR';
      mockRequireRole.mockResolvedValue({ id: 'admin-456', role: 'ADMIN' });
      mockUpdateUserRole.mockResolvedValue({
        id: userId,
        role: newRole,
        display_name: 'Test User',
        bio: null,
        avatar_url: null,
        created_at: '2024-01-01T00:00:00Z',
      });

      // Act
      const result = await changeUserRole(userId, newRole);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.user.role).toBe('EDITOR');
      }
    });

    it('changes role to USER when caller has permission', async () => {
      // Arrange
      const userId = 'user-123';
      const newRole: UserRole = 'USER';
      mockRequireRole.mockResolvedValue({ id: 'admin-456', role: 'ADMIN' });
      mockUpdateUserRole.mockResolvedValue({
        id: userId,
        role: newRole,
        display_name: 'Test User',
        bio: null,
        avatar_url: null,
        created_at: '2024-01-01T00:00:00Z',
      });

      // Act
      const result = await changeUserRole(userId, newRole);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.user.role).toBe('USER');
      }
    });
  });

  describe('authorization failures (Req 9.1)', () => {
    it('returns error when caller is unauthenticated (401)', async () => {
      // Arrange
      mockRequireRole.mockRejectedValue(new AuthError('UNAUTHENTICATED', 401));

      // Act
      const result = await changeUserRole('user-123', 'ADMIN');

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Authentication required');
      }
      expect(mockUpdateUserRole).not.toHaveBeenCalled();
    });

    it('returns error when caller lacks user:manage permission (403)', async () => {
      // Arrange
      mockRequireRole.mockRejectedValue(new AuthError('FORBIDDEN', 403));

      // Act
      const result = await changeUserRole('user-123', 'ADMIN');

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Insufficient permissions');
      }
      expect(mockUpdateUserRole).not.toHaveBeenCalled();
    });
  });

  describe('validation failures', () => {
    it('rejects invalid role value', async () => {
      // Arrange
      mockRequireRole.mockResolvedValue({ id: 'admin-456', role: 'ADMIN' });

      // Act
      const result = await changeUserRole('user-123', 'INVALID' as UserRole);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Invalid role value');
      }
      expect(mockUpdateUserRole).not.toHaveBeenCalled();
    });
  });

  describe('database failures', () => {
    it('returns error when database update fails', async () => {
      // Arrange
      mockRequireRole.mockResolvedValue({ id: 'admin-456', role: 'ADMIN' });
      mockUpdateUserRole.mockRejectedValue(new Error('Database connection failed'));

      // Act
      const result = await changeUserRole('user-123', 'ADMIN');

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Failed to update user role');
      }
    });

    it('returns error when user not found', async () => {
      // Arrange
      mockRequireRole.mockResolvedValue({ id: 'admin-456', role: 'ADMIN' });
      mockUpdateUserRole.mockRejectedValue(new Error('User not found: user-123'));

      // Act
      const result = await changeUserRole('user-123', 'ADMIN');

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Failed to update user role');
      }
    });
  });
});
