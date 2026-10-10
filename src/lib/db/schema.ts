/**
 * Drizzle ORM schema — mirrors the existing public.* tables in Supabase.
 *
 * These definitions are the single source of truth for table/column shapes
 * used by drizzle-kit (migrations) and the typed query helpers.
 *
 * Column names and types deliberately match the existing SQL schema so that
 * no data migration is required.
 *
 * Note: pgSchema('public') is no longer allowed in drizzle-orm — the public
 * schema is the implicit default and pgTable() targets it automatically.
 */

import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  pgEnum,
} from 'drizzle-orm/pg-core';

// ── Enums ─────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum('user_role', [
  'ADMIN',
  'EDITOR',
  'AI_WRITER',
]);

export const postStatusEnum = pgEnum('post_status', [
  'DRAFT',
  'PUBLISHED',
  'ARCHIVED',
]);

export const aiReviewStatusEnum = pgEnum('ai_review_status_enum', [
  'pending',
  'approved',
  'rejected',
]);

export const aiTopicStateEnum = pgEnum('ai_topic_state', [
  'pending',
  'generating',
  'completed',
  'failed',
]);

// ── Tables ─────────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  role: text('role').notNull().default('EDITOR'),
  display_name: text('display_name'),
  bio: text('bio'),
  avatar_url: text('avatar_url'),
  ai_writer_enabled: boolean('ai_writer_enabled').notNull().default(false),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  excerpt: text('excerpt'),
  content: text('content'),
  cover_image_url: text('cover_image_url'),
  author_id: uuid('author_id').references(() => users.id),
  status: text('status').notNull().default('DRAFT'),
  published_at: timestamp('published_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  ai_generated: boolean('ai_generated').notNull().default(false),
  ai_review_status: text('ai_review_status').notNull().default('pending'),
  ai_meta_description: text('ai_meta_description'),
  ai_image_prompt: text('ai_image_prompt'),
  telegram_notified_at: timestamp('telegram_notified_at', {
    withTimezone: true,
  }),
});

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  auto_publish: boolean('auto_publish').notNull().default(false),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const tags = pgTable('tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const media = pgTable('media', {
  id: uuid('id').primaryKey().defaultRandom(),
  uploader_id: uuid('uploader_id').references(() => users.id),
  filename: text('filename').notNull(),
  storage_path: text('storage_path').notNull(),
  mime_type: text('mime_type').notNull(),
  size_bytes: integer('size_bytes').notNull(),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const postCategories = pgTable('post_categories', {
  post_id: uuid('post_id')
    .notNull()
    .references(() => posts.id, { onDelete: 'cascade' }),
  category_id: uuid('category_id')
    .notNull()
    .references(() => categories.id, { onDelete: 'cascade' }),
});

export const postTags = pgTable('post_tags', {
  post_id: uuid('post_id')
    .notNull()
    .references(() => posts.id, { onDelete: 'cascade' }),
  tag_id: uuid('tag_id')
    .notNull()
    .references(() => tags.id, { onDelete: 'cascade' }),
});

export const aiWriterTopics = pgTable('ai_writer_topics', {
  id: uuid('id').primaryKey().defaultRandom(),
  topic: text('topic').notNull(),
  category_id: uuid('category_id').references(() => categories.id),
  enabled: boolean('enabled').notNull().default(true),
  state: text('state').notNull().default('pending'),
  sort_order: integer('sort_order').notNull().default(0),
  claimed_at: timestamp('claimed_at', { withTimezone: true }),
  completed_at: timestamp('completed_at', { withTimezone: true }),
  post_id: uuid('post_id').references(() => posts.id),
  last_error: text('last_error'),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
