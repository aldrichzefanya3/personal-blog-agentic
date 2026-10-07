// src/test/unit/authz/roles.test.ts
// Unit tests for isAuthorized(), Action type, and ROLE_PERMISSIONS
// Requirements: 9.1, 9.2, 9.3, 9.5

import { describe, it, expect } from 'vitest';
import { isAuthorized, ROLE_PERMISSIONS, type Action } from '@/lib/authz/roles';
import type { UserRole } from '@/types/database';

// All 11 defined actions
const ALL_ACTIONS: Action[] = [
  'post:create',
  'post:edit',
  'post:delete',
  'post:edit:any',
  'post:delete:any',
  'category:write',
  'tag:write',
  'media:upload',
  'media:delete:any',
  'user:manage',
  'settings:manage',
];

// Actions that EDITOR is permitted to perform
const EDITOR_ALLOWED_ACTIONS: Action[] = [
  'post:create',
  'post:edit',
  'post:delete',
  'category:write',
  'tag:write',
  'media:upload',
];

// Actions that EDITOR must NOT be permitted to perform
const EDITOR_DENIED_ACTIONS: Action[] = [
  'post:edit:any',
  'post:delete:any',
  'media:delete:any',
  'user:manage',
  'settings:manage',
];

describe('ROLE_PERMISSIONS', () => {
  it('defines permissions for both supported roles', () => {
    const roles: UserRole[] = ['ADMIN', 'EDITOR'];
    for (const role of roles) {
      expect(ROLE_PERMISSIONS).toHaveProperty(role);
      expect(ROLE_PERMISSIONS[role]).toBeInstanceOf(Set);
    }
  });

  it('ADMIN has all 11 actions', () => {
    const adminPerms = ROLE_PERMISSIONS['ADMIN'];
    expect(adminPerms.size).toBe(11);
    for (const action of ALL_ACTIONS) {
      expect(adminPerms.has(action)).toBe(true);
    }
  });

  it('EDITOR has exactly 6 permitted actions', () => {
    const editorPerms = ROLE_PERMISSIONS['EDITOR'];
    expect(editorPerms.size).toBe(6);
  });

  it('EDITOR has all post/category/tag/media actions', () => {
    const editorPerms = ROLE_PERMISSIONS['EDITOR'];
    for (const action of EDITOR_ALLOWED_ACTIONS) {
      expect(
        editorPerms.has(action),
        `EDITOR should have action: ${action}`,
      ).toBe(true);
    }
  });

  it('EDITOR does not have *:any actions, user:manage, or settings:manage', () => {
    const editorPerms = ROLE_PERMISSIONS['EDITOR'];
    for (const action of EDITOR_DENIED_ACTIONS) {
      expect(
        editorPerms.has(action),
        `EDITOR must not have action: ${action}`,
      ).toBe(false);
    }
  });

});

describe('isAuthorized()', () => {
  // ADMIN
  describe('ADMIN role', () => {
    it('is authorized for every action', () => {
      for (const action of ALL_ACTIONS) {
        expect(
          isAuthorized('ADMIN', action),
          `ADMIN should be authorized for: ${action}`,
        ).toBe(true);
      }
    });
  });

  // EDITOR
  describe('EDITOR role', () => {
    it('is authorized for allowed actions', () => {
      for (const action of EDITOR_ALLOWED_ACTIONS) {
        expect(
          isAuthorized('EDITOR', action),
          `EDITOR should be authorized for: ${action}`,
        ).toBe(true);
      }
    });

    it('is NOT authorized for denied actions', () => {
      for (const action of EDITOR_DENIED_ACTIONS) {
        expect(
          isAuthorized('EDITOR', action),
          `EDITOR must not be authorized for: ${action}`,
        ).toBe(false);
      }
    });

    it('is NOT authorized for user:manage (Req 9.1)', () => {
      expect(isAuthorized('EDITOR', 'user:manage')).toBe(false);
    });

    it('is NOT authorized for settings:manage (Req 9.1)', () => {
      expect(isAuthorized('EDITOR', 'settings:manage')).toBe(false);
    });
  });

  // Pure function behaviour
  describe('pure function invariants', () => {
    it('returns the same result on repeated calls (no side effects)', () => {
      const first = isAuthorized('EDITOR', 'post:create');
      const second = isAuthorized('EDITOR', 'post:create');
      expect(first).toBe(second);
    });

    it('does not mutate ROLE_PERMISSIONS when called', () => {
      const beforeSize = ROLE_PERMISSIONS['EDITOR'].size;
      isAuthorized('EDITOR', 'user:manage');
      expect(ROLE_PERMISSIONS['EDITOR'].size).toBe(beforeSize);
    });
  });
});
