// src/types/database.ts
// Core database row types derived from the PostgreSQL schema (Requirements 6.1–6.7)

export type PostStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type UserRole = 'ADMIN' | 'EDITOR';

export interface Post {
  id: string; // UUID
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  cover_image_url: string | null;
  author_id: string | null; // UUID → users.id; null when the account was removed
  status: PostStatus;
  published_at: string | null; // ISO 8601
  created_at: string;
  updated_at: string;
}

export interface PostWithRelations extends Post {
  author: Pick<User, 'id' | 'display_name' | 'avatar_url'> | null;
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
  uploader_id: string | null;
  filename: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  url?: string; // computed, not stored in DB
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DashboardStats {
  drafts: number;
  published: number;
  archived: number;
  categories: number;
  tags: number;
  media: number;
}

// ── Input types ───────────────────────────────────────────────────────────────

export interface CreatePostInput {
  title: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  cover_image_url?: string;
  category_ids: string[];
  tag_ids: string[];
  author_id: string;
  status?: PostStatus;
}

// Partial of CreatePostInput minus author_id, with optional slug
export type UpdatePostInput = Partial<Omit<CreatePostInput, 'author_id'>>;

export interface CreateCategoryInput {
  name: string;
  slug: string;
}

export interface UpdateCategoryInput {
  name?: string;
  slug?: string;
}

export interface CreateTagInput {
  name: string;
  slug: string;
}

export interface UpdateTagInput {
  name?: string;
  slug?: string;
}

export interface CreateMediaInput {
  uploader_id: string;
  filename: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
}
