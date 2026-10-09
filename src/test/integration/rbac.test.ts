/**
 * Integration tests for RBAC enforcement on admin routes (Task 24.2).
 *
 * These tests exercise the real `requireRole()` / `requireOwnership()` guards
 * by mocking the session source (`getServerSession`) and the authorization
 * check (`isAuthorized`), then asserting the correct HTTP-equivalent error
 * is thrown for each scenario:
 *  - EDITOR requesting /admin/settings → FORBIDDEN (403)
 *  - USER role requesting any /admin/** route → FORBIDDEN (403)
 *  - Unauthenticated request to a role-required route → UNAUTHENTICATED (401)
 *
 * Requirements: 9.4, 9.8, 18.2, 18.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireRole, requireOwnership } from '@/lib/authz/guards';
import { AuthError } from '@/lib/errors';
import type { SessionUser } from '@/lib/auth/session';

const { mockSession } = vi.hoisted(() => ({
  mockSession: { current: null as SessionUser | null },
}));

vi.mock('@/lib/auth/session', () => ({
  getServerSession: vi.fn(async () => mockSession.current),
}));

vi.mock('@/lib/authz/roles', async () => {
  const actual = await vi.importActual<typeof import('@/lib/authz/roles')>(
    '@/lib/authz/roles',
  );
  return {
    ...actual,
    isAuthorized: vi.fn((role: string, action: string) =>
      actual.isAuthorized(role as never, action as never),
    ),
  };
});

import { isAuthorized } from '@/lib/authz/roles';

describe('RBAC Enforcement — Integration (Req 9.4, 9.8, 18.2, 18.5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession.current = null;
  });

  const editorSession: SessionUser = {
    id: 'editor-1',
    email: 'editor@example.com',
    role: 'EDITOR',
    display_name: 'Editor',
    bio: null,
    avatar_url: null,
    created_at: '2024-01-01T00:00:00Z',
  };

  const userSession: SessionUser = {
    id: 'user-1',
    email: 'user@example.com',
    role: 'AI_WRITER',
    display_name: 'Regular User',
    bio: null,
    avatar_url: null,
    created_at: '2024-01-01T00:00:00Z',
  };

  it('EDITOR requesting user:manage returns FORBIDDEN 403 (Req 18.5)', async () => {
    mockSession.current = editorSession;

    await expect(requireRole('user:manage')).rejects.toMatchObject({
      code: 'FORBIDDEN',
      statusCode: 403,
    });
    expect(isAuthorized).toHaveBeenCalledWith('EDITOR', 'user:manage');
  });

  it('USER role requesting any /admin/** action returns FORBIDDEN 403 (Req 9.4)', async () => {
    mockSession.current = userSession;

    await expect(requireRole('post:create')).rejects.toMatchObject({
      code: 'FORBIDDEN',
      statusCode: 403,
    });
  });

  it('unauthenticated request to role-required route returns UNAUTHENTICATED 401 (Req 9.8)', async () => {
    mockSession.current = null;

    await expect(requireRole('post:create')).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
      statusCode: 401,
    });
    // Authorization check must not run when there is no session.
    expect(isAuthorized).not.toHaveBeenCalled();
  });

  it('EDITOR can perform post:create but not post:delete:any (Req 9.5)', async () => {
    mockSession.current = editorSession;

    // Allowed
    const allowed = await requireRole('post:create');
    expect(allowed).toEqual(editorSession);

    // Denied
    await expect(requireRole('post:delete:any')).rejects.toMatchObject({
      code: 'FORBIDDEN',
      statusCode: 403,
    });
  });

  it('requireOwnership enforces ownership for non-ADMIN users (Req 9.4)', async () => {
    mockSession.current = editorSession;

    // Own resource → allowed
    const owned = await requireOwnership('editor-1', 'post:edit');
    expect(owned).toEqual(editorSession);

    // Someone else's resource → FORBIDDEN
    await expect(requireOwnership('someone-else', 'post:edit')).rejects.toMatchObject(
      { code: 'FORBIDDEN', statusCode: 403 },
    );
  });

  it('ADMIN bypasses ownership check (Req 9.5)', async () => {
    const adminSession: SessionUser = {
      ...editorSession,
      id: 'admin-1',
      role: 'ADMIN',
    };
    mockSession.current = adminSession;

    const result = await requireOwnership('someone-else', 'post:edit');
    expect(result).toEqual(adminSession);
  });

  it('AuthError carries the correct HTTP status code', async () => {
    mockSession.current = null;
    try {
      await requireRole('post:create');
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AuthError);
      expect((err as AuthError).statusCode).toBe(401);
      expect((err as AuthError).code).toBe('UNAUTHENTICATED');
    }
  });
});