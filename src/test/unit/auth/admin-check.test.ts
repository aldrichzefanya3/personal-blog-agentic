/**
 * Unit tests for admin-check utility (Task 11.3)
 *
 * Tests the hasAdminUser() function that checks if any ADMIN role user exists.
 * Requirements: 8.1, 9.1, 17.1
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { hasAdminUser } from '@/lib/auth/admin-check';

const { mockSql } = vi.hoisted(() => ({
  mockSql: vi.fn(),
}));

// Mock the database client
vi.mock('@/lib/db/client', () => ({
  sql: mockSql,
}));

describe('hasAdminUser', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return true when at least one admin user exists', async () => {
    // Mock database response with count = 1
    mockSql.mockResolvedValueOnce([{ count: '1' }]);

    const result = await hasAdminUser();

    expect(result).toBe(true);
    expect(mockSql).toHaveBeenCalledTimes(1);
  });

  it('should return true when multiple admin users exist', async () => {
    // Mock database response with count = 3
    mockSql.mockResolvedValueOnce([{ count: '3' }]);

    const result = await hasAdminUser();

    expect(result).toBe(true);
    expect(mockSql).toHaveBeenCalledTimes(1);
  });

  it('should return false when no admin users exist', async () => {
    // Mock database response with count = 0
    mockSql.mockResolvedValueOnce([{ count: '0' }]);

    const result = await hasAdminUser();

    expect(result).toBe(false);
    expect(mockSql).toHaveBeenCalledTimes(1);
  });

  it('should correctly parse count as integer', async () => {
    // Mock database response with count as string '5'
    mockSql.mockResolvedValueOnce([{ count: '5' }]);

    const result = await hasAdminUser();

    expect(result).toBe(true);
  });
});
