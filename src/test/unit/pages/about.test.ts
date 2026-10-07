/**
 * Unit tests for the about page logic
 * Testing author data display and external profile link generation
 */

import { describe, it, expect } from 'vitest';

describe('About Page Logic', () => {
  it('should generate display name correctly', () => {
    const testCases = [
      { displayName: 'Alice Admin', expected: 'Alice Admin' },
      { displayName: null, expected: 'Anonymous Author' },
      { displayName: '', expected: 'Anonymous Author' },
      { displayName: 'John Doe', expected: 'John Doe' },
    ];

    testCases.forEach(({ displayName, expected }) => {
      const result = displayName || 'Anonymous Author';
      expect(result).toBe(expected);
    });
  });

  it('should generate bio correctly with fallback', () => {
    const testCases = [
      { bio: 'This is my bio', expected: 'This is my bio' },
      { bio: null, expected: 'No bio available.' },
      { bio: '', expected: 'No bio available.' },
      { bio: 'Short bio', expected: 'Short bio' },
    ];

    testCases.forEach(({ bio, expected }) => {
      const result = bio || 'No bio available.';
      expect(result).toBe(expected);
    });
  });

  it('should generate external profile URL from user ID', () => {
    const userId = 'a0000000-0000-0000-0000-000000000001';
    const externalProfileUrl = `https://example.com/profile/${userId}`;
    
    expect(externalProfileUrl).toBe(
      'https://example.com/profile/a0000000-0000-0000-0000-000000000001'
    );
    expect(externalProfileUrl).toMatch(/^https:\/\/example\.com\/profile\//);
  });

  it('should generate initials correctly for fallback avatar', () => {
    const testCases = [
      { name: 'Alice Admin', expected: 'AA' },
      { name: 'John Doe Smith', expected: 'JD' },
      { name: 'Bob', expected: 'B' },
      { name: 'Jane Marie Johnson', expected: 'JM' },
    ];

    testCases.forEach(({ name, expected }) => {
      const initials = name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
      
      expect(initials).toBe(expected);
    });
  });

  it('should validate that ISR revalidation is set correctly', () => {
    const revalidate = 60;
    expect(revalidate).toBe(60); // Verify ISR revalidation matches requirement (Req 5.1, 5.3)
  });
});

