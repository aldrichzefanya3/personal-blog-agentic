# Design Document — Personal Blog Platform

## Overview

This document describes the technical design for a secure, full-stack personal blog platform built with Next.js 14+ (App Router), TypeScript, Tailwind CSS, PostgreSQL via Supabase, and Supabase Auth. The platform serves two audiences: public visitors reading published content, and authenticated admins/editors managing that content through a private admin panel.

The architecture is a **modular monolith** — a single Next.js application that co-locates all concerns (public blog, admin panel, API layer, data access) within one deployment unit, organized into clearly bounded internal modules. This eliminates distributed-system complexity while maintaining clean separation of concerns through directory conventions and TypeScript module boundaries.

### Key Design Decisions

| Decision   | Choice                          | Rationale                                                                     |
| ---------- | ------------------------------- | ----------------------------------------------------------------------------- |
| Framework  | Next.js 14 App Router           | ISR/SSG support, Server Components, built-in metadata API                     |
| Database   | Supabase (PostgreSQL)           | Managed Postgres + Auth + Storage in one platform                             |
| DB client  | Postgres.js (raw SQL)           | Fine-grained control, no ORM abstraction leaks, transaction pooler compatible |
| Auth       | Supabase Auth + `@supabase/ssr` | HTTP-only cookie sessions, compatible with App Router SSR                     |
| Validation | Zod                             | Type-safe, composable schema validation                                       |
| Markdown   | remark + rehype pipeline        | Extensible, well-supported, `rehype-sanitize` for XSS prevention              |
| Styling    | Tailwind CSS                    | Utility-first, built-in dark mode, consistent design tokens                   |
| Deployment | Vercel + Supabase Cloud         | Zero-config Next.js hosting, production-grade Postgres                        |
| Testing    | Vitest + fast-check             | Fast ESM-native test runner, property-based testing support                   |

---

## Architecture

### System Context

```mermaid
graph TB
    Visitor["Public Visitor\n(Browser)"]
    Admin["Admin / Editor\n(Browser)"]
    Vercel["Vercel\n(Next.js App)"]
    Supabase_DB["Supabase\n(PostgreSQL + RLS)"]
    Supabase_Auth["Supabase Auth\n(Session Management)"]
    Supabase_Storage["Supabase Storage\n(Image Files)"]
    CDN["Vercel Edge CDN\n(Static Cache)"]

    Visitor -->|HTTPS| CDN
    CDN -->|cache miss| Vercel
    Admin -->|HTTPS| Vercel
    Vercel -->|Postgres.js / pooler| Supabase_DB
    Vercel -->|@supabase/ssr| Supabase_Auth
    Vercel -->|supabase-js storage| Supabase_Storage
    Supabase_Auth -.->|JWT claims| Supabase_DB
```

### Request Flow — Public Page

```mermaid
sequenceDiagram
    participant B as Browser
    participant CDN as Vercel CDN
    participant N as Next.js Server
    participant DB as Supabase DB

    B->>CDN: GET /posts/my-post
    CDN->>CDN: Cache hit?
    alt Cached
        CDN-->>B: 200 Cached HTML
    else Cache miss / stale
        CDN->>N: Forward request
        N->>DB: SELECT post WHERE slug=? AND status='PUBLISHED'
        DB-->>N: Post row
        N->>N: renderMarkdown() + sanitize()
        N-->>CDN: HTML + Cache-Control
        CDN-->>B: 200 HTML
    end
```

### Request Flow — Admin Action

```mermaid
sequenceDiagram
    participant B as Browser
    participant M as Next.js Middleware
    participant SA as Server Action
    participant AZ as AuthZ Layer
    participant DB as Supabase DB

    B->>M: POST /admin/posts (form action)
    M->>M: getServerSession() → validate cookie
    M->>SA: Forward with session
    SA->>AZ: requireRole(session, 'EDITOR')
    AZ->>DB: SELECT role FROM users WHERE id=?
    DB-->>AZ: role = 'EDITOR'
    AZ-->>SA: Authorized
    SA->>SA: Zod.parse(formData)
    SA->>DB: INSERT INTO posts (parameterized)
    DB-->>SA: Created row
    SA-->>B: redirect('/admin/posts')
```

---

## Directory Structure

```
personal-blog-agentic/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (public)/                 # Route group: public blog
│   │   │   ├── layout.tsx            # Public shell (nav, footer)
│   │   │   ├── page.tsx              # Home / post listing (page 1)
│   │   │   ├── posts/
│   │   │   │   └── [slug]/
│   │   │   │       └── page.tsx      # Post detail
│   │   │   ├── categories/
│   │   │   │   └── [slug]/
│   │   │   │       └── page.tsx      # Category filter listing
│   │   │   ├── tags/
│   │   │   │   └── [slug]/
│   │   │   │       └── page.tsx      # Tag filter listing
│   │   │   ├── search/
│   │   │   │   └── page.tsx          # Search results
│   │   │   └── about/
│   │   │       └── page.tsx          # Author profile
│   │   ├── (admin)/                  # Route group: admin panel
│   │   │   ├── layout.tsx            # Admin shell (sidebar, topbar)
│   │   │   ├── admin/
│   │   │   │   ├── page.tsx          # Dashboard
│   │   │   │   ├── posts/
│   │   │   │   │   ├── page.tsx      # Post list
│   │   │   │   │   ├── new/
│   │   │   │   │   │   └── page.tsx  # Create post
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── page.tsx  # Edit post
│   │   │   │   ├── categories/
│   │   │   │   │   └── page.tsx      # Category management
│   │   │   │   ├── tags/
│   │   │   │   │   └── page.tsx      # Tag management
│   │   │   │   ├── media/
│   │   │   │   │   └── page.tsx      # Media library
│   │   │   │   └── settings/
│   │   │   │       └── page.tsx      # User management (ADMIN only)
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   │   └── page.tsx          # Sign-in page
│   │   │   ├── reset-password/
│   │   │   │   └── page.tsx          # Password reset request
│   │   │   └── update-password/
│   │   │       └── page.tsx          # New password form (from email link)
│   │   ├── sitemap.ts                # /sitemap.xml (Next.js built-in)
│   │   ├── robots.ts                 # /robots.txt (Next.js built-in)
│   │   └── layout.tsx                # Root layout (HTML lang, fonts)
│   │
│   ├── lib/                          # All business logic (no UI)
│   │   ├── db/
│   │   │   ├── client.ts             # Postgres.js singleton
│   │   │   └── queries/
│   │   │       ├── posts.ts          # Post query functions
│   │   │       ├── categories.ts     # Category query functions
│   │   │       ├── tags.ts           # Tag query functions
│   │   │       ├── media.ts          # Media query functions
│   │   │       └── users.ts          # User query functions
│   │   ├── auth/
│   │   │   ├── supabase-server.ts    # createServerClient() factory
│   │   │   ├── supabase-browser.ts   # createBrowserClient() factory
│   │   │   └── session.ts            # getServerSession() helper
│   │   ├── services/
│   │   │   ├── posts.ts              # Post business logic
│   │   │   ├── categories.ts         # Category business logic
│   │   │   ├── tags.ts               # Tag business logic
│   │   │   ├── media.ts              # Media business logic
│   │   │   └── users.ts              # User/role business logic
│   │   ├── validation/
│   │   │   ├── schemas/
│   │   │   │   ├── post.ts           # Post Zod schemas
│   │   │   │   ├── category.ts       # Category Zod schemas
│   │   │   │   ├── tag.ts            # Tag Zod schemas
│   │   │   │   └── media.ts          # Media Zod schemas
│   │   │   └── index.ts              # Re-exports
│   │   ├── content/
│   │   │   ├── markdown.ts           # remark/rehype pipeline
│   │   │   └── sanitizer.ts          # rehype-sanitize config
│   │   ├── seo/
│   │   │   ├── metadata.ts           # generateMetadata helpers
│   │   │   └── jsonld.ts             # JSON-LD structured data builders
│   │   ├── slug.ts                   # generateSlug(), ensureUniqueSlug()
│   │   └── authz/
│   │       ├── roles.ts              # Role enum + isAuthorized()
│   │       └── guards.ts             # requireRole(), requireOwnership()
│   │
│   ├── components/                   # Shared React components
│   │   ├── ui/                       # Primitive components (button, input, etc.)
│   │   ├── blog/                     # Blog-specific components
│   │   │   ├── PostCard.tsx
│   │   │   ├── PostList.tsx
│   │   │   ├── Pagination.tsx
│   │   │   ├── CategoryBadge.tsx
│   │   │   └── TagBadge.tsx
│   │   ├── admin/                    # Admin-specific components
│   │   │   ├── MarkdownEditor.tsx    # Client Component — editor
│   │   │   ├── PostForm.tsx
│   │   │   ├── MediaUploader.tsx
│   │   │   └── Sidebar.tsx
│   │   └── layout/
│   │       ├── Header.tsx
│   │       ├── Footer.tsx
│   │       └── ThemeToggle.tsx
│   │
│   ├── actions/                      # Next.js Server Actions
│   │   ├── posts.ts
│   │   ├── categories.ts
│   │   ├── tags.ts
│   │   ├── media.ts
│   │   └── auth.ts
│   │
│   └── types/                        # Shared TypeScript types
│       ├── database.ts               # DB row types (generated from schema)
│       └── index.ts
│
├── middleware.ts                     # Auth + security headers middleware
├── supabase/
│   ├── migrations/                   # Versioned SQL migration files
│   │   └── 20240101000000_initial_schema.sql
│   └── seed.sql                      # Development seed data
├── .env.example
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
└── package.json
```

