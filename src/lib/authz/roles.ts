// src/lib/authz/roles.ts
// Role definitions and authorization check (Requirements 9.1, 9.2, 9.3, 9.5)

import type { UserRole } from '@/types/database';

/**
 * All discrete actions that can be performed in the admin panel.
 * Each action maps to a specific capability guarded by RBAC (CP-6).
 */
export type Action =
  | 'post:create'
  | 'post:edit'
  | 'post:delete'
  | 'post:edit:any' // edit any post (ADMIN only)
  | 'post:delete:any' // delete any post (ADMIN only)
  | 'category:write'
  | 'tag:write'
  | 'media:upload'
  | 'media:delete:any'
  | 'user:manage'
  | 'settings:manage';

/**
 * Defines the set of actions permitted for each role.
 *
 * - ADMIN: full access to all 11 actions
 * - EDITOR: post/category/tag/media operations, but not user management or settings
 */
export const ROLE_PERMISSIONS: Record<UserRole, Set<Action>> = {
  ADMIN: new Set([
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
  ]),
  EDITOR: new Set([
    'post:create',
    'post:edit',
    'post:delete',
    'category:write',
    'tag:write',
    'media:upload',
  ]),
  AI_WRITER: new Set(),
};

/**
 * Pure authorization check — no side effects.
 *
 * Returns true if the given role is permitted to perform the given action.
 * Returns false for any unknown role (defensive fallback).
 *
 * @param role   - The user's role from the database
 * @param action - The action being attempted
 */
export function isAuthorized(role: UserRole, action: Action): boolean {
  return ROLE_PERMISSIONS[role]?.has(action) ?? false;
}
