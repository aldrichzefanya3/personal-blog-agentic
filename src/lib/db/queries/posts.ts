// src/lib/db/queries/posts.ts
// All post query functions using Postgres.js tagged template literals.
// No user input is ever concatenated into SQL strings (Req 16.1, 16.2).

import { sql } from '@/lib/db/client';
import type {
  Post,
  PostWithRelations,
  PaginatedResult,
  DashboardStats,
  CreatePostInput,
  UpdatePostInput,
} from '@/types/database';

// ── Internal row type returned from SQL (includes joined author + agg columns) ──

interface PostRow {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  cover_image_url: string | null;
  author_id: string | null;
  status: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  ai_generated: boolean;
  ai_review_status: PostWithRelations['ai_review_status'];
  ai_meta_description: string | null;
  ai_image_prompt: string | null;
  author_display_name: string | null;
  author_avatar_url: string | null;
  categories: Array<{
    id: string;
    name: string;
    slug: string;
    created_at?: string;
  }>;
  tags: Array<{ id: string; name: string; slug: string; created_at?: string }>;
}

/** Map a raw joined row to the PostWithRelations shape. */
function mapPostRow(row: PostRow): PostWithRelations {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    content: row.content,
    cover_image_url: row.cover_image_url,
    author_id: row.author_id,
    status: row.status as PostWithRelations['status'],
    published_at: row.published_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    ai_generated: row.ai_generated,
    ai_review_status: row.ai_review_status,
    ai_meta_description: row.ai_meta_description,
    ai_image_prompt: row.ai_image_prompt,
    author: row.author_id
      ? {
          id: row.author_id,
          display_name: row.author_display_name,
          avatar_url: row.author_avatar_url,
        }
      : null,
    // json_agg returns parsed JSON arrays directly via postgres.js
    categories: (row.categories ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      created_at: c.created_at ?? '',
    })),
    tags: (row.tags ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      created_at: t.created_at ?? '',
    })),
  };
}

// ── Public read queries ────────────────────────────────────────────────────────

/**
 * Returns a paginated list of published posts ordered by published_at DESC,
 * with aggregated categories and tags (Req 1.1, 1.4, 5.1).
 */
export async function getPublishedPosts(opts: {
  page: number;
  pageSize: number;
}): Promise<PaginatedResult<PostWithRelations>> {
  const offset = (opts.page - 1) * opts.pageSize;

  const [posts, countResult] = await Promise.all([
    sql<PostRow[]>`
      SELECT
        p.*,
        u.display_name AS author_display_name,
        u.avatar_url   AS author_avatar_url,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object(
            'id', c.id, 'name', c.name, 'slug', c.slug, 'created_at', c.created_at
          )) FILTER (WHERE c.id IS NOT NULL),
          '[]'
        ) AS categories,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object(
            'id', t.id, 'name', t.name, 'slug', t.slug, 'created_at', t.created_at
          )) FILTER (WHERE t.id IS NOT NULL),
          '[]'
        ) AS tags
      FROM public.posts p
      LEFT JOIN public.users u ON u.id = p.author_id
      LEFT JOIN public.post_categories pc ON pc.post_id = p.id
      LEFT JOIN public.categories c ON c.id = pc.category_id
      LEFT JOIN public.post_tags pt ON pt.post_id = p.id
      LEFT JOIN public.tags t ON t.id = pt.tag_id
      WHERE p.status = 'PUBLISHED'
      GROUP BY p.id, u.display_name, u.avatar_url
      ORDER BY p.published_at DESC
      LIMIT ${opts.pageSize}
      OFFSET ${offset}
    `,
    sql<[{ count: string }]>`
      SELECT COUNT(*) FROM public.posts WHERE status = 'PUBLISHED'
    `,
  ]);

  const total = parseInt(countResult[0].count, 10);
  return {
    data: posts.map(mapPostRow),
    total,
    page: opts.page,
    pageSize: opts.pageSize,
    totalPages: Math.ceil(total / opts.pageSize),
  };
}

/**
 * Returns a single published post by slug with full relations, or null (Req 1.2, 1.3).
 */