---

## Components and Interfaces

### Public Blog Components

```
PublicLayout (Server Component)
├── Header (Server Component)
│   ├── NavLinks
│   └── SearchBar (Client Component — input handling)
├── [slot: page content]
└── Footer (Server Component)

PostListPage (Server Component — ISR)
├── PostList (Server Component)
│   └── PostCard[] (Server Component)
│       ├── CoverImage (next/image)
│       ├── CategoryBadge[]
│       └── TagBadge[]
└── Pagination (Server Component)

PostDetailPage (Server Component — ISR)
├── PostHeader (title, author, date, categories, tags)
├── CoverImage (next/image)
└── PostBody (dangerouslySetInnerHTML with sanitized HTML)

SearchPage (Server Component, search params via URL)
└── PostList (same component, different data source)
```

### Admin Panel Components

```
AdminLayout (Server Component — auth-gated in middleware)
├── Sidebar (Server Component)
│   └── NavItems (role-conditional)
├── TopBar (Server Component)
└── [slot: page content]

PostEditorPage (Server Component shell)
└── PostForm (Client Component — "use client")
    ├── TitleInput
    ├── SlugInput (auto-derived, editable)
    ├── ExcerptTextarea
    ├── MarkdownEditor (Client Component)
    │   ├── Toolbar (bold, italic, link, image insert)
    │   ├── EditorTextarea
    │   └── PreviewPane (debounced, renders markdown via API route)
    ├── CoverImagePicker (MediaUploader)
    ├── CategoryMultiSelect (Client Component)
    ├── TagMultiSelect (Client Component)
    └── StatusActions (Publish / Save Draft / Archive / Delete)
```

### Key Type Interfaces

```typescript
// src/types/database.ts

export type PostStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type UserRole = 'ADMIN' | 'EDITOR' | 'USER';

export interface Post {
  id: string; // UUID
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  cover_image_url: string | null;
  author_id: string; // UUID → users.id
  status: PostStatus;
  published_at: string | null; // ISO 8601
  created_at: string;
  updated_at: string;
}

export interface PostWithRelations extends Post {
  author: Pick<User, 'id' | 'display_name' | 'avatar_url'>;
  categories: Category[];
  tags: Tag[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface User {
  id: string; // references auth.users.id
  role: UserRole;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Media {
  id: string;
  uploader_id: string;
  filename: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  url?: string; // computed, not stored
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

---

## Data Models

### Full SQL DDL

```sql
-- ============================================================
-- USERS TABLE (mirrors auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID          PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT          NOT NULL DEFAULT 'USER'
                            CHECK (role IN ('ADMIN', 'EDITOR', 'USER')),
  display_name TEXT         CHECK (char_length(display_name) <= 100),
  bio         TEXT          CHECK (char_length(bio) <= 1000),
  avatar_url  TEXT          CHECK (char_length(avatar_url) <= 2048),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
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
ALTER TABLE public.posts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_tags       ENABLE ROW LEVEL SECURITY;

-- POSTS RLS
-- Public can read published posts
CREATE POLICY "posts_public_read" ON public.posts
  FOR SELECT USING (status = 'PUBLISHED');

-- Authenticated users with ADMIN or EDITOR role can read all posts
CREATE POLICY "posts_admin_editor_read_all" ON public.posts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('ADMIN','EDITOR')
    )
  );

-- ADMIN/EDITOR can insert
CREATE POLICY "posts_admin_editor_insert" ON public.posts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('ADMIN','EDITOR')
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

-- CATEGORIES / TAGS — public read, ADMIN/EDITOR write
CREATE POLICY "categories_public_read" ON public.categories FOR SELECT USING (true);
CREATE POLICY "categories_admin_editor_write" ON public.categories
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('ADMIN','EDITOR'))
  );

CREATE POLICY "tags_public_read" ON public.tags FOR SELECT USING (true);
CREATE POLICY "tags_admin_editor_write" ON public.tags
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('ADMIN','EDITOR'))
  );

-- POST_CATEGORIES / POST_TAGS — public read, ADMIN/EDITOR write
CREATE POLICY "post_categories_public_read" ON public.post_categories FOR SELECT USING (true);
CREATE POLICY "post_categories_admin_editor_write" ON public.post_categories
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('ADMIN','EDITOR'))
  );

CREATE POLICY "post_tags_public_read" ON public.post_tags FOR SELECT USING (true);
CREATE POLICY "post_tags_admin_editor_write" ON public.post_tags
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('ADMIN','EDITOR'))
  );

