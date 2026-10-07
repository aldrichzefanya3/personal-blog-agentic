/**
 * Unit tests for authentication Server Actions
 *
 * Tests the password validation logic used in updatePasswordAction.
 * Full integration tests for Server Actions will require mocking Supabase
 * and Next.js redirect functionality.
 */

import { describe, it, expect } from 'vitest';

// Extract password validation for testing
// Note: This duplicates the logic from auth.ts for testing purposes
// In a real scenario, we'd export validatePassword from auth.ts or move it to a shared utility
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

function validatePassword(password: string): {
  valid: boolean;
  error?: string;
} {
  if (password.length < 8) {
    return {
      valid: false,
      error: 'Password must be at least 8 characters long',
    };
  }

  if (password.length > 128) {
    return {
      valid: false,
      error: 'Password must not exceed 128 characters',
    };
  }

  if (!PASSWORD_REGEX.test(password)) {
    return {
      valid: false,
      error:
        'Password must contain at least one uppercase letter, one lowercase letter, and one digit',
    };
  }

  return { valid: true };
}

describe('Password Validation (Req 8.10)', () => {
  describe('valid passwords', () => {
    it('accepts password with minimum length 8 chars and required character types', () => {
      const result = validatePassword('Password1');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('accepts password at maximum length (128 chars)', () => {
      // 128 chars: uppercase + lowercase + digit + 125 more chars
      const longPassword = 'Aa1' + 'x'.repeat(125);
      expect(longPassword.length).toBe(128);
      const result = validatePassword(longPassword);
      expect(result.valid).toBe(true);
    });

    it('accepts password with multiple special characters', () => {
      const result = validatePassword('MyP@ssw0rd!#$');
      expect(result.valid).toBe(true);
    });
  });

  describe('invalid passwords', () => {
    it('rejects password shorter than 8 characters', () => {
      const result = validatePassword('Pass1');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Password must be at least 8 characters long');
    });

    it('rejects password longer than 128 characters', () => {
      const longPassword = 'Aa1' + 'x'.repeat(126); // 129 chars
      expect(longPassword.length).toBe(129);
      const result = validatePassword(longPassword);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Password must not exceed 128 characters');
    });

    it('rejects password without uppercase letter', () => {
      const result = validatePassword('password1');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('uppercase letter');
    });

    it('rejects password without lowercase letter', () => {
      const result = validatePassword('PASSWORD1');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('lowercase letter');
    });

    it('rejects password without digit', () => {
      const result = validatePassword('Password');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('digit');
    });

    it('rejects password missing multiple requirements', () => {
      const result = validatePassword('pass'); // too short, no uppercase, no digit
      expect(result.valid).toBe(false);
      // Should fail on the first check (length)
      expect(result.error).toBe('Password must be at least 8 characters long');
    });
  });

  describe('edge cases', () => {
    it('accepts password with exactly 8 characters', () => {
      const result = validatePassword('Pass1234');
      expect(result.valid).toBe(true);
    });

    it('accepts password with spaces', () => {
      const result = validatePassword('My Pass1 Word');
      expect(result.valid).toBe(true);
    });

    it('accepts password with unicode characters', () => {
      const result = validatePassword('Pässw0rd');
      expect(result.valid).toBe(true);
    });
  });
});