export async function getPostBySlug(
  slug: string,
): Promise<PostWithRelations | null> {
  const rows = await sql<PostRow[]>`
    SELECT
      p.*,
      u.display_name AS author_display_name,
      u.avatar_url   AS author_avatar_url,
      COALESCE(
        json_agg(DISTINCT jsonb_build_object(
          'id', c.id, 'name', c.name, 'slug', c.slug, 'created_at', c.created_at
        )) FILTER (WHERE c.id IS NOT NULL),
        '[]'
      ) AS categories,
      COALESCE(
        json_agg(DISTINCT jsonb_build_object(
          'id', t.id, 'name', t.name, 'slug', t.slug, 'created_at', t.created_at
        )) FILTER (WHERE t.id IS NOT NULL),
        '[]'
      ) AS tags
    FROM public.posts p
    LEFT JOIN public.users u ON u.id = p.author_id
    LEFT JOIN public.post_categories pc ON pc.post_id = p.id
    LEFT JOIN public.categories c ON c.id = pc.category_id
    LEFT JOIN public.post_tags pt ON pt.post_id = p.id
    LEFT JOIN public.tags t ON t.id = pt.tag_id
    WHERE p.slug = ${slug}
    GROUP BY p.id, u.display_name, u.avatar_url
  `;

  return rows.length > 0 ? mapPostRow(rows[0]) : null;
}

/**
 * Returns paginated published posts belonging to a specific category (Req 1.5).
 */
export async function getPublishedPostsByCategory(opts: {
  categorySlug: string;
  page: number;
  pageSize: number;
}): Promise<PaginatedResult<PostWithRelations>> {
  const offset = (opts.page - 1) * opts.pageSize;

  const [posts, countResult] = await Promise.all([
    sql<PostRow[]>`
      SELECT
        p.*,
        u.display_name AS author_display_name,
        u.avatar_url   AS author_avatar_url,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object(
            'id', c2.id, 'name', c2.name, 'slug', c2.slug, 'created_at', c2.created_at
          )) FILTER (WHERE c2.id IS NOT NULL),
          '[]'
        ) AS categories,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object(
            'id', t.id, 'name', t.name, 'slug', t.slug, 'created_at', t.created_at
          )) FILTER (WHERE t.id IS NOT NULL),
          '[]'
        ) AS tags
      FROM public.posts p
      LEFT JOIN public.users u ON u.id = p.author_id
      JOIN public.post_categories pc_filter ON pc_filter.post_id = p.id
      JOIN public.categories c_filter ON c_filter.id = pc_filter.category_id
        AND c_filter.slug = ${opts.categorySlug}
      LEFT JOIN public.post_categories pc ON pc.post_id = p.id
      LEFT JOIN public.categories c2 ON c2.id = pc.category_id
      LEFT JOIN public.post_tags pt ON pt.post_id = p.id
      LEFT JOIN public.tags t ON t.id = pt.tag_id
      WHERE p.status = 'PUBLISHED'
      GROUP BY p.id, u.display_name, u.avatar_url
      ORDER BY p.published_at DESC
      LIMIT ${opts.pageSize}
      OFFSET ${offset}
    `,
    sql<[{ count: string }]>`
      SELECT COUNT(DISTINCT p.id)
      FROM public.posts p
      JOIN public.post_categories pc ON pc.post_id = p.id
      JOIN public.categories c ON c.id = pc.category_id
      WHERE p.status = 'PUBLISHED'
        AND c.slug = ${opts.categorySlug}
    `,
  ]);

  const total = parseInt(countResult[0].count, 10);
  return {
    data: posts.map(mapPostRow),
    total,
    page: opts.page,
    pageSize: opts.pageSize,
    totalPages: Math.ceil(total / opts.pageSize),
  };
}

/**
 * Returns paginated published posts associated with a specific tag (Req 1.6).
 */