-- MEDIA — uploader or ADMIN can manage; no public access
CREATE POLICY "media_owner_read" ON public.media
  FOR SELECT
  USING (
    uploader_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'ADMIN')
  );
CREATE POLICY "media_owner_insert" ON public.media
  FOR INSERT
  WITH CHECK (
    uploader_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('ADMIN','EDITOR'))
  );
CREATE POLICY "media_owner_delete" ON public.media
  FOR DELETE
  USING (
    uploader_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'ADMIN')
  );

-- USERS — users can read their own row; ADMIN can read/update all
CREATE POLICY "users_self_read" ON public.users
  FOR SELECT USING (id = auth.uid());
CREATE POLICY "users_admin_all" ON public.users
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'ADMIN')
  );
```

---

## Database Access Layer

### Postgres.js Client Setup

```typescript
// src/lib/db/client.ts

import postgres from 'postgres';

if (!process.env.DATABASE_URL) {
  throw new Error('Missing required environment variable: DATABASE_URL');
}

// Singleton with connection reuse across hot-reload in development
const globalForDb = globalThis as unknown as { _sql: postgres.Sql | undefined };

export const sql =
  globalForDb._sql ??
  postgres(process.env.DATABASE_URL, {
    // Transaction pooler (Supavisor) does not support named prepared statements
    prepare: false,
    // Reasonable pool size for serverless; Vercel functions are short-lived
    max: 3,
    // Connection timeout
    connect_timeout: 10,
    // Idle connection timeout (important for serverless cold starts)
    idle_timeout: 20,
    // Supavisor connection string includes ?pgbouncer=true
    // ssl is required for Supabase production
    ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDb._sql = sql;
}
```

### Query Function Signatures

All query functions live in `src/lib/db/queries/`. They accept typed parameters, use Postgres.js tagged template literals exclusively, and return typed results.

```typescript
// src/lib/db/queries/posts.ts

export async function getPublishedPosts(opts: {
  page: number;
  pageSize: number;
}): Promise<PaginatedResult<PostWithRelations>> { ... }

export async function getPostBySlug(slug: string): Promise<PostWithRelations | null> { ... }

export async function getPublishedPostsByCategory(opts: {
  categorySlug: string;
  page: number;
  pageSize: number;
}): Promise<PaginatedResult<PostWithRelations>> { ... }

export async function getPublishedPostsByTag(opts: {
  tagSlug: string;
  page: number;
  pageSize: number;
}): Promise<PaginatedResult<PostWithRelations>> { ... }

export async function searchPosts(opts: {
  query: string;
  limit: number;
}): Promise<PostWithRelations[]> { ... }

export async function getAllPostSlugs(): Promise<string[]> { ... }

export async function getPostById(id: string): Promise<Post | null> { ... }

export async function createPost(data: CreatePostInput): Promise<Post> { ... }

export async function updatePost(id: string, data: UpdatePostInput): Promise<Post> { ... }

export async function publishPost(id: string): Promise<Post> { ... }

export async function unpublishPost(id: string): Promise<Post> { ... }

export async function archivePost(id: string): Promise<Post> { ... }

export async function deletePost(id: string): Promise<void> { ... }

export async function getRecentPosts(limit: number): Promise<Post[]> { ... }

export async function getDashboardStats(): Promise<DashboardStats> { ... }
```

```typescript
// src/lib/db/queries/categories.ts

export async function getAllCategories(): Promise<Category[]> { ... }
export async function getCategoryBySlug(slug: string): Promise<Category | null> { ... }
export async function createCategory(data: CreateCategoryInput): Promise<Category> { ... }
export async function updateCategory(id: string, data: UpdateCategoryInput): Promise<Category> { ... }
export async function deleteCategory(id: string): Promise<void> { ... }
export async function categoryNameExists(name: string, excludeId?: string): Promise<boolean> { ... }
```

```typescript
// src/lib/db/queries/tags.ts — mirrors category signatures
export async function getAllTags(): Promise<Tag[]> { ... }
export async function getTagBySlug(slug: string): Promise<Tag | null> { ... }
export async function createTag(data: CreateTagInput): Promise<Tag> { ... }
export async function updateTag(id: string, data: UpdateTagInput): Promise<Tag> { ... }
export async function deleteTag(id: string): Promise<void> { ... }
export async function tagNameExists(name: string, excludeId?: string): Promise<boolean> { ... }
```

```typescript
// src/lib/db/queries/media.ts

export async function createMediaRecord(data: CreateMediaInput): Promise<Media> { ... }
export async function getMediaByUploader(opts: {
  uploaderId: string;
  page: number;
  pageSize: number;
}): Promise<PaginatedResult<Media>> { ... }
export async function getMediaById(id: string): Promise<Media | null> { ... }
export async function deleteMediaRecord(id: string): Promise<void> { ... }
export async function isMediaInUse(mediaId: string): Promise<boolean> { ... }
```

### Example: Post Listing Query

```typescript
// src/lib/db/queries/posts.ts (implementation excerpt)

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
          json_agg(DISTINCT jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug))
            FILTER (WHERE c.id IS NOT NULL),
          '[]'
        ) AS categories,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', t.id, 'name', t.name, 'slug', t.slug))
            FILTER (WHERE t.id IS NOT NULL),
          '[]'
        ) AS tags
      FROM public.posts p
      JOIN public.users u ON u.id = p.author_id
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
```

### Example: Search Query

```typescript
export async function searchPosts(opts: {
  query: string;
  limit: number;
}): Promise<PostWithRelations[]> {
  // Relevance score: count of fields containing the query
  return sql<PostRow[]>`
    SELECT
      p.*,
      u.display_name AS author_display_name,
      u.avatar_url   AS author_avatar_url,
      (
        (p.title    ILIKE ${'%' + opts.query + '%'})::int +
        (p.excerpt  ILIKE ${'%' + opts.query + '%'})::int +
        (p.content  ILIKE ${'%' + opts.query + '%'})::int
      ) AS relevance
    FROM public.posts p
    JOIN public.users u ON u.id = p.author_id
    WHERE p.status = 'PUBLISHED'
      AND (
        p.title   ILIKE ${'%' + opts.query + '%'} OR
        p.excerpt ILIKE ${'%' + opts.query + '%'} OR
        p.content ILIKE ${'%' + opts.query + '%'}
      )
    ORDER BY relevance DESC, p.published_at DESC
    LIMIT ${opts.limit}
  `;
}
```

> **Note:** Postgres.js tagged template literals use `${}` interpolations that are automatically passed as parameterized values — the values are never concatenated into the SQL string. This satisfies the SQL injection prevention requirement (Req 16).

---

## Authentication Design

### Architecture

Authentication uses Supabase Auth with the `@supabase/ssr` package, which stores session tokens in HTTP-only cookies managed server-side.

```mermaid
graph LR
    Browser -->|POST credentials| LoginAction["Server Action\nauth/login"]
    LoginAction -->|signInWithPassword| SupabaseAuth
    SupabaseAuth -->|Access + Refresh tokens| SSRLib["@supabase/ssr"]
    SSRLib -->|Set-Cookie: HTTP-only, Secure, SameSite=Lax| Browser
    Browser -->|Cookie on every request| Middleware
    Middleware -->|getUser()| SupabaseAuth
    SupabaseAuth -->|Valid session| Middleware
    Middleware -->|Forward| Route
