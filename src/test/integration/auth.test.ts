/**
 * Integration tests for the middleware auth guard (Task 24.1).
 *
 * These tests exercise the real `middleware()` function with mocked
 * dependencies:
 *  - `@supabase/ssr`'s `createServerClient` is replaced with a factory that
 *    returns a stub whose `auth.getUser()` resolves to a controlled value.
 *  - `next/server`'s `NextResponse` is the real implementation.
 *
 * Scenarios:
 *  - Unauthenticated GET /admin/** → HTTP 307 redirect to /auth/login
 *  - Authenticated GET /admin/** → passes through (no redirect)
 *  - Expired/invalid session → redirect to sign-in
 *
 * Requirements: 18.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Capture the Supabase user returned by the mocked auth client.
const { supabaseUser, mockCreateServerClient, mockGetUser } = vi.hoisted(() => ({
  supabaseUser: { id: null as string | null },
  mockGetUser: vi.fn(async (): Promise<{ data: { user: unknown }; error: Error | null }> => {
    // When the configured user id is null, treat the session as absent.
    const user = supabaseUser.id ? supabaseUser : null;
    return { data: { user }, error: null };
  }),
  mockCreateServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => mockCreateServerClient(),
}));

// Import the middleware AFTER the mock is registered.
const { middleware } = await import('../../../middleware');

/**
 * Build a minimal NextRequest-like object that middleware.ts expects.
 * Only the fields middleware.ts actually reads are implemented:
 *  - nextUrl.pathname
 *  - url (used to build the redirect target)
 *  - cookies.getAll()
 *  - cookies.set()
 */
function makeRequest(pathname: string, cookies: Record<string, string> = {}) {
  const url = `https://example.com${pathname}`;
  const cookieStore = new Map<string, string>(Object.entries(cookies));

  return {
    nextUrl: { pathname },
    url,
    cookies: {
      getAll: () =>
        Array.from(cookieStore.entries()).map(([name, value]) => ({ name, value })),
      set: (name: string, value: string) => cookieStore.set(name, value),
    },
  } as unknown as import('next/server').NextRequest;
}

describe('Middleware — Auth Guard (Req 18.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseUser.id = null;
  });

  it('redirects unauthenticated /admin/** requests to /auth/login', async () => {
    const request = makeRequest('/admin');
    const response = await middleware(request);

    // Middleware returns a redirect response (status 307/302).
    expect(response.status).toBe(307);
    const location = response.headers.get('location') ?? '';
    expect(location).toContain('/auth/login');
    expect(location).toContain('redirectTo=');
    expect(decodeURIComponent(location)).toContain('redirectTo=/admin');
  });

  it('passes through authenticated /admin/** requests (no redirect)', async () => {
    supabaseUser.id = 'user-authenticated';
    const request = makeRequest('/admin/posts');
    const response = await middleware(request);

    // A passthrough response has status 200 (NextResponse.next default).
    expect(response.status).toBe(200);
    // Security headers must still be set on the passthrough response.
    expect(response.headers.get('Content-Security-Policy')).not.toBeNull();
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
  });

  it('redirects requests with an invalid/expired session to sign-in', async () => {
    // Simulate an auth error (expired token).
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: new Error('Token expired'),
    });
    const request = makeRequest('/admin');
    const response = await middleware(request);

    expect(response.status).toBe(307);
    const location = response.headers.get('location') ?? '';
    expect(location).toContain('/auth/login');
  });

  it('does not redirect public (non-admin) routes even when unauthenticated', async () => {
    supabaseUser.id = null;
    const request = makeRequest('/');
    const response = await middleware(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });
});