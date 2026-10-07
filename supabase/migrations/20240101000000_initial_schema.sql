-- ============================================================
-- INITIAL SCHEMA MIGRATION
-- Requirements: 6.1-6.12, 9.6, 7.5
-- ============================================================

-- ============================================================
-- USERS TABLE (mirrors auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id           UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role         TEXT        NOT NULL DEFAULT 'USER'
                           CHECK (role IN ('ADMIN', 'EDITOR', 'USER')),
  display_name TEXT        CHECK (char_length(display_name) <= 100),
  bio          TEXT        CHECK (char_length(bio) <= 1000),
  avatar_url   TEXT        CHECK (char_length(avatar_url) <= 2048),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- POSTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.posts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT        NOT NULL CHECK (char_length(title) BETWEEN 1 AND 255),
  slug            TEXT        NOT NULL UNIQUE
                              CHECK (
                                char_length(slug) <= 255 AND
                                slug ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$' AND
                                slug NOT LIKE '%---%'
                              ),
  excerpt         TEXT        CHECK (char_length(excerpt) <= 500),
  content         TEXT,
  cover_image_url TEXT        CHECK (char_length(cover_image_url) <= 2048),
  author_id       UUID        NOT NULL REFERENCES public.users(id),
  status          TEXT        NOT NULL DEFAULT 'DRAFT'
                              CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- published_at must be set when status is PUBLISHED
  CONSTRAINT published_at_required_when_published
    CHECK (status != 'PUBLISHED' OR published_at IS NOT NULL)
);

-- ============================================================
-- CATEGORIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 1 AND 100),
  slug       TEXT        NOT NULL UNIQUE
                         CHECK (
                           char_length(slug) <= 100 AND
                           slug ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$' AND
                           slug NOT LIKE '%---%'
                         ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TAGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tags (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 1 AND 100),
  slug       TEXT        NOT NULL UNIQUE
                         CHECK (
                           char_length(slug) <= 100 AND
                           slug ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$' AND
                           slug NOT LIKE '%---%'
                         ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- JOIN TABLES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.post_categories (
  post_id     UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, category_id)
);

CREATE TABLE IF NOT EXISTS public.post_tags (
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  tag_id  UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

-- ============================================================
-- MEDIA TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.media (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  uploader_id  UUID        NOT NULL REFERENCES public.users(id),
  filename     TEXT        NOT NULL CHECK (char_length(filename) BETWEEN 1 AND 255),
  storage_path TEXT        NOT NULL UNIQUE
                           CHECK (char_length(storage_path) BETWEEN 1 AND 1024),
  mime_type    TEXT        NOT NULL
                           CHECK (
                             char_length(mime_type) <= 127 AND
                             mime_type IN (
                               'image/jpeg', 'image/png', 'image/webp',
                               'image/gif', 'image/avif'
                             )
                           ),
  size_bytes   BIGINT      NOT NULL CHECK (size_bytes > 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_posts_slug         ON public.posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_status       ON public.posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_author_id    ON public.posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_published_at ON public.posts(published_at DESC)
  WHERE status = 'PUBLISHED';
CREATE INDEX IF NOT EXISTS idx_categories_slug    ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_tags_slug          ON public.tags(slug);
-- Full-text search index for post search
CREATE INDEX IF NOT EXISTS idx_posts_fts ON public.posts
  USING GIN (to_tsvector('english', coalesce(title,'') || ' ' ||
                                    coalesce(excerpt,'') || ' ' ||
                                    coalesce(content,'')));

-- ============================================================
-- updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE public.posts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_tags       ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES — POSTS
-- ============================================================

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
-- ============================================================

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
-- DOWN: Reverse SQL to undo all changes above
-- Run in this order to respect dependency/FK constraints.
-- ============================================================

-- DROP TRIGGER posts_updated_at ON public.posts;
-- DROP FUNCTION IF EXISTS public.set_updated_at();

-- DROP POLICY IF EXISTS "users_admin_all"                  ON public.users;
-- DROP POLICY IF EXISTS "users_self_read"                  ON public.users;
-- DROP POLICY IF EXISTS "media_owner_delete"               ON public.media;
-- DROP POLICY IF EXISTS "media_owner_insert"               ON public.media;
-- DROP POLICY IF EXISTS "media_owner_read"                 ON public.media;
-- DROP POLICY IF EXISTS "post_tags_admin_editor_write"     ON public.post_tags;
-- DROP POLICY IF EXISTS "post_tags_public_read"            ON public.post_tags;
-- DROP POLICY IF EXISTS "post_categories_admin_editor_write" ON public.post_categories;
-- DROP POLICY IF EXISTS "post_categories_public_read"      ON public.post_categories;
-- DROP POLICY IF EXISTS "tags_admin_editor_write"          ON public.tags;
-- DROP POLICY IF EXISTS "tags_public_read"                 ON public.tags;
-- DROP POLICY IF EXISTS "categories_admin_editor_write"    ON public.categories;
-- DROP POLICY IF EXISTS "categories_public_read"           ON public.categories;
-- DROP POLICY IF EXISTS "posts_delete"                     ON public.posts;
-- DROP POLICY IF EXISTS "posts_update"                     ON public.posts;
-- DROP POLICY IF EXISTS "posts_admin_editor_insert"        ON public.posts;
-- DROP POLICY IF EXISTS "posts_admin_editor_read_all"      ON public.posts;
-- DROP POLICY IF EXISTS "posts_public_read"                ON public.posts;

-- DROP INDEX IF EXISTS public.idx_posts_fts;
-- DROP INDEX IF EXISTS public.idx_tags_slug;
-- DROP INDEX IF EXISTS public.idx_categories_slug;
-- DROP INDEX IF EXISTS public.idx_posts_published_at;
-- DROP INDEX IF EXISTS public.idx_posts_author_id;
-- DROP INDEX IF EXISTS public.idx_posts_status;
-- DROP INDEX IF EXISTS public.idx_posts_slug;

-- DROP TABLE IF EXISTS public.media;
-- DROP TABLE IF EXISTS public.post_tags;
-- DROP TABLE IF EXISTS public.post_categories;
-- DROP TABLE IF EXISTS public.tags;
-- DROP TABLE IF EXISTS public.categories;
-- DROP TABLE IF EXISTS public.posts;
-- DROP TABLE IF EXISTS public.users;
