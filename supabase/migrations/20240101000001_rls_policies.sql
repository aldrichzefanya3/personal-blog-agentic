-- ============================================================
-- RLS POLICIES MIGRATION (IDEMPOTENT)
-- Requirements: 9.6, 7.5
--
-- This migration is intentionally idempotent: it forces RLS
-- on all tables and recreates every policy from scratch using
-- DROP POLICY IF EXISTS so it is safe to run even when the
-- initial schema migration has already created the same policies.
-- ============================================================

-- ============================================================
-- ENSURE RLS IS ENABLED ON ALL TABLES
-- FORCE ROW LEVEL SECURITY also applies to table owners.
-- ============================================================
ALTER TABLE public.posts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts           FORCE  ROW LEVEL SECURITY;

ALTER TABLE public.categories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories      FORCE  ROW LEVEL SECURITY;

ALTER TABLE public.tags            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags            FORCE  ROW LEVEL SECURITY;

ALTER TABLE public.media           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media           FORCE  ROW LEVEL SECURITY;

ALTER TABLE public.users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users           FORCE  ROW LEVEL SECURITY;

ALTER TABLE public.post_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_categories FORCE  ROW LEVEL SECURITY;

ALTER TABLE public.post_tags       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_tags       FORCE  ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES — POSTS
-- ============================================================

-- Drop existing policies so this file is re-runnable
DROP POLICY IF EXISTS "posts_public_read"           ON public.posts;
DROP POLICY IF EXISTS "posts_admin_editor_read_all" ON public.posts;
DROP POLICY IF EXISTS "posts_admin_editor_insert"   ON public.posts;
DROP POLICY IF EXISTS "posts_update"                ON public.posts;
DROP POLICY IF EXISTS "posts_delete"                ON public.posts;

-- Public can read published posts
CREATE POLICY "posts_public_read" ON public.posts
  FOR SELECT USING (status = 'PUBLISHED');

-- Authenticated users with ADMIN or EDITOR role can read all posts
CREATE POLICY "posts_admin_editor_read_all" ON public.posts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('ADMIN', 'EDITOR')
    )
  );

-- ADMIN/EDITOR can insert
CREATE POLICY "posts_admin_editor_insert" ON public.posts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('ADMIN', 'EDITOR')
    )
  );

-- Authors can update their own posts; ADMIN can update any
CREATE POLICY "posts_update" ON public.posts
  FOR UPDATE
  USING (
    author_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'ADMIN'
    )
  );

-- Authors can delete their own posts; ADMIN can delete any
CREATE POLICY "posts_delete" ON public.posts
  FOR DELETE
  USING (
    author_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'ADMIN'
    )
  );

-- ============================================================
-- RLS POLICIES — CATEGORIES
-- ============================================================

DROP POLICY IF EXISTS "categories_public_read"          ON public.categories;
DROP POLICY IF EXISTS "categories_admin_editor_write"   ON public.categories;

-- Public read
CREATE POLICY "categories_public_read" ON public.categories
  FOR SELECT USING (true);

-- ADMIN/EDITOR write (insert/update/delete)
CREATE POLICY "categories_admin_editor_write" ON public.categories
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('ADMIN', 'EDITOR')
    )
  );

-- ============================================================
-- RLS POLICIES — TAGS
-- ============================================================

DROP POLICY IF EXISTS "tags_public_read"          ON public.tags;
DROP POLICY IF EXISTS "tags_admin_editor_write"   ON public.tags;

-- Public read
CREATE POLICY "tags_public_read" ON public.tags
  FOR SELECT USING (true);

-- ADMIN/EDITOR write (insert/update/delete)
CREATE POLICY "tags_admin_editor_write" ON public.tags
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('ADMIN', 'EDITOR')
    )
  );

-- ============================================================
-- RLS POLICIES — POST_CATEGORIES
-- ============================================================

DROP POLICY IF EXISTS "post_categories_public_read"          ON public.post_categories;
DROP POLICY IF EXISTS "post_categories_admin_editor_write"   ON public.post_categories;

-- Public read
CREATE POLICY "post_categories_public_read" ON public.post_categories
  FOR SELECT USING (true);

-- ADMIN/EDITOR write
CREATE POLICY "post_categories_admin_editor_write" ON public.post_categories
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('ADMIN', 'EDITOR')
    )
  );

-- ============================================================
-- RLS POLICIES — POST_TAGS
-- ============================================================

DROP POLICY IF EXISTS "post_tags_public_read"          ON public.post_tags;
DROP POLICY IF EXISTS "post_tags_admin_editor_write"   ON public.post_tags;

-- Public read
CREATE POLICY "post_tags_public_read" ON public.post_tags
  FOR SELECT USING (true);

