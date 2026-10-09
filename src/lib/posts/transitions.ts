/**
 * Pure post-status transition functions.
 *
 * These are extracted from the mutation layer so they can be tested directly
 * without a database (used by property-based test CP-7).
 *
 * Each function takes an immutable snapshot of a post's mutable fields and
 * returns the new status / published_at values that the corresponding DB
 * mutation would produce.  They contain no I/O and no side effects.
 *
 * Requirements: 11.3, 11.4, 11.5
 */

export interface PostState {
  status: string;
  published_at: string | null;
}

/**
 * publishPost transition (Req 11.3).
 *
 * Sets status = 'PUBLISHED'.  Sets published_at = now() ONLY when it is
 * currently NULL; otherwise preserves the existing published_at value.
 */
export function publishTransition(state: PostState): PostState {
  return {
    status: 'PUBLISHED',
    published_at: state.published_at ?? new Date().toISOString(),
  };
}

/**
 * unpublishPost transition (Req 11.4).
 *
 * Sets status = 'DRAFT'.  Does NOT touch published_at — the original
 * publication timestamp is preserved so the post can be re-published later
 * without losing its first publish date.
 */
export function unpublishTransition(state: PostState): PostState {
  return {
    status: 'DRAFT',
    published_at: state.published_at,
  };
}

/**
 * archivePost transition (Req 11.5).
 *
 * Sets status = 'ARCHIVED'.  published_at is left untouched.
 */
export function archiveTransition(state: PostState): PostState {
  return {
    status: 'ARCHIVED',
    published_at: state.published_at,
  };
}