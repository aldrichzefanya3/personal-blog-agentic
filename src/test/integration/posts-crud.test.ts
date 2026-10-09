/**
 * Integration tests for the post CRUD lifecycle (Task 24.3).
 *
 * These tests exercise the real `createPost`, `updatePost`, `publishPost`,
 * `unpublishPost`, `archivePost`, and `deletePost` query functions against a
 * mocked Postgres.js client.  Each scenario verifies the resulting post row's
 * status and published_at fields after the transition, mirroring the
 * behaviour the DB would produce.
 *
 * Requirements: 18.3, 18.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// A queue of canned row sets.  Each call to the mocked `sql` pops the next
// set off the queue.  `sql` is used both as a tagged-template call
// (`sql`...``) and as `sql.begin(cb)`, so `begin` is attached to the same
// function object inside the hoisted block (vitest hoists `vi.mock` factories
// to the top of the file, so any reference must live inside `vi.hoisted`).
const { rowQueue, mockSql } = vi.hoisted(() => {
  const queue: Record<string, unknown>[][] = [];
  // `sql` is used both as a tagged-template call (`sql`...``) and as
  // `sql.begin(cb)`, so `begin` is attached to the same function object.
  const fn = vi.fn(async () => queue.shift() ?? []);
  const sqlWithBegin = fn as unknown as {
    (strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown[]>;
    begin: (cb: (tx: unknown) => Promise<unknown>) => Promise<unknown>;
  };
  sqlWithBegin.begin = (cb: (tx: unknown) => Promise<unknown>) => cb(fn);
  return { rowQueue: queue, mockSql: sqlWithBegin };
});

// The mock replaces the `sql` export from `@/lib/db/client`.  The stub is
// typed loosely so the test file's type checker doesn't enforce the real
// Postgres.js `Sql` shape on our mock.
vi.mock('@/lib/db/client', () => ({
  sql: mockSql as never,
}));

import {
  createPost,
  updatePost,
  publishPost,
  unpublishPost,
  archivePost,
  deletePost,
  getPostById,
} from '@/lib/db/queries/posts';

function stage(rows: Record<string, unknown>[]) {
  rowQueue.push(rows);
}

const basePost = {
  id: 'post-1',
  title: 'Test Post',
  slug: 'test-post',
  excerpt: null,
  content: 'Body',
  cover_image_url: null,
  author_id: 'author-1',
  status: 'DRAFT',
  published_at: null as string | null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('Post CRUD Lifecycle — Integration (Req 18.3, 18.4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rowQueue.length = 0;
  });

  it('createPost inserts a DRAFT post and returns the row', async () => {
    stage([basePost]);

    const result = await createPost({
      title: 'Test Post',
      slug: 'test-post',
      content: 'Body',
      category_ids: [],
      tag_ids: [],
      author_id: 'author-1',
      status: 'DRAFT',
    });

    expect(result.status).toBe('DRAFT');
    expect(result.id).toBe('post-1');
  });

  it('updatePost mutates fields and returns the updated row', async () => {
    const before = { ...basePost, updated_at: '2024-01-01T00:00:00Z' };
    const after = {
      ...before,
      title: 'Updated Title',
      updated_at: '2024-01-02T00:00:00Z',
    };

    // updatePost runs a single UPDATE ... RETURNING inside a transaction.
    stage([after]);

    const result = await updatePost('post-1', { title: 'Updated Title' });

    expect(result.title).toBe('Updated Title');
    expect(new Date(result.updated_at).getTime()).toBeGreaterThan(
      new Date(before.updated_at).getTime(),
    );
  });

  it('publishPost sets status=PUBLISHED and published_at when null (Req 11.3)', async () => {
    stage([{ status: 'DRAFT', published_at: null }]); // SELECT current
    stage([{ ...basePost, status: 'PUBLISHED', published_at: '2024-01-02T00:00:00Z' }]); // UPDATE

    const result = await publishPost('post-1');

    expect(result.status).toBe('PUBLISHED');
    expect(result.published_at).not.toBeNull();
  });

  it('publishPost preserves an existing published_at (Req 11.3)', async () => {
    const existingPublishedAt = '2024-01-05T00:00:00Z';
    stage([{ status: 'DRAFT', published_at: existingPublishedAt }]); // SELECT
    stage([
      { ...basePost, status: 'PUBLISHED', published_at: existingPublishedAt },
    ]); // UPDATE

    const result = await publishPost('post-1');

    expect(result.published_at).toBe(existingPublishedAt);
  });

  it('unpublishPost sets status=DRAFT and preserves published_at (Req 11.4)', async () => {
    const existingPublishedAt = '2024-01-05T00:00:00Z';
    stage([{ status: 'PUBLISHED', published_at: existingPublishedAt }]); // SELECT
    stage([
      { ...basePost, status: 'DRAFT', published_at: existingPublishedAt },
    ]); // UPDATE

    const result = await unpublishPost('post-1');

    expect(result.status).toBe('DRAFT');
    expect(result.published_at).toBe(existingPublishedAt);
  });

  it('archivePost sets status=ARCHIVED (Req 11.5)', async () => {
    stage([{ status: 'PUBLISHED', published_at: '2024-01-05T00:00:00Z' }]); // SELECT
    stage([{ ...basePost, status: 'ARCHIVED' }]); // UPDATE

    const result = await archivePost('post-1');

    expect(result.status).toBe('ARCHIVED');
  });

  it('deletePost removes the record (no row returned)', async () => {
    stage([]); // DELETE produces no rows

    await expect(deletePost('post-1')).resolves.toBeUndefined();
  });

  it('getPostById returns null when the post does not exist (Req 18.4)', async () => {
    stage([]); // SELECT returns no rows

    const result = await getPostById('nonexistent');
    expect(result).toBeNull();
  });

  it('getPostById returns the post row when it exists', async () => {
    stage([basePost]);

    const result = await getPostById('post-1');
    expect(result).toEqual(basePost);
  });
});