-- ADMIN/EDITOR write
CREATE POLICY "post_tags_admin_editor_write" ON public.post_tags
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('ADMIN', 'EDITOR')
    )
  );

-- ============================================================
-- RLS POLICIES — MEDIA
-- (owner = uploader; ADMIN has full access)
-- ============================================================

DROP POLICY IF EXISTS "media_owner_read"    ON public.media;
DROP POLICY IF EXISTS "media_owner_insert"  ON public.media;
DROP POLICY IF EXISTS "media_owner_delete"  ON public.media;

-- Uploader or ADMIN can read
CREATE POLICY "media_owner_read" ON public.media
  FOR SELECT
  USING (
    uploader_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'ADMIN'
    )
  );

-- Uploader (must be ADMIN/EDITOR) can insert
CREATE POLICY "media_owner_insert" ON public.media
  FOR INSERT
  WITH CHECK (
    uploader_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('ADMIN', 'EDITOR')
    )
  );

-- Uploader or ADMIN can delete
CREATE POLICY "media_owner_delete" ON public.media
  FOR DELETE
  USING (
    uploader_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'ADMIN'
    )
  );

-- ============================================================
-- RLS POLICIES — USERS
-- ============================================================

DROP POLICY IF EXISTS "users_self_read"  ON public.users;
DROP POLICY IF EXISTS "users_admin_all"  ON public.users;

-- Users can read their own row
CREATE POLICY "users_self_read" ON public.users
  FOR SELECT USING (id = auth.uid());

-- ADMIN can read/write all user rows
CREATE POLICY "users_admin_all" ON public.users
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'ADMIN'
    )
  );

-- ============================================================
-- DOWN: Reverse SQL to undo all changes in this migration.
-- Run statements in this block to roll back RLS policies and
-- disable forced/enabled RLS on each table.
-- ============================================================

-- -- DROP POLICY IF EXISTS "users_admin_all"                    ON public.users;
-- -- DROP POLICY IF EXISTS "users_self_read"                    ON public.users;
-- -- DROP POLICY IF EXISTS "media_owner_delete"                 ON public.media;
-- -- DROP POLICY IF EXISTS "media_owner_insert"                 ON public.media;
-- -- DROP POLICY IF EXISTS "media_owner_read"                   ON public.media;
-- -- DROP POLICY IF EXISTS "post_tags_admin_editor_write"       ON public.post_tags;
-- -- DROP POLICY IF EXISTS "post_tags_public_read"              ON public.post_tags;
-- -- DROP POLICY IF EXISTS "post_categories_admin_editor_write" ON public.post_categories;
-- -- DROP POLICY IF EXISTS "post_categories_public_read"        ON public.post_categories;
-- -- DROP POLICY IF EXISTS "tags_admin_editor_write"            ON public.tags;
-- -- DROP POLICY IF EXISTS "tags_public_read"                   ON public.tags;
-- -- DROP POLICY IF EXISTS "categories_admin_editor_write"      ON public.categories;
-- -- DROP POLICY IF EXISTS "categories_public_read"             ON public.categories;
-- -- DROP POLICY IF EXISTS "posts_delete"                       ON public.posts;
-- -- DROP POLICY IF EXISTS "posts_update"                       ON public.posts;
-- -- DROP POLICY IF EXISTS "posts_admin_editor_insert"          ON public.posts;
-- -- DROP POLICY IF EXISTS "posts_admin_editor_read_all"        ON public.posts;
-- -- DROP POLICY IF EXISTS "posts_public_read"                  ON public.posts;
-- --
-- -- ALTER TABLE public.post_tags       NO FORCE ROW LEVEL SECURITY;
-- -- ALTER TABLE public.post_tags       DISABLE ROW LEVEL SECURITY;
-- -- ALTER TABLE public.post_categories NO FORCE ROW LEVEL SECURITY;
-- -- ALTER TABLE public.post_categories DISABLE ROW LEVEL SECURITY;
-- -- ALTER TABLE public.users           NO FORCE ROW LEVEL SECURITY;
-- -- ALTER TABLE public.users           DISABLE ROW LEVEL SECURITY;
-- -- ALTER TABLE public.media           NO FORCE ROW LEVEL SECURITY;
-- -- ALTER TABLE public.media           DISABLE ROW LEVEL SECURITY;
-- -- ALTER TABLE public.tags            NO FORCE ROW LEVEL SECURITY;
-- -- ALTER TABLE public.tags            DISABLE ROW LEVEL SECURITY;
-- -- ALTER TABLE public.categories      NO FORCE ROW LEVEL SECURITY;
-- -- ALTER TABLE public.categories      DISABLE ROW LEVEL SECURITY;
-- -- ALTER TABLE public.posts           NO FORCE ROW LEVEL SECURITY;
-- -- ALTER TABLE public.posts           DISABLE ROW LEVEL SECURITY;
