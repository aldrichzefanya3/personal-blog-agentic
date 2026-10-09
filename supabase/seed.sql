BEGIN;

-- ============================================================
-- AUTH.USERS
-- ============================================================

INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  aud,
  role,
  raw_app_meta_data,
  raw_user_meta_data
)
VALUES
  (
    'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'::uuid,
    'admin@example.com',
    '$2a$10$placeholderHashForSeedDataOnlyDoNotUseInProduction0001',
    now(),
    now(),
    now(),
    'authenticated',
    'authenticated',
    '{"managed_role":"ADMIN"}'::jsonb,
    '{"display_name":"Alice Admin"}'::jsonb
  ),
  (
    'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'::uuid,
    'editor@example.com',
    '$2a$10$placeholderHashForSeedDataOnlyDoNotUseInProduction0002',
    now(),
    now(),
    now(),
    'authenticated',
    'authenticated',
    '{"managed_role":"EDITOR"}'::jsonb,
    '{"display_name":"Edward Editor"}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- PUBLIC.USERS
-- ============================================================
UPDATE public.users
SET bio = CASE id
      WHEN 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'::uuid
        THEN 'Platform administrator with full access to all features.'
      WHEN 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'::uuid
        THEN 'Content editor responsible for reviewing and publishing posts.'
      ELSE bio
    END,
    avatar_url = CASE id
      WHEN 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'::uuid
        THEN 'https://example.com/avatars/alice.webp'
      WHEN 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'::uuid
        THEN 'https://example.com/avatars/edward.webp'
      ELSE avatar_url
    END
WHERE id IN (
  'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'::uuid,
  'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'::uuid
);


-- ============================================================
-- PUBLIC.CATEGORIES
-- ============================================================

INSERT INTO public.categories (
  id,
  name,
  slug
)
VALUES
  (
    'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f'::uuid,
    'Technology',
    'technology'
  ),
  (
    'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a'::uuid,
    'Programming',
    'programming'
  ),
  (
    'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b'::uuid,
    'DevOps',
    'devops'
  )
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- PUBLIC.TAGS
-- ============================================================

INSERT INTO public.tags (
  id,
  name,
  slug
)
VALUES
  (
    'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c'::uuid,
    'Next.js',
    'nextjs'
  ),
  (
    'a7b8c9d0-e1f2-4a3b-4c5d-6e7f8a9b0c1d'::uuid,
    'TypeScript',
    'typescript'
  ),
  (
    'b8c9d0e1-f2a3-4b4c-5d6e-7f8a9b0c1d2e'::uuid,
    'PostgreSQL',
    'postgresql'
  )
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- PUBLIC.POSTS
-- ============================================================

INSERT INTO public.posts (
  id,
  title,
  slug,
  excerpt,
  content,
  cover_image_url,
  author_id,
  status,
  published_at
)
VALUES
  (
    'c9d0e1f2-a3b4-4c5d-6e7f-8a9b0c1d2e3f'::uuid,
    'Getting Started with Next.js and TypeScript',
    'getting-started-with-nextjs-and-typescript',
    'A practical introduction to building type-safe web apps with Next.js App Router and TypeScript.',
    E'# Getting Started with Next.js and TypeScript

Next.js and TypeScript are a powerful combination for building modern web applications.

## Why TypeScript?

TypeScript adds static type checking to JavaScript, catching errors at compile time rather than runtime.

## Setting Up

npx create-next-app@latest my-app --typescript

This scaffolds a project with TypeScript configured out of the box.',
    'https://example.com/covers/nextjs-typescript.webp',
    'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'::uuid,
    'PUBLISHED',
    '2024-01-15 09:00:00+00'
  ),
  (
    'd0e1f2a3-b4c5-4d6e-7f8a-9b0c1d2e3f4a'::uuid,
    'PostgreSQL Performance Tuning Basics',
    'postgresql-performance-tuning-basics',
    'Key strategies for improving query performance in PostgreSQL, covering indexes, EXPLAIN, and connection pooling.',
    E'# PostgreSQL Performance Tuning Basics

Understanding how PostgreSQL executes queries is the first step toward meaningful optimisations.

## Using EXPLAIN ANALYZE

Run EXPLAIN ANALYZE before any query you want to optimise. Look for sequential scans on large tables as the first target for indexing.

## Index Types

- B-tree — the default; great for equality and range queries.
- GIN — ideal for full-text search and JSONB columns.
- BRIN — efficient for naturally ordered columns like timestamps.',
    'https://example.com/covers/postgresql-perf.webp',
    'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'::uuid,
    'PUBLISHED',
    '2024-02-20 10:30:00+00'
  ),
  (
    'e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b'::uuid,
    'Introduction to Docker and Container Orchestration',
    'introduction-to-docker-and-container-orchestration',
    'Learn the fundamentals of Docker containers and how orchestration tools like Kubernetes manage them at scale.',
    E'# Introduction to Docker and Container Orchestration

Containers have transformed how we build and deploy software.

## What Is Docker?

Docker packages an application and all its dependencies into a lightweight, portable container image.

## Basic Commands

docker build -t my-app .
docker run -p 8000:8000 my-app

## Orchestration

When you need to run many containers across multiple hosts, orchestration tools like Kubernetes schedule, scale, and heal containers automatically.',
    NULL,
    'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'::uuid,
    'DRAFT',
    NULL
  )
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- PUBLIC.POST_CATEGORIES
-- ============================================================

INSERT INTO public.post_categories (
  post_id,
  category_id
)
VALUES
  (
    'c9d0e1f2-a3b4-4c5d-6e7f-8a9b0c1d2e3f'::uuid,
    'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f'::uuid
  ),
  (
    'd0e1f2a3-b4c5-4d6e-7f8a-9b0c1d2e3f4a'::uuid,
    'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a'::uuid
  ),
  (
    'e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b'::uuid,
    'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b'::uuid
  )
ON CONFLICT DO NOTHING;


-- ============================================================
-- PUBLIC.POST_TAGS
-- ============================================================

INSERT INTO public.post_tags (
  post_id,
  tag_id
)
VALUES
  (
    'c9d0e1f2-a3b4-4c5d-6e7f-8a9b0c1d2e3f'::uuid,
    'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c'::uuid
  ),
  (
    'd0e1f2a3-b4c5-4d6e-7f8a-9b0c1d2e3f4a'::uuid,
    'b8c9d0e1-f2a3-4b4c-5d6e-7f8a9b0c1d2e'::uuid
  ),
  (
    'e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b'::uuid,
    'a7b8c9d0-e1f2-4a3b-4c5d-6e7f8a9b0c1d'::uuid
  )
ON CONFLICT DO NOTHING;


-- ============================================================
-- PUBLIC.MEDIA
-- ============================================================

INSERT INTO public.media (
  id,
  uploader_id,
  filename,
  storage_path,
  mime_type,
  size_bytes
)
VALUES
  (
    'f2a3b4c5-d6e7-4f8a-9b0c-1d2e3f4a5b6c'::uuid,
    'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'::uuid,
    'nextjs-typescript-cover.webp',
    'covers/nextjs-typescript-cover.webp',
    'image/webp',
    245760
  ),
  (
    'a3b4c5d6-e7f8-4a9b-0c1d-2e3f4a5b6c7d'::uuid,
    'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'::uuid,
    'postgresql-perf-cover.webp',
    'covers/postgresql-perf-cover.webp',
    'image/webp',
    189440
  ),
  (
    'b4c5d6e7-f8a9-4b0c-1d2e-3f4a5b6c7d8e'::uuid,
    'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'::uuid,
    'docker-intro-cover.png',
    'covers/docker-intro-cover.png',
    'image/png',
    312320
  )
ON CONFLICT (id) DO NOTHING;


COMMIT;