export async function getPublishedPostsByTag(opts: {
  tagSlug: string;
  page: number;
  pageSize: number;
}): Promise<PaginatedResult<PostWithRelations>> {
  const offset = (opts.page - 1) * opts.pageSize;

  const [posts, countResult] = await Promise.all([
    sql<PostRow[]>`
      SELECT
        p.*,
        u.display_name AS author_display_name,
        u.avatar_url   AS author_avatar_url,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object(
            'id', c.id, 'name', c.name, 'slug', c.slug, 'created_at', c.created_at
          )) FILTER (WHERE c.id IS NOT NULL),
          '[]'
        ) AS categories,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object(
            'id', t2.id, 'name', t2.name, 'slug', t2.slug, 'created_at', t2.created_at
          )) FILTER (WHERE t2.id IS NOT NULL),
          '[]'
        ) AS tags
      FROM public.posts p
      LEFT JOIN public.users u ON u.id = p.author_id
      JOIN public.post_tags pt_filter ON pt_filter.post_id = p.id
      JOIN public.tags t_filter ON t_filter.id = pt_filter.tag_id
        AND t_filter.slug = ${opts.tagSlug}
      LEFT JOIN public.post_categories pc ON pc.post_id = p.id
      LEFT JOIN public.categories c ON c.id = pc.category_id
      LEFT JOIN public.post_tags pt ON pt.post_id = p.id
      LEFT JOIN public.tags t2 ON t2.id = pt.tag_id
      WHERE p.status = 'PUBLISHED'
      GROUP BY p.id, u.display_name, u.avatar_url
      ORDER BY p.published_at DESC
      LIMIT ${opts.pageSize}
      OFFSET ${offset}
    `,
    sql<[{ count: string }]>`
      SELECT COUNT(DISTINCT p.id)
      FROM public.posts p
      JOIN public.post_tags pt ON pt.post_id = p.id
      JOIN public.tags t ON t.id = pt.tag_id
      WHERE p.status = 'PUBLISHED'
        AND t.slug = ${opts.tagSlug}
    `,
  ]);

  const total = parseInt(countResult[0].count, 10);
  return {
    data: posts.map(mapPostRow),
    total,
    page: opts.page,
    pageSize: opts.pageSize,
    totalPages: Math.ceil(total / opts.pageSize),
  };
}

/**
 * Full-text ILIKE search over title, excerpt, and content.
 * Relevance = number of fields containing the query (Req 2.1, 2.3).
 * Results ordered by relevance DESC, then published_at DESC.
 * The %query% pattern is passed as a parameterized value — never concatenated (Req 16.1, 16.2).
 */
export async function searchPosts(opts: {
  query: string;
  limit: number;
}): Promise<PostWithRelations[]> {
  const pattern = `%${opts.query}%`;

  const rows = await sql<(PostRow & { relevance: number })[]>`
    SELECT
      p.*,
      u.display_name AS author_display_name,
      u.avatar_url   AS author_avatar_url,
      COALESCE(
        json_agg(DISTINCT jsonb_build_object(
          'id', c.id, 'name', c.name, 'slug', c.slug, 'created_at', c.created_at
        )) FILTER (WHERE c.id IS NOT NULL),
        '[]'
      ) AS categories,
      COALESCE(
        json_agg(DISTINCT jsonb_build_object(
          'id', t.id, 'name', t.name, 'slug', t.slug, 'created_at', t.created_at
        )) FILTER (WHERE t.id IS NOT NULL),
        '[]'
      ) AS tags,
      (
        (p.title   ILIKE ${pattern})::int +
        (p.excerpt ILIKE ${pattern})::int +
        (p.content ILIKE ${pattern})::int
      ) AS relevance
    FROM public.posts p
    LEFT JOIN public.users u ON u.id = p.author_id
    LEFT JOIN public.post_categories pc ON pc.post_id = p.id
    LEFT JOIN public.categories c ON c.id = pc.category_id
    LEFT JOIN public.post_tags pt ON pt.post_id = p.id
    LEFT JOIN public.tags t ON t.id = pt.tag_id
    WHERE p.status = 'PUBLISHED'
      AND (
        p.title   ILIKE ${pattern} OR
        p.excerpt ILIKE ${pattern} OR
        p.content ILIKE ${pattern}
      )
    GROUP BY p.id, u.display_name, u.avatar_url
    ORDER BY relevance DESC, p.published_at DESC
    LIMIT ${opts.limit}
  `;

  return rows.map(mapPostRow);
}

/**
 * Returns all slugs of published posts (used for generateStaticParams, Req 5.1).
 */
export async function getAllPostSlugs(): Promise<string[]> {
  const rows = await sql<
    { slug: string }[]
  >` SELECT slug FROM public.posts WHERE status = 'PUBLISHED' `;
  return rows.map((r) => r.slug);
}
// ── Admin read queries ─────────────────────────────────────────────────────────

/**
 * Returns any post by ID (all statuses) — used in the admin edit page.
 */