```

### Supabase Client Factories

```typescript
// src/lib/auth/supabase-server.ts
// Used in Server Components, Server Actions, Route Handlers

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createSupabaseServerClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, {
              ...options,
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
            });
          });
        },
      },
    },
  );
}
```

```typescript
// src/lib/auth/session.ts

import { createSupabaseServerClient } from './supabase-server';
import { getUserById } from '../db/queries/users';

export async function getServerSession() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;

  // Fetch role from our users table (not from JWT claims)
  const dbUser = await getUserById(user.id);
  if (!dbUser) return null;

  return { ...user, role: dbUser.role };
}
```

### Middleware

```typescript
// middleware.ts

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  // 1. Refresh session if needed (must happen on every request)
  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 2. Protect /admin/** routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      const redirectUrl = new URL('/auth/login', request.url);
      redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // 3. Set security headers (see Security Design section)
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  response.headers.set('x-nonce', nonce);
  response.headers.set('Content-Security-Policy', buildCSP(nonce));
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains',
  );

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

### Session Lifecycle

| Event           | Mechanism                                                                                                                                       |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Login           | Server Action calls `supabase.auth.signInWithPassword()`, tokens written to HTTP-only cookies                                                   |
| Session refresh | Middleware calls `supabase.auth.getUser()` on every request, which transparently refreshes expired access tokens using the refresh token cookie |
| Logout          | Server Action calls `supabase.auth.signOut()`, cookies cleared                                                                                  |
| Password reset  | Supabase sends magic link email; `update-password/page.tsx` handles the token exchange                                                          |
| Rate limiting   | Supabase Auth enforces brute-force protection (5 failures / 10 minutes → 15-minute block)                                                       |

---

## Authorization / RBAC Design

Authorization is enforced in three layers: middleware (coarse routing), Server Action guards (fine-grained), and PostgreSQL RLS (database-level backstop).

### Role Hierarchy

```
ADMIN > EDITOR > USER

ADMIN:  Full access — all EDITOR permissions + user management + settings
EDITOR: Create/edit/delete own posts, manage categories/tags, upload media
USER:   No admin access (HTTP 403 on any /admin/** route)
```

### isAuthorized Function

```typescript
// src/lib/authz/roles.ts

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

const ROLE_PERMISSIONS: Record<UserRole, Set<Action>> = {
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
  USER: new Set(),
};

export function isAuthorized(role: UserRole, action: Action): boolean {
  return ROLE_PERMISSIONS[role]?.has(action) ?? false;
}
```

### Guard Functions

```typescript
// src/lib/authz/guards.ts

export async function requireRole(action: Action): Promise<SessionUser> {
  const session = await getServerSession();
  if (!session) {
    throw new AuthError('UNAUTHENTICATED', 401);
  }
  if (!isAuthorized(session.role, action)) {
    throw new AuthError('FORBIDDEN', 403);
  }
  return session;
}

export async function requireOwnership(
  resourceOwnerId: string,
  action: Action,
): Promise<SessionUser> {
  const session = await requireRole(action);
  // ADMIN can act on any resource
  if (session.role === 'ADMIN') return session;
  // Non-ADMIN must own the resource
  if (session.id !== resourceOwnerId) {
    throw new AuthError('FORBIDDEN', 403);
  }
  return session;
}
```

Every Server Action calls `requireRole()` or `requireOwnership()` as its first operation before touching any data.

---

## Public Blog Pages Design

### Data Fetching Strategy

| Route                | Strategy                        | Revalidation                                       |
| -------------------- | ------------------------------- | -------------------------------------------------- |
| `/` (post list)      | ISR (`revalidate: 60`)          | On publish/update via `revalidateTag('posts')`     |
| `/posts/[slug]`      | ISR (`revalidate: 60`)          | On post update via `revalidateTag('post-' + slug)` |
| `/categories/[slug]` | ISR (`revalidate: 60`)          | On category/post change                            |
| `/tags/[slug]`       | ISR (`revalidate: 60`)          | On tag/post change                                 |
| `/search`            | Dynamic (no cache)              | N/A — always fresh                                 |
| `/about`             | Static                          | On deployment                                      |
| `/sitemap.xml`       | Dynamic with `revalidate: 3600` | Hourly                                             |

### Key Page Implementations

```typescript
// src/app/(public)/posts/[slug]/page.tsx (Server Component)

import { getPostBySlug } from '@/lib/db/queries/posts';
import { renderMarkdown } from '@/lib/content/markdown';
import { generatePostMetadata } from '@/lib/seo/metadata';
import { notFound } from 'next/navigation';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: { slug: string } }) {
  return generatePostMetadata(params.slug);
}

export async function generateStaticParams() {
  const slugs = await getAllPostSlugs();
  return slugs.map((slug) => ({ slug }));
}

export default async function PostDetailPage({ params }: { params: { slug: string } }) {
  const post = await getPostBySlug(params.slug);
  // Returns 404 for drafts, archived, or non-existent posts (Req 1.3)
  if (!post || post.status !== 'PUBLISHED') notFound();

  const htmlContent = await renderMarkdown(post.content ?? '');

  return (
    <article>
      {/* JSON-LD structured data injected via generateMetadata */}
      <PostHeader post={post} />
      {post.cover_image_url && (
        <Image src={post.cover_image_url} alt={post.title} ... />
      )}
      <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
    </article>
  );
}
```

### Pagination Strategy

- Page number passed as URL search param: `?page=2`
- `notFound()` called when `page > totalPages` (Req 1.9)
- `generateStaticParams` pre-builds page 1; subsequent pages served via ISR

---

## Admin Panel Design

### Layout and Protection

The `(admin)` route group layout performs a secondary authorization check — middleware handles redirection for unauthenticated users, but the layout verifies the role for authenticated users with insufficient permissions:

```typescript
// src/app/(admin)/layout.tsx

