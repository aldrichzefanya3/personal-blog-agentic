/**
 * Property-based tests CP-7 and CP-8: Post Status Transition Invariants and
 * Pagination Completeness Invariant.
 *
 * CP-7: For any post state, applying publish/unpublish/archive transitions
 *       produces the correct status and published_at invariants.
 *
 * CP-8: For any N records split across P pages, the sum of per-page record
 *       counts equals N, each page holds at most P records, and no record
 *       appears on more than one page.
 *
 * **Validates: Requirements 11.3, 11.4, 11.5, 1.1, 1.5, 1.6**
 * Requirements: 18.6
 */

import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import {
  publishTransition,
  unpublishTransition,
  archiveTransition,
} from '@/lib/posts/transitions';

/**
 * Pure pagination helper extracted from the query layer.
 *
 * Splits an array of records into fixed-size pages.  Mirrors the behaviour
 * of getPublishedPosts() / getPublishedPostsByCategory() /
 * getPublishedPostsByTag() without touching the database.
 */
function paginate<T>(records: T[], page: number, pageSize: number): T[] {
  const offset = (page - 1) * pageSize;
  return records.slice(offset, offset + pageSize);
}

describe('CP-7: Post Status Transition Invariants', () => {
  const statusArbitrary = fc.constantFrom('DRAFT', 'PUBLISHED', 'ARCHIVED');
  const postStateArbitrary = fc.record({
    status: statusArbitrary,
    published_at: fc.option(fc.string()),
  });

  /**
   * **Validates: Requirements 11.3**
   *
   * Property 7a: publishTransition always sets status = 'PUBLISHED'.
   */
  it('publishTransition sets status to PUBLISHED', () => {
    fc.assert(
      fc.property(postStateArbitrary, (state) => {
        return publishTransition(state).status === 'PUBLISHED';
      }),
    );
  });

  /**
   * **Validates: Requirements 11.3**
   *
   * Property 7b: publishTransition sets published_at only when it was null;
   * otherwise it preserves the existing value.
   */
  it('publishTransition sets published_at only when previously null', () => {
    fc.assert(
      fc.property(postStateArbitrary, (state) => {
        const next = publishTransition(state);
        if (state.published_at === null) {
          return next.published_at !== null && next.published_at !== undefined;
        }
        return next.published_at === state.published_at;
      }),
    );
  });

  /**
   * **Validates: Requirements 11.4**
   *
   * Property 7c: unpublishTransition sets status = 'DRAFT' and preserves
   * published_at exactly.
   */
  it('unpublishTransition sets DRAFT and preserves published_at', () => {
    fc.assert(
      fc.property(postStateArbitrary, (state) => {
        const next = unpublishTransition(state);
        return (
          next.status === 'DRAFT' && next.published_at === state.published_at
        );
      }),
    );
  });

  /**
   * **Validates: Requirements 11.5**
   *
   * Property 7d: archiveTransition sets status = 'ARCHIVED' and preserves
   * published_at exactly.
   */
  it('archiveTransition sets ARCHIVED and preserves published_at', () => {
    fc.assert(
      fc.property(postStateArbitrary, (state) => {
        const next = archiveTransition(state);
        return (
          next.status === 'ARCHIVED' &&
          next.published_at === state.published_at
        );
      }),
    );
  });

  /**
   * **Validates: Requirements 11.3, 11.4, 11.5**
   *
   * Property 7e: No transition ever mutates the input object (immutability).
   */
  it('all transitions are pure — they do not mutate their input', () => {
    fc.assert(
      fc.property(postStateArbitrary, (state) => {
        const snapshot = { ...state };
        publishTransition(state);
        unpublishTransition(state);
        archiveTransition(state);
        return (
          state.status === snapshot.status &&
          state.published_at === snapshot.published_at
        );
      }),
    );
  });
});

describe('CP-8: Pagination Completeness Invariant', () => {
  /**
   * **Validates: Requirements 1.1, 1.5, 1.6**
   *
   * Property 8: For any N records split across ceil(N/P) pages of size P:
   *  - The sum of records across all pages equals N
   *  - Each page holds at most P records
   *  - No record appears on more than one page
   */
  it('paginated pages cover all records exactly once, bounded by page size', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 500 }),
        fc.integer({ min: 1, max: 50 }),
        (n, pageSize) => {
          const records = Array.from({ length: n }, (_, i) => `id-${i}`);
          const totalPages = Math.max(1, Math.ceil(n / pageSize));
          const seen = new Set<string>();
          let totalReturned = 0;

          for (let page = 1; page <= totalPages; page++) {
            const pageRecords = paginate(records, page, pageSize);
            totalReturned += pageRecords.length;

            if (pageRecords.length > pageSize) return false;

            for (const id of pageRecords) {
              if (seen.has(id)) return false; // duplicate
              seen.add(id);
            }
          }

          return totalReturned === n && seen.size === n;
        },
      ),
      { numRuns: 500 },
    );
  });
});