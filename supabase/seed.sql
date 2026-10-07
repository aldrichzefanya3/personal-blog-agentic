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
  role
)
VALUES
  (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'admin@example.com',
    '$2a$10$placeholderHashForSeedDataOnlyDoNotUseInProduction0001',
    now(),
    now(),
    now(),
    'authenticated',
    'authenticated'
  ),
  (
    '00000000-0000-0000-0000-000000000002'::uuid,
    'editor@example.com',
    '$2a$10$placeholderHashForSeedDataOnlyDoNotUseInProduction0002',
    now(),
    now(),
    now(),
    'authenticated',
    'authenticated'
  ),
  (
    '00000000-0000-0000-0000-000000000003'::uuid,
    'user@example.com',
    '$2a$10$placeholderHashForSeedDataOnlyDoNotUseInProduction0003',
    now(),
    now(),
    now(),
    'authenticated',
    'authenticated'
  )
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- PUBLIC.USERS
-- ============================================================

INSERT INTO public.users (
  id,
  role,
  display_name,
  bio,
  avatar_url
)
VALUES
  (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'ADMIN',
    'Alice Admin',
    'Platform administrator with full access to all features.',
    'https://example.com/avatars/alice.webp'
  ),
  (
    '00000000-0000-0000-0000-000000000002'::uuid,
    'EDITOR',
    'Edward Editor',
    'Content editor responsible for reviewing and publishing posts.',
    'https://example.com/avatars/edward.webp'
  ),
  (
    '00000000-0000-0000-0000-000000000003'::uuid,
    'USER',
    'Uma User',
    'Regular reader with no admin panel access.',
    NULL
  )
ON CONFLICT (id) DO NOTHING;


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
    '10000000-0000-0000-0000-000000000001'::uuid,
    'Technology',
    'technology'
  ),
  (
    '10000000-0000-0000-0000-000000000002'::uuid,
    'Programming',
    'programming'
  ),
  (
    '10000000-0000-0000-0000-000000000003'::uuid,
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
    '20000000-0000-0000-0000-000000000001'::uuid,
    'Next.js',
    'nextjs'
  ),
  (
    '20000000-0000-0000-0000-000000000002'::uuid,
    'TypeScript',
    'typescript'
  ),
  (
    '20000000-0000-0000-0000-000000000003'::uuid,
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
    '30000000-0000-0000-0000-000000000001'::uuid,
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
    '00000000-0000-0000-0000-000000000001'::uuid,
    'PUBLISHED',
    '2024-01-15 09:00:00+00'
  ),
  (
    '30000000-0000-0000-0000-000000000002'::uuid,
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
    '00000000-0000-0000-0000-000000000002'::uuid,
    'PUBLISHED',
    '2024-02-20 10:30:00+00'
  ),
  (
    '30000000-0000-0000-0000-000000000003'::uuid,
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
    '00000000-0000-0000-0000-000000000001'::uuid,
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
    '30000000-0000-0000-0000-000000000001'::uuid,
    '10000000-0000-0000-0000-000000000001'::uuid
  ),
  (
    '30000000-0000-0000-0000-000000000002'::uuid,
    '10000000-0000-0000-0000-000000000002'::uuid
  ),
  (
    '30000000-0000-0000-0000-000000000003'::uuid,
    '10000000-0000-0000-0000-000000000003'::uuid
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
    '30000000-0000-0000-0000-000000000001'::uuid,
    '20000000-0000-0000-0000-000000000001'::uuid
  ),
  (
    '30000000-0000-0000-0000-000000000002'::uuid,
    '20000000-0000-0000-0000-000000000003'::uuid
  ),
  (
    '30000000-0000-0000-0000-000000000003'::uuid,
    '20000000-0000-0000-0000-000000000002'::uuid
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
    '40000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'nextjs-typescript-cover.webp',
    'covers/nextjs-typescript-cover.webp',
    'image/webp',
    245760
  ),
  (
    '40000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    'postgresql-perf-cover.webp',
    'covers/postgresql-perf-cover.webp',
    'image/webp',
    189440
  ),
  (
    '40000000-0000-0000-0000-000000000003'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'docker-intro-cover.png',
    'covers/docker-intro-cover.png',
    'image/png',
    312320
  )
ON CONFLICT (id) DO NOTHING;


COMMIT;
