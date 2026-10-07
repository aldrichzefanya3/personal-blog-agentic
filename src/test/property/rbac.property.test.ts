// src/test/property/rbac.property.test.ts
// Property-based tests for CP-6: RBAC — Role Permission Invariant
// Validates: Requirements 9.1, 9.2, 9.3, 9.5

import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { isAuthorized, ROLE_PERMISSIONS, type Action } from '@/lib/authz/roles';

/**
 * All discrete actions defined in the system.
 * Derived at runtime from ROLE_PERMISSIONS['ADMIN'] to stay in sync with the source of truth.
 */
const allActions: Action[] = Array.from(ROLE_PERMISSIONS['ADMIN']) as Action[];

/**
 * Actions that are ADMIN-only (not available to EDITOR or USER).
 */
const adminOnlyActions: Action[] = allActions.filter(
  (action) => !ROLE_PERMISSIONS['EDITOR'].has(action),
);

/**
 * Property 6: RBAC — Role Permission Invariant
 *
 * For any action in the system:
 *   - USER returns false for all actions
 *   - EDITOR returns false for ADMIN-only actions
 *
 * This invariant holds regardless of the order in which permissions are checked.
 */
describe('CP-6: RBAC — Role Permission Invariant', () => {
  /**
   * **Validates: Requirements 9.1, 9.2, 9.3, 9.5**
   *
   * Property 6a: USER role is denied every action without exception.
   */
  it('Property 6a: USER is denied every action (Req 9.1, 9.2, 9.3, 9.5)', () => {
    fc.assert(
      fc.property(fc.constantFrom(...allActions), (action) => {
        return isAuthorized('USER', action) === false;
      }),
    );
  });

  /**
   * **Validates: Requirements 9.1, 9.2, 9.3, 9.5**
   *
   * Property 6b: EDITOR role is denied all ADMIN-only actions.
   * ADMIN-only actions are those not present in the EDITOR permission set.
   */
  it('Property 6b: EDITOR is denied all ADMIN-only actions (Req 9.1, 9.2, 9.3, 9.5)', () => {
    fc.assert(
      fc.property(fc.constantFrom(...adminOnlyActions), (action) => {
        return isAuthorized('EDITOR', action) === false;
      }),
    );
  });

  /**
   * **Validates: Requirements 9.1, 9.2, 9.3, 9.5**
   *
   * Property 6c: isAuthorized is a pure function — repeated calls with the same arguments
   * always return the same result and never mutate ROLE_PERMISSIONS.
   */
  it('Property 6c: isAuthorized is pure — no side effects on repeated calls (Req 9.1, 9.5)', () => {
    fc.assert(
      fc.property(fc.constantFrom(...allActions), (action) => {
        const adminSizeBefore = ROLE_PERMISSIONS['ADMIN'].size;
        const editorSizeBefore = ROLE_PERMISSIONS['EDITOR'].size;
        const userSizeBefore = ROLE_PERMISSIONS['USER'].size;

        // Call multiple times in different orders
        const r1 = isAuthorized('USER', action);
        const r2 = isAuthorized('EDITOR', action);
        const r3 = isAuthorized('USER', action);

        return (
          r1 === r3 && // deterministic for USER
          ROLE_PERMISSIONS['ADMIN'].size === adminSizeBefore &&
          ROLE_PERMISSIONS['EDITOR'].size === editorSizeBefore &&
          ROLE_PERMISSIONS['USER'].size === userSizeBefore &&
          r2 !== undefined // EDITOR result is defined
        );
      }),
    );
  });
});