export default async function AdminLayout({ children }) {
  const session = await getServerSession();
  // Middleware already redirected unauthenticated requests.
  // This is a defense-in-depth check.
  if (!session || session.role === 'USER') {
    redirect('/auth/login');
  }
  return (
    <div className="flex h-screen">
      <Sidebar role={session.role} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
```

### Server Actions

All mutations go through Server Actions in `src/actions/`. Each action:

1. Calls `requireRole()` as first statement
2. Parses form data with Zod
3. Delegates business logic to `src/lib/services/`
4. Calls `revalidateTag()` for affected cache entries
5. Redirects or returns typed result

```typescript
// src/actions/posts.ts

'use server';

import { requireRole } from '@/lib/authz/guards';
import { CreatePostSchema } from '@/lib/validation/schemas/post';
import { createPostService } from '@/lib/services/posts';
import { revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createPostAction(formData: FormData) {
  const session = await requireRole('post:create');

  const parsed = CreatePostSchema.safeParse({
    title: formData.get('title'),
    content: formData.get('content'),
    excerpt: formData.get('excerpt'),
    cover_image_url: formData.get('cover_image_url'),
    category_ids: formData.getAll('category_ids'),
    tag_ids: formData.getAll('tag_ids'),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten() };
  }

  const post = await createPostService({
    ...parsed.data,
    author_id: session.id,
  });

  revalidateTag('posts');
  redirect(`/admin/posts/${post.id}`);
}
```

---

## Content Editor Design

### Markdown Rendering Pipeline

```
User Input (Markdown string)
    │
    ▼
remark.parse()          → mdast (Markdown AST)
    │
    ▼
remark-gfm              → GitHub Flavored Markdown support
    │
    ▼
remark-rehype           → hast (HTML AST)
    │
    ▼
rehype-sanitize         → strip dangerous elements (XSS prevention)
    │
    ▼
rehype-stringify        → HTML string
    │
    ▼
Return sanitized HTML string
```

```typescript
// src/lib/content/markdown.ts

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';

// Strict sanitization schema — extends defaultSchema to block all dangerous patterns
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    // Strip all on* event handler attributes
    '*': (defaultSchema.attributes?.['*'] ?? []).filter(
      (attr) => typeof attr === 'string' && !attr.startsWith('on'),
    ),
    // Only allow safe href/src protocols
    a: [['href', /^(?!javascript:)/i]],
    img: [['src', /^(?!javascript:|data:)/i], 'alt', 'title'],
  },
  // Disallow script, style, and iframe entirely
  tagNames: (defaultSchema.tagNames ?? []).filter(
    (tag) => !['script', 'style', 'iframe', 'object', 'embed'].includes(tag),
  ),
  strip: ['script', 'style'],
  clobber: [],
};

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: false })
  .use(rehypeSanitize, sanitizeSchema)
  .use(rehypeStringify);

export async function renderMarkdown(markdown: string): Promise<string> {
  const file = await processor.process(markdown);
  return String(file);
}
```

### Live Preview Editor

The Markdown editor is a Client Component with a debounced preview that fetches rendered HTML from a Route Handler:

```typescript
// src/components/admin/MarkdownEditor.tsx  'use client'

// Debounce: 500ms after user stops typing
// Preview: calls POST /api/preview with { markdown } body
// Returns: { html: string }
// Renders preview in a sandboxed div with prose styling
```

```typescript
// src/app/api/preview/route.ts  (Route Handler, POST)
// Auth-gated: only authenticated users can use preview
// Accepts: { markdown: string }
// Returns: { html: string }
// Uses the same renderMarkdown() pipeline — identical sanitization
```

---

## Media Upload Design

### Upload Flow

```mermaid
sequenceDiagram
    participant B as Browser
    participant SA as Server Action
    participant V as Validator
    participant SS as Supabase Storage
    participant DB as Database

    B->>SA: upload(file: File)
    SA->>SA: requireRole('media:upload')
    SA->>V: validateMediaUpload({ mimeType, sizeBytes })
    V-->>SA: valid / invalid
    alt Validation fails
        SA-->>B: { error: "..." }
    else Valid
        SA->>SS: storage.from('media').upload(path, file)
        SS-->>SA: { path } or error
        alt Storage error
            SA-->>B: { error: "Upload failed" }
        else Storage success
            SA->>DB: INSERT INTO media (...)
            DB-->>SA: media row
            alt DB error
                SA->>SS: storage.from('media').remove([path])
                SA-->>B: { error: "Upload failed" }
            else DB success
                SA-->>B: { media, url }
            end
        end
    end
```

### Storage Path Convention

```
media/{uploader_id}/{year}/{month}/{uuid}-{original-filename}
```

### Media Service

```typescript
// src/lib/services/media.ts

export async function uploadMedia(opts: {
  file: File;
  uploaderId: string;
}): Promise<{ media: Media; url: string }> {
  // 1. Validate MIME type and size (CP-10)
  const validation = MediaUploadSchema.safeParse({
    mime_type: opts.file.type,
    size_bytes: opts.file.size,
  });
  if (!validation.success) throw new ValidationError(validation.error);

  // 2. Generate storage path
  const ext = opts.file.name.split('.').pop();
  const storagePath = `media/${opts.uploaderId}/${year}/${month}/${uuid}.${ext}`;

  // 3. Upload to Supabase Storage
  const supabase = createSupabaseServerClient();
  const { error: storageError } = await supabase.storage
    .from('blog-media')
    .upload(storagePath, opts.file, {
      contentType: opts.file.type,
      upsert: false,
    });

  if (storageError) throw new StorageError(storageError.message);

  // 4. Insert DB record (rollback storage on failure)
  try {
    const media = await createMediaRecord({
      uploader_id: opts.uploaderId,
      filename: opts.file.name,
      storage_path: storagePath,
      mime_type: opts.file.type,
      size_bytes: opts.file.size,
    });
    const {
      data: { publicUrl },
    } = supabase.storage.from('blog-media').getPublicUrl(storagePath);
    return { media, url: publicUrl };
  } catch (dbError) {
    // Compensating transaction: remove orphaned file
    await supabase.storage.from('blog-media').remove([storagePath]);
    throw dbError;
  }
}
```

---

## SEO Implementation Design

### Metadata API

```typescript
// src/lib/seo/metadata.ts

import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://yourblog.com';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.jpg`;

export async function generatePostMetadata(slug: string): Promise<Metadata> {
  const post = await getPostBySlug(slug);
  if (!post) return {};

  const title = post.title.slice(0, 60);
  const description = (post.excerpt ?? post.content?.slice(0, 160) ?? '').slice(
    0,
    160,
  );
  const ogImage = post.cover_image_url ?? DEFAULT_OG_IMAGE;
  const url = `${SITE_URL}/posts/${post.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'article',
      images: [{ url: ogImage }],
      publishedTime: post.published_at ?? undefined,
      authors: [post.author?.display_name ?? 'Author'],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
    // JSON-LD injected via <script type="application/ld+json">
    other: {
      'script:ld+json': JSON.stringify(buildBlogPostingJsonLd(post, url)),
    },
  };
}
```

### JSON-LD

```typescript
// src/lib/seo/jsonld.ts

export function buildBlogPostingJsonLd(post: PostWithRelations, url: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt ?? '',
    url,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: {
      '@type': 'Person',
      name: post.author?.display_name ?? 'Author',
    },
    image: post.cover_image_url ?? undefined,
  };
}
```

### Sitemap

```typescript
// src/app/sitemap.ts

import { MetadataRoute } from 'next';
import { getAllPostSlugs } from '@/lib/db/queries/posts';

export const revalidate = 3600; // regenerate hourly

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await getAllPostSlugs();
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL!;

  return slugs.map((slug) => ({
    url: `${SITE_URL}/posts/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));
}
```

### Robots.txt

```typescript
// src/app/robots.ts

import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: '/admin/' }],
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL}/sitemap.xml`,
  };
}
```

---

## Security Design

### Content Security Policy

The CSP is built per-request in middleware using a random nonce. The nonce is passed via a response header (`x-nonce`) for Server Components to embed in `<script>` tags.