export async function getPostById(id: string): Promise<Post | null> {
  const rows = await sql<Post[]>`
    SELECT * FROM public.posts WHERE id = ${id}
  `;
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Returns a post by ID with its categories and tags.
 */
export async function getPostByIdWithRelations(
  id: string,
): Promise<PostWithRelations | null> {
  const rows = await sql<PostRow[]>`
    SELECT
      p.*,
      u.display_name AS author_display_name,
      u.avatar_url   AS author_avatar_url,
      COALESCE(
        json_agg(DISTINCT jsonb_build_object(
          'id', c.id, 'name', c.name, 'slug', c.slug, 'created_at', c.created_at
        )) FILTER (WHERE c.id IS NOT NULL),
        '[]'
      ) AS categories,
      COALESCE(
        json_agg(DISTINCT jsonb_build_object(
          'id', t.id, 'name', t.name, 'slug', t.slug, 'created_at', t.created_at
        )) FILTER (WHERE t.id IS NOT NULL),
        '[]'
      ) AS tags
    FROM public.posts p
    LEFT JOIN public.users u ON u.id = p.author_id
    LEFT JOIN public.post_categories pc ON pc.post_id = p.id
    LEFT JOIN public.categories c ON c.id = pc.category_id
    LEFT JOIN public.post_tags pt ON pt.post_id = p.id
    LEFT JOIN public.tags t ON t.id = pt.tag_id
    WHERE p.id = ${id}
    GROUP BY p.id, u.display_name, u.avatar_url
  `;
  return rows.length > 0 ? mapPostRow(rows[0]) : null;
}

/**
 * Returns the N most recently updated posts across all statuses (Req 10.2).
 */
export async function getRecentPosts(limit: number): Promise<Post[]> {
  return sql<Post[]>`
    SELECT * FROM public.posts
    ORDER BY updated_at DESC
    LIMIT ${limit}
  `;
}

/**
 * Aggregate counts used by the admin dashboard (Req 10.1).
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const [postCounts, categoryCounts, tagCounts, mediaCounts] =
    await Promise.all([
      sql<{ status: string; count: string }[]>`
      SELECT status, COUNT(*) AS count
      FROM public.posts
      GROUP BY status
    `,
      sql<[{ count: string }]>`SELECT COUNT(*) AS count FROM public.categories`,
      sql<[{ count: string }]>`SELECT COUNT(*) AS count FROM public.tags`,
      sql<[{ count: string }]>`SELECT COUNT(*) AS count FROM public.media`,
    ]);

  const byStatus = Object.fromEntries(
    postCounts.map((r) => [r.status, parseInt(r.count, 10)]),
  );

  return {
    drafts: byStatus['DRAFT'] ?? 0,
    published: byStatus['PUBLISHED'] ?? 0,
    archived: byStatus['ARCHIVED'] ?? 0,
    categories: parseInt(categoryCounts[0].count, 10),
    tags: parseInt(tagCounts[0].count, 10),
    media: parseInt(mediaCounts[0].count, 10),
  };
}

// ── Mutation queries ───────────────────────────────────────────────────────────

/**
 * Inserts a new post and wires up category/tag join rows in a transaction.
 * category_ids and tag_ids are processed as parameterized array values (Req 16.1, 16.2).
 * Returns the created post row (Req 11.1).
 */
export async function createPost(data: CreatePostInput): Promise<Post> {
  const status = data.status ?? 'DRAFT';
  const slug = data.slug ?? data.title.toLowerCase().replace(/\s+/g, '-');

  const [post] = await sql.begin(async (tx) => {
    const inserted = await tx<Post[]>`
      INSERT INTO public.posts (
        title, slug, excerpt, content, cover_image_url,
        author_id, status
      ) VALUES (
        ${data.title},
        ${slug},
        ${data.excerpt ?? null},
        ${data.content ?? null},
        ${data.cover_image_url ?? null},
        ${data.author_id},
        ${status}
      )
      RETURNING *
    `;

    const postId = inserted[0].id;

    if (data.category_ids.length > 0) {
      // Build parameterized insert using unnest to avoid dynamic SQL (Req 16.1)
      await tx`
        INSERT INTO public.post_categories (post_id, category_id)
        SELECT ${postId}, unnest(${data.category_ids}::uuid[])
        ON CONFLICT DO NOTHING
      `;
    }

    if (data.tag_ids.length > 0) {
      await tx`
        INSERT INTO public.post_tags (post_id, tag_id)
        SELECT ${postId}, unnest(${data.tag_ids}::uuid[])
        ON CONFLICT DO NOTHING
      `;
    }

    return inserted;
  });

  return post;
}

/**
 * Updates mutable post fields and replaces category/tag associations atomically (Req 11.2).
 */
export async function updatePost(
  id: string,
  data: UpdatePostInput,
): Promise<Post> {
  const [post] = await sql.begin(async (tx) => {
    // Build the SET clause using individual parameterized fields.
    // Only update fields that are explicitly provided.
    const updated = await tx<Post[]>`
      UPDATE public.posts SET
        title           = COALESCE(${data.title ?? null}, title),
        slug            = COALESCE(${data.slug ?? null}, slug),
        excerpt         = CASE WHEN ${data.excerpt !== undefined} THEN ${data.excerpt ?? null} ELSE excerpt END,
        content         = CASE WHEN ${data.content !== undefined} THEN ${data.content ?? null} ELSE content END,
        cover_image_url = CASE WHEN ${data.cover_image_url !== undefined} THEN ${data.cover_image_url ?? null} ELSE cover_image_url END,
        status          = COALESCE(${data.status ?? null}, status)
      WHERE id = ${id}
      RETURNING *
    `;

    if (data.category_ids !== undefined) {
      // Replace all category associations atomically
      await tx`DELETE FROM public.post_categories WHERE post_id = ${id}`;
      if (data.category_ids.length > 0) {
        await tx`
          INSERT INTO public.post_categories (post_id, category_id)
          SELECT ${id}, unnest(${data.category_ids}::uuid[])
          ON CONFLICT DO NOTHING
        `;
      }
    }

    if (data.tag_ids !== undefined) {
      // Replace all tag associations atomically
      await tx`DELETE FROM public.post_tags WHERE post_id = ${id}`;
      if (data.tag_ids.length > 0) {
        await tx`
          INSERT INTO public.post_tags (post_id, tag_id)
          SELECT ${id}, unnest(${data.tag_ids}::uuid[])
          ON CONFLICT DO NOTHING
        `;
      }
    }

    return updated;
  });

  return post;
}

/**
 * Sets status = PUBLISHED. Sets published_at = now() only if it is currently NULL (Req 11.3).
 */
export async function publishPost(id: string): Promise<Post> {
  const [post] = await sql<Post[]>`
    UPDATE public.posts
    SET
      status       = 'PUBLISHED',
      published_at = CASE WHEN published_at IS NULL THEN now() ELSE published_at END
    WHERE id = ${id}
    RETURNING *
  `;
  return post;
}

/**
 * Sets status = DRAFT. Does NOT touch published_at (Req 11.4).
 */
export async function unpublishPost(id: string): Promise<Post> {
  const [post] = await sql<Post[]>`
    UPDATE public.posts
    SET status = 'DRAFT'
    WHERE id = ${id}
    RETURNING *
  `;
  return post;
}

/**
 * Sets status = ARCHIVED (Req 11.5).
 */
export async function archivePost(id: string): Promise<Post> {
  const [post] = await sql<Post[]>`
    UPDATE public.posts
    SET status = 'ARCHIVED'
    WHERE id = ${id}
    RETURNING *
  `;
  return post;
}

/**
 * Permanently removes a post. Cascade on post_categories / post_tags handles join rows (Req 11.6).
 */
export async function deletePost(id: string): Promise<void> {
  await sql`DELETE FROM public.posts WHERE id = ${id}`;
}

/**
 * Checks whether a post with the given slug already exists.
 * @param slug - The slug to check.
 * @param excludeId - Optional post id to exclude from the check (for update scenarios).
 */
export async function postSlugExists(
  slug: string,
  excludeId?: string,
): Promise<boolean> {
  const rows = excludeId
    ? await sql<{ id: string }[]>`
        SELECT id FROM public.posts
        WHERE slug = ${slug}
          AND id <> ${excludeId}
        LIMIT 1
      `
    : await sql<{ id: string }[]>`
        SELECT id FROM public.posts
        WHERE slug = ${slug}
        LIMIT 1
      `;
  return rows.length > 0;
}
