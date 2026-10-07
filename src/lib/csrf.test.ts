/**
 * CSRF token generation and verification tests.
 *
 * Task 21.1 - Requirements 15.6, 15.7
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { verifyCsrfToken, generateCsrfToken, getCsrfToken } from './csrf';

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

describe('CSRF Token Generation', () => {
  let mockCookies: Map<string, { value: string }>;
  let mockCookieStore: {
    get: (name: string) => { value: string } | undefined;
    set: (
      name: string,
      value: string,
      options?: Record<string, unknown>,
    ) => void;
    delete: (name: string) => void;
  };

  beforeEach(() => {
    mockCookies = new Map();
    mockCookieStore = {
      get: (name: string) => mockCookies.get(name),
      set: (name: string, value: string) => {
        mockCookies.set(name, { value });
      },
      delete: (name: string) => {
        mockCookies.delete(name);
      },
    };

    const { cookies } = require('next/headers');
    cookies.mockResolvedValue(mockCookieStore);
  });

  it('should generate a hex-encoded token', async () => {
    const token = await generateCsrfToken();

    // Token should be a hex string (64 characters for 32 bytes)
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('should store the token in a non-HttpOnly cookie', async () => {
    const token = await generateCsrfToken();

    // Check that the token was stored
    const storedToken = mockCookies.get('csrf_token');
    expect(storedToken?.value).toBe(token);
  });

  it('should generate different tokens on each call', async () => {
    const token1 = await generateCsrfToken();
    const token2 = await generateCsrfToken();

    expect(token1).not.toBe(token2);
  });

  it('should return existing token if present', async () => {
    // Set an existing token
    const existingToken =
      'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2';
    mockCookies.set('csrf_token', { value: existingToken });

    const token = await getCsrfToken();
    expect(token).toBe(existingToken);
  });

  it('should generate a new token if none exists', async () => {
    const token = await getCsrfToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('CSRF Token Verification', () => {
  let mockCookies: Map<string, { value: string }>;
  let mockCookieStore: {
    get: (name: string) => { value: string } | undefined;
    set: (
      name: string,
      value: string,
      options?: Record<string, unknown>,
    ) => void;
    delete: (name: string) => void;
  };

  beforeEach(() => {
    mockCookies = new Map();
    mockCookieStore = {
      get: (name: string) => mockCookies.get(name),
      set: (name: string, value: string) => {
        mockCookies.set(name, { value });
      },
      delete: (name: string) => {
        mockCookies.delete(name);
      },
    };

    const { cookies } = require('next/headers');
    cookies.mockResolvedValue(mockCookieStore);
  });

  it('should verify a valid token submitted via header', async () => {
    const token =
      'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2';
    mockCookies.set('csrf_token', { value: token });

    const request = new NextRequest('http://localhost:8000/api/test', {
      method: 'POST',
      headers: {
        'x-csrf-token': token,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ data: 'test' }),
    });

    const isValid = await verifyCsrfToken(request);
    expect(isValid).toBe(true);
  });

  it('should verify a valid token submitted via JSON body', async () => {
    const token =
      'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2';
    mockCookies.set('csrf_token', { value: token });

    const request = new NextRequest('http://localhost:8000/api/test', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ csrf_token: token, data: 'test' }),
    });

    const isValid = await verifyCsrfToken(request);
    expect(isValid).toBe(true);
  });

  it('should reject when no token is in cookie', async () => {
    // No cookie set
    const request = new NextRequest('http://localhost:8000/api/test', {
      method: 'POST',
      headers: {
        'x-csrf-token': 'sometoken',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ data: 'test' }),
    });

    const isValid = await verifyCsrfToken(request);
    expect(isValid).toBe(false);
  });

  it('should reject when no token is submitted', async () => {
    const token =
      'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2';
    mockCookies.set('csrf_token', { value: token });

    const request = new NextRequest('http://localhost:8000/api/test', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ data: 'test' }),
    });

    const isValid = await verifyCsrfToken(request);
    expect(isValid).toBe(false);
  });

  it('should reject when tokens do not match', async () => {
    const cookieToken =
      'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2';
    const submittedToken =
      'b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3';
    mockCookies.set('csrf_token', { value: cookieToken });

    const request = new NextRequest('http://localhost:8000/api/test', {
      method: 'POST',
      headers: {
        'x-csrf-token': submittedToken,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ data: 'test' }),
    });

    const isValid = await verifyCsrfToken(request);
    expect(isValid).toBe(false);
  });

  it('should reject invalid hex tokens', async () => {
    mockCookies.set('csrf_token', { value: 'invalid-token' });

    const request = new NextRequest('http://localhost:8000/api/test', {
      method: 'POST',
      headers: {
        'x-csrf-token': 'invalid-token',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ data: 'test' }),
    });

    const isValid = await verifyCsrfToken(request);
    expect(isValid).toBe(false);
  });

  it('should handle form-urlencoded submission', async () => {
    const token =
      'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2';
    mockCookies.set('csrf_token', { value: token });

    const formData = new URLSearchParams();
    formData.append('csrf_token', token);
    formData.append('data', 'test');

    const request = new NextRequest('http://localhost:8000/api/test', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const isValid = await verifyCsrfToken(request);
    expect(isValid).toBe(true);
  });
});