```typescript
function buildCSP(nonce: string): string {
  const directives = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'unsafe-inline'`, // Tailwind requires unsafe-inline
    `img-src 'self' data: blob: https:`, // For remote cover images
    `font-src 'self'`,
    `connect-src 'self' https://*.supabase.co`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `upgrade-insecure-requests`,
  ];
  return directives.join('; ');
}
```

### CSRF Protection

Next.js Server Actions have built-in CSRF protection via the `Origin` header check — the framework rejects cross-origin action invocations. For additional defense:

- Server Actions only accept `application/x-www-form-urlencoded` or `multipart/form-data` from the same origin
- The `SameSite=Lax` cookie attribute prevents cross-site cookie transmission in most cases
- Custom CSRF token for the admin panel's direct form submissions (where Server Actions aren't used)

```typescript
// CSRF token implementation for non-Server Action forms
// Token generated per-session and stored in a separate non-HttpOnly cookie
// Verified server-side in route handlers
```

### Input Validation with Zod

```typescript
// src/lib/validation/schemas/post.ts

import { z } from 'zod';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const PostSlugSchema = z
  .string()
  .min(1)
  .max(255)
  .regex(
    SLUG_PATTERN,
    'Slug must contain only lowercase letters, numbers, and hyphens',
  );

export const CreatePostSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title must be 255 characters or fewer')
    .refine((s) => s.trim().length > 0, 'Title cannot be whitespace only'),
  content: z
    .string()
    .min(1, 'Content is required')
    .refine((s) => s.trim().length > 0, 'Content cannot be whitespace only'),
  excerpt: z.string().max(500).optional().nullable(),
  cover_image_url: z.string().url().max(2048).optional().nullable(),
  category_ids: z.array(z.string().uuid()).default([]),
  tag_ids: z.array(z.string().uuid()).default([]),
});

export const UpdatePostSchema = CreatePostSchema.partial().extend({
  slug: PostSlugSchema.optional(),
});

export const MediaUploadSchema = z.object({
  mime_type: z.enum([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif',
  ]),
  size_bytes: z
    .number()
    .int()
    .min(1)
    .max(10_485_760, 'File size must not exceed 10 MB'),
});

export const SearchQuerySchema = z.object({
  q: z
    .string()
    .min(1, 'Query cannot be empty')
    .max(200, 'Query must be 200 characters or fewer'),
});

export const UUIDSchema = z.string().uuid('Invalid UUID format');
```

### Slug Generation

```typescript
// src/lib/slug.ts

/**
 * Converts any string to a URL-safe slug.
 * Idempotent: generateSlug(generateSlug(x)) === generateSlug(x) (CP-1)
 * Character invariant: output matches /^[a-z0-9][a-z0-9-]*[a-z0-9]$/ or /^[a-z0-9]$/ (CP-2)
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD') // decompose unicode
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^a-z0-9\s-]/g, '') // keep alphanumeric + spaces + hyphens
    .trim()
    .replace(/[\s-]+/g, '-') // collapse spaces/hyphens to single hyphen
    .replace(/^-+|-+$/g, ''); // trim leading/trailing hyphens
}

/**
 * Ensures slug uniqueness by appending -2, -3, ... up to -999.
 */
export async function ensureUniqueSlug(
  baseSlug: string,
  existsCheck: (slug: string) => Promise<boolean>,
  excludeId?: string,
): Promise<string> {
  if (!(await existsCheck(baseSlug))) return baseSlug;

  for (let i = 2; i <= 999; i++) {
    const candidate = `${baseSlug}-${i}`;
    if (!(await existsCheck(candidate))) return candidate;
  }

  throw new Error(`Could not generate unique slug for base: ${baseSlug}`);
}
```

---

## SQL Migration Strategy

### File Structure

```
supabase/
├── migrations/
│   ├── 20240101000000_initial_schema.sql        # tables, indexes, triggers
│   ├── 20240101000001_rls_policies.sql          # RLS enable + policies
│   ├── 20240101000002_auth_trigger.sql          # auto-create users row on signup
│   └── 20240101000003_seed_categories_tags.sql  # initial taxonomy data
└── seed.sql                                      # dev seed data (≥3 rows per table)
```

### Filename Convention

`YYYYMMDDHHmmss_description.sql` — 14-digit UTC timestamp, description in `[a-z0-9_]{1,60}`.

### Auth Trigger

A database trigger auto-creates a row in `public.users` when a new `auth.users` record is inserted:

```sql
-- supabase/migrations/20240101000002_auth_trigger.sql

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (id, role, display_name)
  VALUES (NEW.id, 'USER', NEW.raw_user_meta_data->>'display_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Down-Migration Comments

```sql
-- 20240101000000_initial_schema.sql

-- DOWN:
-- DROP TRIGGER IF EXISTS posts_updated_at ON public.posts;
-- DROP FUNCTION IF EXISTS public.set_updated_at();
-- DROP TABLE IF EXISTS public.media;
-- DROP TABLE IF EXISTS public.post_tags;
-- DROP TABLE IF EXISTS public.post_categories;
-- DROP TABLE IF EXISTS public.tags;
-- DROP TABLE IF EXISTS public.categories;
-- DROP TABLE IF EXISTS public.posts;
-- DROP TABLE IF EXISTS public.users;
```

### CLI Commands

```bash
# Create a new migration
supabase migration new description_here

# Apply all pending migrations to local dev DB
supabase db push

# Reset local DB and re-run all migrations + seed
supabase db reset

# Verify remote schema matches local migrations
supabase db diff
```

---

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: Slug Idempotence

_For any_ string `title`, applying `generateSlug` twice SHALL produce the same result as applying it once.

```
generateSlug(generateSlug(title)) === generateSlug(title)
```

**Validates: Requirements 3.9, 11.1, 12.1, 12.2**

---

### Property 2: Slug Character Invariant

_For any_ non-empty string `title` that produces a non-empty slug, `generateSlug(title)` SHALL produce a string that: contains only characters from `[a-z0-9-]`, does not begin or end with a hyphen, and does not contain consecutive hyphens.

**Validates: Requirements 3.9, 6.12, 11.9**

---

### Property 3: Markdown Sanitization — XSS Safety Invariant

_For any_ arbitrary string `input` (including inputs crafted with `<script>`, `onerror=`, `javascript:`, or `data:` URIs), the rendered output of `renderMarkdown(input)` SHALL NOT contain any `<script>` element, any attribute whose name matches `on[a-z]+`, or any `javascript:` or `data:` protocol in any `href` or `src` attribute.

**Validates: Requirements 1.7, 14.5**

---

### Property 4: Zod Validator — Invalid Input Rejection

_For any_ input object where at least one field violates a schema constraint (empty required field, title exceeding 255 characters, invalid slug pattern, file size exceeding 10 MB, unsupported MIME type), `Schema.safeParse(input).success` SHALL be `false` and the error SHALL contain at least one field-level issue.

**Validates: Requirements 11.9, 11.11, 13.1, 13.2, 14.1, 14.2**

---

### Property 5: Zod Validator — Valid Input Round-Trip

_For any_ input object that passes `Schema.safeParse(input).success === true`, parsing the object, serializing to JSON, and re-parsing SHALL produce an output that is deeply equal to the first parse result:

```
schema.parse(JSON.parse(JSON.stringify(schema.parse(input)))) deepEquals schema.parse(input)
```

**Validates: Requirements 14.1, 14.4**

---

### Property 6: RBAC — Role Permission Invariant

_For any_ user with role `USER`, `isAuthorized(role, action)` SHALL return `false` for every admin and editor action. _For any_ user with role `EDITOR`, `isAuthorized(role, 'user:manage')` and `isAuthorized(role, 'settings:manage')` SHALL return `false`. This invariant SHALL hold regardless of the order in which permissions are checked.

**Validates: Requirements 9.1, 9.2, 9.3, 9.5**

---

### Property 7: Post Status Transition Invariants

_For any_ Post record in any valid state, the following SHALL hold after each transition:

- After publish: `post.status === 'PUBLISHED'` and `post.published_at !== null`
- After unpublish: `post.status === 'DRAFT'` and `post.published_at` equals the value it held before unpublishing
- After archive: `post.status === 'ARCHIVED'`

**Validates: Requirements 11.3, 11.4, 11.5**

---

### Property 8: Pagination Completeness Invariant

_For any_ collection of `N` published posts and page size `P > 0`, the sum of record counts across all pages SHALL equal `N`, each page SHALL contain at most `P` records, and the union of all record IDs across all pages SHALL contain no duplicates.

**Validates: Requirements 1.1, 1.5, 1.6**

---

### Property 9: Parameterized Query — No SQL Injection

_For any_ user-supplied string `input` containing SQL metacharacters (`'`, `"`, `;`, `--`, `/*`, `*/`), executing a Query_Layer function with `input` as a parameter SHALL produce a result equivalent to treating `input` as a literal data value, and SHALL NOT alter query structure, return additional rows, or raise a PostgreSQL syntax error attributable to the content of `input`.

**Validates: Requirements 16.1, 16.2**

---

### Property 10: Media Upload Validation — Boundary Invariant

_For any_ file where `size_bytes > 10485760` OR `mime_type` is not in the allowed set `{image/jpeg, image/png, image/webp, image/gif, image/avif}`, `MediaUploadSchema.safeParse(file).success` SHALL be `false`. _For any_ file where `size_bytes ∈ [1, 10485760]` AND `mime_type` is in the allowed set, `MediaUploadSchema.safeParse(file).success` SHALL be `true`.

**Validates: Requirements 13.1, 13.2, 13.3**

---

## Error Handling

### Error Hierarchy

```typescript
// Application error types

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
    public readonly cause?: unknown,
  ) {
    super(message);
  }
}

export class AuthError extends AppError {
  constructor(code: 'UNAUTHENTICATED' | 'FORBIDDEN', statusCode: 401 | 403) {
    super(
      code === 'UNAUTHENTICATED' ? 'Authentication required' : 'Access denied',
      code,
      statusCode,
    );
  }
}

export class ValidationError extends AppError {
  constructor(public readonly fieldErrors: Record<string, string[]>) {
    super('Validation failed', 'VALIDATION_ERROR', 400);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
  }
}

export class StorageError extends AppError {
  constructor(message: string) {
    super(message, 'STORAGE_ERROR', 500);
  }
}
```

### Error Handling in Routes

- `notFound()` → Next.js renders `not-found.tsx` (404)
- `AuthError(401/403)` → caught in layout or middleware, redirected to sign-in or shown error page
- `ValidationError` → returned from Server Action as `{ error: fieldErrors }`, rendered in form
- Unexpected errors → caught by Next.js `error.tsx` boundary, logged server-side, 500 shown to user (no schema/stack leakage)

### Logging Strategy

- Structured logging via `console.error` in server-side code (captured by Vercel logs)
- Log format: `{ timestamp, level, message, requestId?, userId?, error? }`
- Sensitive data (passwords, tokens, DB connection strings) are never logged
- Revalidation failures are logged as warnings but do not affect the response (Req 5.7)

---

## Testing Strategy

### Framework and Tooling

| Tool                          | Purpose                                                         |
| ----------------------------- | --------------------------------------------------------------- |
| **Vitest**                    | Primary test runner — ESM-native, fast, compatible with Next.js |
| **fast-check**                | Property-based testing (CP-1 through CP-10)                     |
| **@testing-library/react**    | React component testing                                         |
| **MSW (Mock Service Worker)** | Mocking Supabase and external calls in integration tests        |
| **Playwright**                | E2E tests (optional, for critical auth flows)                   |

### Test Configuration

```typescript
// vitest.config.ts

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node', // use 'jsdom' for component tests
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
```

### Test Directory Structure

```
src/
└── test/
    ├── setup.ts                    # Global test setup
    ├── unit/
    │   ├── slug.test.ts            # generateSlug() unit + property tests
    │   ├── markdown.test.ts        # renderMarkdown() + sanitizer tests
    │   ├── validation/
    │   │   ├── post.test.ts        # Post schema unit + property tests
    │   │   ├── category.test.ts
    │   │   ├── tag.test.ts
    │   │   └── media.test.ts       # Media validation boundary tests
    │   └── authz/
    │       └── roles.test.ts       # RBAC role tests
    ├── integration/
    │   ├── auth.test.ts            # Sign-in, session, redirect flows
    │   ├── posts-crud.test.ts      # Post CRUD lifecycle
    │   ├── rbac.test.ts            # RBAC enforcement (403 for EDITOR on /admin/settings)
    │   └── media.test.ts           # Media upload/delete flows
    └── property/
        ├── slug.property.test.ts   # CP-1 idempotence, CP-2 character invariant
        ├── sanitizer.property.test.ts  # CP-3 XSS safety invariant
        ├── validation.property.test.ts # CP-4 invalid rejection, CP-5 round-trip
        ├── rbac.property.test.ts   # CP-6 role permission invariant
        ├── posts.property.test.ts  # CP-7 status transitions, CP-8 pagination
        └── query-layer.property.test.ts # CP-9 SQL injection resistance
```

### Property Test Examples

```typescript
// src/test/property/slug.property.test.ts

import { describe, it } from 'vitest';
import fc from 'fast-check';
import { generateSlug } from '@/lib/slug';

describe('CP-1: Slug Idempotence', () => {
  it(// Feature: personal-blog, Property 1: Slug Idempotence
  'generateSlug applied twice equals applied once for any string', () => {
    fc.assert(
      fc.property(fc.string(), (title) => {
        expect(generateSlug(generateSlug(title))).toBe(generateSlug(title));
      }),
      { numRuns: 1000 },
    );
  });
});

describe('CP-2: Slug Character Invariant', () => {
  it(// Feature: personal-blog, Property 2: Slug Character Invariant
  'generateSlug output contains only [a-z0-9-] with no leading/trailing/consecutive hyphens', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (title) => {
        const slug = generateSlug(title);
        if (slug.length === 0) return; // some inputs produce empty slug (all special chars)
        expect(slug).toMatch(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/);
        expect(slug).not.toMatch(/--/);
      }),
      { numRuns: 1000 },
    );
  });
});
```

```typescript
// src/test/property/validation.property.test.ts

import fc from 'fast-check';
import { CreatePostSchema } from '@/lib/validation/schemas/post';

describe('CP-4: Zod Validator — Invalid Input Rejection', () => {
  it(// Feature: personal-blog, Property 4: Zod Validator Invalid Input Rejection
  'schema rejects any input with an empty or whitespace-only title', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^\s*$/), // whitespace-only strings
        fc.string({ minLength: 1 }),
        (title, content) => {
          const result = CreatePostSchema.safeParse({ title, content });
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.issues.some((i) => i.path[0] === 'title')).toBe(
              true,
            );
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});

describe('CP-5: Zod Validator — Valid Input Round-Trip', () => {
  it(// Feature: personal-blog, Property 5: Zod Validator Valid Input Round-Trip
  'valid input survives JSON serialization round-trip', () => {
    fc.assert(
      fc.property(
        fc.record({
          title: fc
            .string({ minLength: 1, maxLength: 255 })
            .filter((s) => s.trim().length > 0),
          content: fc
            .string({ minLength: 1 })
            .filter((s) => s.trim().length > 0),
        }),
        (input) => {
          const first = CreatePostSchema.safeParse(input);
          if (!first.success) return; // skip genuinely invalid inputs
          const second = CreatePostSchema.safeParse(
            JSON.parse(JSON.stringify(first.data)),
          );
          expect(second.success).toBe(true);
          if (second.success) {
            expect(second.data).toEqual(first.data);
          }
        },
      ),
      { numRuns: 500 },
    );
  });
});
```

### Unit Test Examples

```typescript
// src/test/unit/markdown.test.ts

describe('Sanitizer — XSS Prevention', () => {
  const xssPayloads = [
    '<script>alert(1)</script>',
    '<img onerror="alert(1)" src="x">',
    '<a href="javascript:alert(1)">click</a>',
    '<div onload="steal()">text</div>',
    '<iframe src="data:text/html,<script>alert(1)</script>">',
  ];

  it.each(xssPayloads)('sanitizes XSS payload: %s', async (payload) => {
    const html = await renderMarkdown(payload);
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/\son\w+=/i);
    expect(html).not.toMatch(/javascript:/i);
    expect(html).not.toMatch(/data:text\/html/i);
  });
});
```

### Integration Test Examples

```typescript
// src/test/integration/auth.test.ts

describe('Authentication', () => {
  it('POST /admin/** redirects unauthenticated users to /auth/login', async () => {
    const response = await fetch(`${BASE_URL}/admin`, { redirect: 'manual' });
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/auth/login');
  });

  it('authenticated EDITOR cannot access /admin/settings (HTTP 403)', async () => {
    const editorSession = await signInAs('editor');
    const response = await fetch(`${BASE_URL}/admin/settings`, {
      headers: { Cookie: editorSession.cookie },
    });
    expect(response.status).toBe(403);
  });
});
```

---

## Deployment Architecture

### Environment Variables

```bash
# .env.example

# Supabase project URL
SUPABASE_URL=https://your-project-ref.supabase.co

# Supabase anonymous key (safe for server-side only — do NOT use NEXT_PUBLIC_)
SUPABASE_ANON_KEY=your-anon-key-here

# Supabase service role key (server-side only — never expose to browser)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Postgres.js connection string via Transaction Pooler (port 6543)
# Add ?pgbouncer=true for compatibility
DATABASE_URL=postgresql://postgres.your-project-ref:password@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true

# Site URL for canonical links and Open Graph
NEXT_PUBLIC_SITE_URL=https://yourblog.com
```

> **Critical:** No variable name uses the `NEXT_PUBLIC_` prefix for secrets. `NEXT_PUBLIC_SITE_URL` is the only public-facing variable and contains no credentials.

### Startup Validation

```typescript
// src/lib/env.ts (imported in instrumentation.ts or server-only module)

const REQUIRED_ENV_VARS = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DATABASE_URL',
] as const;

export function validateEnv(): void {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
    process.exit(1);
  }
}
```

### Vercel Deployment Configuration

```typescript
// next.config.ts

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Force HTTPS redirects (handled by Vercel, but explicit for local)
  async redirects() {
    return process.env.NODE_ENV === 'production'
      ? [
          {
            source: '/:path*',
            has: [{ type: 'header', key: 'x-forwarded-proto', value: 'http' }],
            destination: 'https://:host/:path*',
            permanent: true,
          },
        ]
      : [];
  },
  images: {
    formats: ['image/avif', 'image/webp'], // Next/Image optimization (Req 5.4)
    remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co' }],
  },
  // ISR configuration — revalidation via tags handled per-route
  experimental: {
    serverActions: { bodySizeLimit: '10mb' }, // for media uploads via Server Actions
  },
};

export default nextConfig;
```

### Connection Pooling

| Connection Type                       | Port | Use Case                                          |
| ------------------------------------- | ---- | ------------------------------------------------- |
| Transaction Pooler (`pgbouncer=true`) | 6543 | Vercel serverless functions (application queries) |
| Session Pooler                        | 5432 | Supabase CLI migrations (requires session mode)   |
| Direct connection                     | 5432 | Local development only                            |

The `DATABASE_URL` environment variable uses the Transaction Pooler string (port 6543) for all application code. The Supabase CLI uses its own direct connection credentials for migrations.

---

## Performance Design

### Caching Strategy

```mermaid
graph LR
    Request --> CDN
    CDN -->|Hit| CachedHTML["Cached HTML\n(Vercel Edge)"]
    CDN -->|Miss/Stale| Next
    Next --> FetchData["Fetch from DB\n(unstable_cache + tags)"]
    FetchData --> Render
    Render --> CDN

    PublishAction["Publish/Update\n(Server Action)"] -->|revalidateTag| CDN
```

### Cache Tag Strategy

| Data             | Cache Tag               | Revalidated When                    |
| ---------------- | ----------------------- | ----------------------------------- |
| Post list        | `posts`                 | Any post published/updated/deleted  |
| Post detail      | `post-{slug}`           | That specific post updated          |
| Category listing | `posts-category-{slug}` | Post assigned/removed from category |
| Tag listing      | `posts-tag-{slug}`      | Post assigned/removed from tag      |
| Dashboard stats  | `admin-stats`           | Any content change                  |

```typescript
// Example: cached query with tag
import { unstable_cache } from 'next/cache';

export const getCachedPublishedPosts = unstable_cache(
  getPublishedPosts,
  ['published-posts'],
  { tags: ['posts'], revalidate: 60 },
);
```

### Image Optimization

All images served via `next/image` component:

- Automatic WebP/AVIF conversion (Req 5.4)
- Lazy loading by default
- `priority` prop on above-the-fold images (post detail cover)
- `sizes` prop for responsive images
- Placeholder: `placeholder="blur"` with low-res data URL, or `placeholder="empty"` fallback

### Fallback Behavior

- Cover image unavailable → placeholder image rendered (Req 5.8)
- Revalidation failure → stale cache served, error logged (Req 5.7)
- DB unavailable during admin action → error returned, no partial write (Req 11.12)
