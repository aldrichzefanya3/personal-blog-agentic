# Implementation Plan: Personal Blog Platform

## Overview

This plan implements a secure, full-stack personal blog platform using Next.js 14+ (App Router), TypeScript, Tailwind CSS, PostgreSQL via Supabase, and Supabase Auth. Tasks are ordered by dependency so each step builds on a stable foundation. Implementation proceeds from project scaffolding → data layer → auth/authz → public blog → admin panel → testing → deployment.

The design document uses TypeScript throughout; all code tasks use TypeScript.

---

## Tasks

### 1. Project Scaffolding and Tooling

- [x] 1. Initialize the Next.js project with all required tooling
  - [x] 1.1 Bootstrap the Next.js 14+ App Router project
    - Run `npx create-next-app@latest personal-blog-agentic --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"` in the workspace root
    - Verify `tsconfig.json` contains `"strict": true` (Req 19.3)
    - Verify Tailwind CSS and ESLint are included in `package.json`
    - _Requirements: 19.1, 19.2, 19.3_

  - [x] 1.2 Install and configure all additional dependencies
    - Install runtime deps: `postgres`, `@supabase/supabase-js`, `@supabase/ssr`, `zod`, `unified`, `remark-parse`, `remark-gfm`, `remark-rehype`, `rehype-sanitize`, `rehype-stringify`, `next-mdx-remote`
    - Install dev deps: `vitest`, `@vitest/coverage-v8`, `fast-check`, `@testing-library/react`, `@testing-library/jest-dom`, `msw`, `@vitejs/plugin-react`, `prettier`, `prettier-plugin-tailwindcss`
    - Pin all dependencies to exact versions
    - _Requirements: 19.1, 19.2_

  - [x] 1.3 Configure ESLint, Prettier, and TypeScript
    - Ensure `eslint-config-next` is active and TypeScript rules are enabled (Req 19.1)
    - Create `.prettierrc` enabling `prettier-plugin-tailwindcss` and setting `singleQuote: true`, `semi: true`, `trailingComma: "all"` (Req 19.2)
    - Verify `tsconfig.json` path alias `@/*` → `./src/*` is present
    - _Requirements: 19.1, 19.2, 19.3_

  - [x] 1.4 Configure Vitest
    - Create `vitest.config.ts` with `@vitejs/plugin-react`, `environment: "node"`, `globals: true`, path alias `@` → `./src`, and `setupFiles: ["./src/test/setup.ts"]`
    - Create `src/test/setup.ts` with `@testing-library/jest-dom` matchers import
    - Create the directory tree: `src/test/unit/`, `src/test/unit/authz/`, `src/test/unit/validation/`, `src/test/integration/`, `src/test/property/`
    - _Requirements: 18.1, 18.2, 18.6, 19.4_

  - [x] 1.5 Define package.json scripts and environment scaffolding
    - Add scripts: `lint` (eslint), `format` (prettier --write), `type-check` (tsc --noEmit), `test` (vitest --run), `build` (next build) (Req 19.4)
    - Create `.env.example` with all required variable names, placeholder values, and inline documentation comments: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL` (Req 17.4)
    - Add `.gitignore` entries for `.env`, `.env.local`, `.env.*.local` — explicitly keep `.env.example` (Req 20.4)
    - Create `src/lib/env.ts` that reads `REQUIRED_ENV_VARS` and calls `process.exit(1)` with descriptive message if any are missing at startup (Req 17.3)
    - _Requirements: 17.3, 17.4, 19.4, 20.4_

---

### 2. Shared TypeScript Types

- [x] 2. Define shared TypeScript types and database row types
  - [x] 2.1 Create core database types
    - Create `src/types/database.ts` defining: `PostStatus`, `UserRole`, `Post`, `PostWithRelations`, `Category`, `Tag`, `User`, `Media`, `PaginatedResult<T>`, `DashboardStats`, `CreatePostInput`, `UpdatePostInput`, `CreateCategoryInput`, `UpdateCategoryInput`, `CreateTagInput`, `UpdateTagInput`, `CreateMediaInput` — matching the design document type definitions exactly
    - Create `src/types/index.ts` that re-exports everything from `database.ts`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

---

### 3. Environment Validation

- [x] 3. Implement runtime environment validation
  - [x] 3.1 Wire environment validation to server startup
    - Import and call `validateEnv()` from `src/lib/env.ts` inside `src/instrumentation.ts` (Next.js instrumentation hook) so validation runs before the server accepts requests
    - Verify the function logs each missing variable name individually and exits with code 1
    - _Requirements: 17.1, 17.2, 17.3_

---

### 4. Database Schema and Migrations

- [x] 4. Write all SQL migrations
  - [x] 4.1 Create the initial schema migration
    - Create `supabase/migrations/20240101000000_initial_schema.sql`
    - Include DDL for all tables in dependency order: `users`, `posts`, `categories`, `tags`, `post_categories`, `post_tags`, `media` — matching the full SQL DDL in the design document
    - Include all indexes: `idx_posts_slug`, `idx_posts_status`, `idx_posts_author_id`, `idx_posts_published_at` (partial on PUBLISHED), `idx_categories_slug`, `idx_tags_slug`, `idx_posts_fts` (GIN full-text) (Req 6.8)
    - Include `set_updated_at()` trigger function and `posts_updated_at` trigger (Req 6.10)
    - Include `-- DOWN:` comment block documenting the exact reverse SQL (Req 7.5)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 6.11, 6.12_

  - [x] 4.2 Create the RLS policies migration
    - Create `supabase/migrations/20240101000001_rls_policies.sql`
    - Enable RLS on all tables: `posts`, `categories`, `tags`, `media`, `users`, `post_categories`, `post_tags` (Req 9.6)
    - Add all RLS policies exactly as defined in the design document (public read for published posts/categories/tags, ADMIN/EDITOR write, owner policies for media and users)
    - Include `-- DOWN:` block listing all `DROP POLICY` and `ALTER TABLE ... DISABLE ROW LEVEL SECURITY` statements (Req 7.5)
    - _Requirements: 9.6, 7.5_

  - [x] 4.3 Create the auth trigger migration
    - Create `supabase/migrations/20240101000002_auth_trigger.sql`
    - Implement `handle_new_user()` function with `SECURITY DEFINER` that inserts into `public.users` on `auth.users` INSERT, setting `role = 'USER'` and copying `display_name` from `raw_user_meta_data`
    - Create the `on_auth_user_created` trigger on `auth.users`
    - Include `-- DOWN:` block (Req 7.5)
    - _Requirements: 7.5, 8.1_

  - [x] 4.4 Create the development seed file
    - Create `supabase/seed.sql` with at least 3 rows each for: `auth.users` (via Supabase auth admin API calls or direct insert), `public.users`, `public.categories`, `public.tags`, `public.posts` (mix of DRAFT and PUBLISHED statuses), `public.post_categories`, `public.post_tags`, `public.media`
    - Ensure all slug values conform to the slug pattern constraint
    - _Requirements: 7.4_

---

### 5. Database Access Layer

- [x] 5. Implement the Postgres.js client and all query functions
  - [x] 5.1 Create the Postgres.js client singleton
    - Create `src/lib/db/client.ts` implementing the singleton pattern with `globalThis` guard for dev hot-reload
    - Configure with `prepare: false`, `max: 3`, `connect_timeout: 10`, `idle_timeout: 20`, `ssl: 'require'` in production
    - Throw with a descriptive error message if `DATABASE_URL` is not set
    - _Requirements: 5.6, 16.1, 17.1, 20.2_

  - [x] 5.2 Implement post query functions
    - Create `src/lib/db/queries/posts.ts`
    - Implement all query functions: `getPublishedPosts`, `getPostBySlug`, `getPublishedPostsByCategory`, `getPublishedPostsByTag`, `searchPosts`, `getAllPostSlugs`, `getPostById`, `createPost`, `updatePost`, `publishPost`, `unpublishPost`, `archivePost`, `deletePost`, `getRecentPosts`, `getDashboardStats`
    - All queries must use Postgres.js tagged template literals — no string concatenation of user input (Req 16.1, 16.2)
    - `searchPosts` uses ILIKE with parameterized `%query%` values; relevance computed as field match count (Req 2.1, 2.3)
    - `getPublishedPosts` and variants return `PaginatedResult<PostWithRelations>` with categories and tags via `json_agg`
    - _Requirements: 1.1, 1.4, 2.1, 2.3, 5.1, 10.1, 10.2, 16.1, 16.2_

  - [x] 5.3 Implement category and tag query functions
    - Create `src/lib/db/queries/categories.ts`: `getAllCategories`, `getCategoryBySlug`, `createCategory`, `upda teCategory`, `deleteCategory`, `categoryNameExists`
    - Create `src/lib/db/queries/tags.ts`: `getAllTags`, `getTagBySlug`, `createTag`, `updateTag`, `deleteTag`, `tagNameExists`
    - All functions use parameterized queries; `categoryNameExists` and `tagNameExists` perform case-insensitive comparison using `ILIKE` or `lower()`
    - _Requirements: 12.3, 16.1, 16.2_

  - [x] 5.4 Implement media query functions
    - Create `src/lib/db/queries/media.ts`: `createMediaRecord`, `getMediaByUploader`, `getMediaById`, `deleteMediaRecord`, `isMediaInUse`
    - `isMediaInUse` checks whether any post references the media's `storage_path` in `cover_image_url` or in `content` (LIKE match)
    - `getMediaByUploader` returns `PaginatedResult<Media>` with max 100 items per page (Req 13.7)
    - _Requirements: 13.4, 13.7, 13.9, 16.1, 16.2_

  - [x] 5.5 Implement user query functions
    - Create `src/lib/db/queries/users.ts`: `getUserById`, `getAllUsers`, `updateUserRole`, `updateUserProfile`
    - `getUserById` returns the `public.users` row (not `auth.users`) for role resolution
    - _Requirements: 9.9, 9.10, 16.1, 16.2_

---

### 6. Zod Validation Schemas

- [x] 6. Implement all Zod validation schemas
  - [x] 6.1 Create post validation schemas
    - Create `src/lib/validation/schemas/post.ts`
    - Define `PostSlugSchema` with regex `/^[a-z0-9]+(?:-[a-z0-9]+)*$/` and max 255 chars
    - Define `CreatePostSchema` validating: `title` (1–255 chars, non-whitespace), `content` (min 1 non-whitespace char), `excerpt` (max 500, optional), `cover_image_url` (url, max 2048, optional), `category_ids` (UUID array), `tag_ids` (UUID array)
    - Define `UpdatePostSchema` as partial `CreatePostSchema` with optional `slug`
    - Define `SearchQuerySchema` with `q`: min 1, max 200 chars
    - Define `UUIDSchema` with `.uuid()` refinement
    - _Requirements: 11.9, 11.11, 14.1, 14.3, 14.4, 2.2_

  - [x] 6.2 Create category and tag validation schemas
    - Create `src/lib/validation/schemas/category.ts` with `CreateCategorySchema` and `UpdateCategorySchema`: `name` (1–100 chars, non-whitespace)
    - Create `src/lib/validation/schemas/tag.ts` with same structure
    - _Requirements: 12.6, 14.1, 14.4_

  - [x] 6.3 Create media validation schema
    - Create `src/lib/validation/schemas/media.ts`
    - Define `MediaUploadSchema` with `mime_type` enum (`image/jpeg`, `image/png`, `image/webp`, `image/gif`, `image/avif`) and `size_bytes` (integer, min 1, max 10_485_760)
    - _Requirements: 13.1, 13.2, 14.1_

  - [x] 6.4 Create validation index
    - Create `src/lib/validation/index.ts` re-exporting all schemas from the `schemas/` subdirectory
    - _Requirements: 14.1_

---

### 7. Slug Utility

- [x] 7. Implement slug generation and uniqueness utilities
  - [x] 7.1 Create the slug generation module
    - Create `src/lib/slug.ts`
    - Implement `generateSlug(title: string): string` applying: `toLowerCase()`, Unicode `NFKD` normalization + diacritic strip, remove non-`[a-z0-9\s-]` chars, trim, collapse `[\s-]+` to `-`, trim leading/trailing hyphens
    - Implement `ensureUniqueSlug(baseSlug, existsCheck, excludeId?): Promise<string>` appending `-2` through `-999` until unique; throw if all taken
    - The function must be idempotent (CP-1) and satisfy the character invariant (CP-2)
    - _Requirements: 3.9, 11.1, 11.10, 12.1, 12.2_

---

### 8. Content Rendering Pipeline

- [x] 8. Implement the Markdown rendering and sanitization pipeline
  - [x] 8.1 Create the markdown renderer and sanitizer
    - Create `src/lib/content/markdown.ts` implementing `renderMarkdown(markdown: string): Promise<string>`
    - Build the unified pipeline: `remarkParse` → `remarkGfm` → `remarkRehype` (no dangerous HTML) → `rehypeSanitize` with custom schema → `rehypeStringify`
    - Create `src/lib/content/sanitizer.ts` defining the `sanitizeSchema`: strips all `on*` event handlers from all elements, allows only non-`javascript:`/non-`data:` `href` and `src` values, removes `<script>`, `<style>`, `<iframe>`, `<object>`, `<embed>` entirely
    - Throw `HTTP 500` equivalent error if the pipeline fails (Req 14.7)
    - _Requirements: 1.7, 14.5, 14.7_

---

### 9. Authentication Layer

- [x] 9. Implement Supabase Auth integration and session management
  - [x] 9.1 Create the Supabase server and browser client factories
    - Create `src/lib/auth/supabase-server.ts` implementing `createSupabaseServerClient()` using `@supabase/ssr` `createServerClient`, reading `SUPABASE_URL` and `SUPABASE_ANON_KEY`, configuring HTTP-only cookies with `secure: true` in production, `sameSite: 'lax'` (Req 8.1)
    - Create `src/lib/auth/supabase-browser.ts` implementing `createSupabaseBrowserClient()` using `createBrowserClient` for Client Components — must only use anon key, never service-role key (Req 8.3)
    - _Requirements: 8.1, 8.2, 8.3, 17.1, 17.2_

  - [x] 9.2 Create the server session helper
    - Create `src/lib/auth/session.ts` implementing `getServerSession()` that calls `supabase.auth.getUser()`, then fetches the role from `public.users` via `getUserById`, and returns the merged session object or `null`
    - Role must come from `public.users`, not JWT claims (Req 9.9)
    - _Requirements: 8.9, 9.9_

  - [x] 9.3 Create Next.js middleware for auth and security headers
    - Create `middleware.ts` at the project root
    - On every request: create a Supabase client and call `supabase.auth.getUser()` to refresh the session transparently
    - Redirect unauthenticated requests to `/admin/**` → `/auth/login?redirectTo=<path>` (Req 8.8)
    - Set all security headers on every response: `Content-Security-Policy` (with per-request nonce), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security: max-age=31536000; includeSubDomains` (Req 15.1–15.5)
    - Implement `buildCSP(nonce)` returning all required CSP directives
    - Configure `matcher` to exclude static files and Next.js internals
    - _Requirements: 8.8, 8.9, 15.1, 15.2, 15.3, 15.4, 15.5, 15.8_

---

### 10. Authorization / RBAC Layer

- [x] 10. Implement role-based access control
  - [x] 10.1 Create the role definitions and isAuthorized function
    - Create `src/lib/authz/roles.ts`
    - Define `Action` union type with all 11 action strings from the design document
    - Define `ROLE_PERMISSIONS` record mapping each `UserRole` to a `Set<Action>`
    - Implement `isAuthorized(role: UserRole, action: Action): boolean` — pure function, no side effects
    - ADMIN has all actions; EDITOR has post/category/tag/media create-edit-delete but not `user:manage` or `settings:manage`; USER has empty set (CP-6)
    - _Requirements: 9.1, 9.2, 9.3, 9.5_

  - [x] 10.2 Create the guard functions
    - Create `src/lib/authz/guards.ts`
    - Implement `requireRole(action: Action): Promise<SessionUser>` — calls `getServerSession()`, throws `AuthError('UNAUTHENTICATED', 401)` if no session, throws `AuthError('FORBIDDEN', 403)` if role lacks permission
    - Implement `requireOwnership(resourceOwnerId: string, action: Action): Promise<SessionUser>` — calls `requireRole`, then verifies `session.id === resourceOwnerId` unless role is `ADMIN`
    - Define `AuthError`, `ValidationError`, `NotFoundError`, `StorageError` extending `AppError` as described in the design document's error hierarchy; create `src/lib/errors.ts`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.7, 9.8_

---

### 11. Authentication Pages and Server Actions

- [x] 11. Build authentication UI and Server Actions
  - [x] 11.1 Create auth Server Actions
    - Create `src/actions/auth.ts` with `'use server'` directive
    - Implement `loginAction(formData: FormData)`: parse email/password, call `supabase.auth.signInWithPassword()`, handle errors with a generic message that doesn't distinguish unknown user from wrong password (Req 8.11), redirect to `redirectTo` param or `/admin`
    - Implement `logoutAction()`: call `supabase.auth.signOut()`, clear session cookie, redirect to `/auth/login` (Req 8.7)
    - Implement `requestPasswordResetAction(formData: FormData)`: call `supabase.auth.resetPasswordForEmail()` (Req 8.4)
    - Implement `updatePasswordAction(formData: FormData)`: validate password satisfies policy (8+ chars, 128 max, uppercase + lowercase + digit), call `supabase.auth.updateUser()`, redirect to sign-in (Req 8.5, 8.10)
    - _Requirements: 8.1, 8.4, 8.5, 8.7, 8.10, 8.11_

  - [x] 11.2 Build auth pages
    - Create `src/app/auth/login/page.tsx`: sign-in form (email + password), calls `loginAction`, displays generic error on failure (Req 8.11)
    - Create `src/app/auth/reset-password/page.tsx`: email input form calling `requestPasswordResetAction`
    - Create `src/app/auth/update-password/page.tsx`: new-password form calling `updatePasswordAction`, handles expired/consumed token links by redirecting to reset-request with error (Req 8.6)
    - _Requirements: 8.4, 8.5, 8.6, 8.11_

  - [x] 11.3 Implement secure one-time admin signup flow
    - Add `ADMIN_SIGNUP_SECRET` to `.env.example` with documentation comment: "Random secret token for one-time admin signup (generate with: openssl rand -hex 32)"
    - Update `src/lib/env.ts` to include `ADMIN_SIGNUP_SECRET` in the required environment variables list
    - Create `src/lib/auth/admin-check.ts` with `hasAdminUser(): Promise<boolean>` that queries `public.users` for any user with `role = 'ADMIN'`
    - Create `src/actions/auth.ts` (or add to existing) with `adminSignupAction(formData: FormData)`:
      - Extract `email`, `password`, and `secret` from formData
      - Verify `secret === process.env.ADMIN_SIGNUP_SECRET` — return error "Invalid signup secret" if mismatch
      - Call `hasAdminUser()` — return error "Admin signup is disabled" if true (Req: one-time only)
      - Validate password meets policy: 8+ chars, 128 max, uppercase + lowercase + digit (Req 8.10)
      - Call `supabase.auth.admin.createUser({ email, password, email_confirm: true })` using service-role client
      - Update the created user's row in `public.users` to set `role = 'ADMIN'`
      - Return success message instructing user to sign in at `/auth/login`
    - Create `src/app/auth/setup-admin/page.tsx` as a Server Component:
      - Call `hasAdminUser()` at the top — if true, return `notFound()` (makes route inaccessible after first admin)
      - Render form with fields: email, password, confirm password, secret token
      - Form calls `adminSignupAction`
      - Display validation errors returned from the action
      - Include clear instructions: "This is a one-time setup. After creating the first admin account, this page will no longer be accessible."
    - Security notes:
      - Route path `/auth/setup-admin` is non-obvious but not security-by-obscurity alone — relies on `ADMIN_SIGNUP_SECRET`
      - Secret must be communicated out-of-band to blog owner (e.g., via `.env.example` documentation)
      - Route returns 404 after first admin exists (defense-in-depth)
      - No rate limiting needed since route self-destructs after one use
    - _Requirements: 8.1, 8.10, 9.1, 17.1, 17.3_

  - [x] 11.5 Implement role-based admin authentication
    - [ ] 11.5.1 Add role selector UI to login page
      - Modify `src/app/auth/login/page.tsx` to include a role selection dropdown/radio group with options: "Admin" and "Editor"
      - The form should submit the selected role along with email and password
      - UI clarification: "Select your role to sign in to the admin panel"
      - _Requirements: 9.1, 9.2_

    - [x] 11.5.2 Modify login flow for role-based authentication with server-side verification
      - Modify `loginAction` in `src/actions/auth.ts` to accept an additional `role` parameter from the form
      - **SERVER-SIDE ROLE VERIFICATION SEQUENCE:**
        1. First, authenticate with Supabase: call `supabase.auth.signInWithPassword(email, password)` — if auth fails, return generic error message (Req 8.11)
        2. After successful authentication, fetch the user's actual role from `public.users` table via `getUserById(authUser.id)` (same pattern as `getServerSession()`)
        3. Verify the fetched database role matches the role selected in the form:
           - If user selected "Admin" but database role is "EDITOR" → return error: "Invalid role selection for this account"
           - If user selected "Editor" but database role is "ADMIN" → return error: "Invalid role selection for this account"
           - If database role is "USER" (regardless of selection) → return error: "Please contact the administrator for admin panel access"
        4. Only proceed with session creation and redirect if role verification passes
      - **SECURITY NOTES:**
        - The role selected in the UI is a FILTER, not a permission grant — it helps users choose their login context
        - The actual authoritative role always comes from `public.users.role` (database source of truth)
        - This server-side check prevents client-side role manipulation bypassing
        - This check is SEPARATE from and happens BEFORE the existing RBAC guards (`requireRole()`, `isAuthorized()`) which operate on already-authenticated sessions
        - USER role accounts exist in the schema (created by auth trigger) but are explicitly blocked from admin panel access
      - **RBAC INTEGRATION:**
        - This validation layer works in conjunction with the RBAC system defined in task 10.1 and 10.2
        - After passing this role verification, subsequent requests still go through `requireRole()` and `isAuthorized()` guards
        - Defense-in-depth: multiple layers ensure proper access control
      - Return typed `{ error: string }` on validation failures; never throw to client
      - _Requirements: 8.11, 9.1, 9.2, 9.4, 9.9_

---

### 12. Root Layout and Global Config

- [x] 12. Implement root layout, global config files
  - [x] 12.1 Create the root layout and Next.js config
    - Create `src/app/layout.tsx` with `lang="en"` on `<html>` (Req 4.6), dark-mode class strategy via Tailwind, and font loading
    - Create `next.config.ts` with: HTTP→HTTPS redirect in production (Req 20.3), `images.formats: ['image/avif', 'image/webp']` (Req 5.4), `images.remotePatterns` for `*.supabase.co`, `serverActions.bodySizeLimit: '10mb'`
    - Create `tailwind.config.ts` with `darkMode: 'media'` (system preference) and content paths covering `src/`
    - _Requirements: 4.2, 4.6, 5.4, 20.1, 20.3_

---

### 13. Shared UI Components

- [x] 13. Build shared primitive and layout components
  - [x] 13.1 Create primitive UI components
    - Create `src/components/ui/` with at minimum: `Button.tsx`, `Input.tsx`, `Textarea.tsx`, `Badge.tsx`, `Spinner.tsx`, `ErrorMessage.tsx`, `ConfirmDialog.tsx`
    - All interactive elements must have visible focus indicators meeting 3:1 contrast (Req 4.4), keyboard activation parity (Req 4.8), and descriptive `aria-label` or label associations
    - _Requirements: 4.4, 4.8_

  - [x] 13.2 Create public layout components
    - Create `src/components/layout/Header.tsx` (Server Component) with navigation links and `<SearchBar>` (Client Component for input handling)
    - Create `src/components/layout/Footer.tsx` (Server Component)
    - Create `src/components/layout/ThemeToggle.tsx` — `prefers-color-scheme` media query toggling dark class
    - Use semantic HTML elements: `<header>`, `<nav>`, `<main>`, `<footer>` (Req 3.7)
    - _Requirements: 3.7, 4.1, 4.2_

  - [x] 13.3 Create blog-specific components
    - Create `src/components/blog/PostCard.tsx` (Server Component): displays title, excerpt ≤300 chars, cover image (`next/image`), author name, date formatted `YYYY-MM-DD`, categories, tags (Req 1.4)
    - Create `src/components/blog/PostList.tsx`: renders list of `PostCard` with empty-state message when no posts (Req 1.10)
    - Create `src/components/blog/Pagination.tsx`: page links, calls `notFound()` when page > totalPages (Req 1.9)
    - Create `src/components/blog/CategoryBadge.tsx` and `TagBadge.tsx`
    - All images use `next/image` with descriptive `alt` text (Req 4.5); cover images have `alt={post.title}`, decorative images use `alt=""`
    - _Requirements: 1.1, 1.4, 1.9, 1.10, 4.5, 5.2_

---

### 14. Public Blog Routes

- [x] 14. Implement all public-facing blog pages
  - [x] 14.1 Create the public route group layout
    - Create `src/app/(public)/layout.tsx` wrapping content with `<Header>`, `<main>`, `<Footer>` using semantic HTML
    - Apply Tailwind prose styles and base font ≥16px (Req 4.7)
    - _Requirements: 3.7, 4.1, 4.7_

  - [x] 14.2 Implement the post listing home page (with ISR)
    - Create `src/app/(public)/page.tsx` as a Server Component with `export const revalidate = 60`
    - Fetch `getPublishedPosts({ page, pageSize: 10 })` using `unstable_cache` tagged with `['posts']`
    - Read `?page` search param; call `notFound()` if `page > totalPages` (Req 1.9)
    - Render `<PostList>` and `<Pagination>`
    - _Requirements: 1.1, 1.4, 1.9, 5.1, 5.3_

  - [x] 14.3 Implement the post detail page (with ISR)
    - Create `src/app/(public)/posts/[slug]/page.tsx` as a Server Component with `export const revalidate = 60`
    - Call `getPostBySlug(params.slug)`; call `notFound()` if post is null or status ≠ `PUBLISHED` (Req 1.3)
    - Call `renderMarkdown(post.content)` to get sanitized HTML; render via `dangerouslySetInnerHTML` inside `<article>`
    - Implement `generateStaticParams` returning all published slugs
    - Use `<Image>` for cover image; fall back to placeholder if missing (Req 5.8)
    - _Requirements: 1.2, 1.3, 1.7, 5.1, 5.2, 5.3, 5.8_

  - [x] 14.4 Implement category and tag filter pages (with ISR)
    - Create `src/app/(public)/categories/[slug]/page.tsx` fetching `getPublishedPostsByCategory` tagged with `['posts-category-<slug>']`
    - Create `src/app/(public)/tags/[slug]/page.tsx` fetching `getPublishedPostsByTag` tagged with `['posts-tag-<slug>']`
    - Both show empty-state message (not 404) when no posts exist for the filter (Req 1.10)
    - Both support pagination with 10 posts per page and `notFound()` beyond last page (Req 1.5, 1.6, 1.9)
    - _Requirements: 1.5, 1.6, 1.9, 1.10, 5.1, 5.3_

  - [x] 14.5 Implement the search page
    - Create `src/app/(public)/search/page.tsx` as a dynamic Server Component (no cache)
    - Read `?q` from search params; validate with `SearchQuerySchema.safeParse()` — return validation error UI if empty or >200 chars (Req 2.2)
    - Call `searchPosts({ query: q, limit: 20 })`; display results ordered by relevance then date or "no results" message (Req 2.1, 2.3, 2.4)
    - `<SearchBar>` updates the URL search param on submit (GET form or `router.push`)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 14.6 Implement the about page
    - Create `src/app/(public)/about/page.tsx` as a static Server Component
    - Fetch the author's `bio` and at least one external profile link from `public.users` (seeded)
    - _Requirements: 1.8_

---

### 15. SEO — Metadata, Sitemap, Robots

- [x] 15. Implement all SEO features
  - [x] 15.1 Create the metadata generation helpers
    - Create `src/lib/seo/metadata.ts` with `generatePostMetadata(slug)` returning Next.js `Metadata` object
    - Set `title` ≤60 chars, `description` ≤160 chars (fallback to first 160 chars of content if no excerpt) (Req 3.1)
    - Include `openGraph` with `og:title`, `og:description`, `og:image` (fallback to site default), `og:url`, `og:type: 'article'` (Req 3.2)
    - Include `twitter` card `summary_large_image` with all four required tags (Req 3.3)
    - Set `alternates.canonical` on every public page (Req 3.6)
    - Create `src/lib/seo/jsonld.ts` with `buildBlogPostingJsonLd(post, url)` returning JSON-LD with `headline`, `author`, `datePublished`, `description`, `url` (Req 3.8)
    - Wire `generateMetadata` export into `posts/[slug]/page.tsx`, home page, category pages, and tag pages
    - _Requirements: 3.1, 3.2, 3.3, 3.6, 3.8_

  - [x] 15.2 Implement sitemap and robots.txt
    - Create `src/app/sitemap.ts` with `export const revalidate = 3600`, calling `getAllPostSlugs()` and returning all published post URLs (Req 3.4)
    - Create `src/app/robots.ts` returning rules: `allow: '/'`, `disallow: '/admin/'` for all user agents, plus `sitemap` URL (Req 3.5)
    - _Requirements: 3.4, 3.5_

---

### 16. Admin Panel — Layout, Dashboard, and Settings

- [x] 16. Build the admin panel shell and dashboard
  - [x] 16.1 Create the admin route group layout
    - Create `src/app/(admin)/layout.tsx` calling `getServerSession()`; redirect to `/auth/login` if no session or `role === 'USER'` (defense-in-depth, middleware already handles unauthenticated) (Req 9.4, 10)
    - Render `<Sidebar role={session.role}>` and `<main>` slot
    - Create `src/components/admin/Sidebar.tsx` with role-conditional nav items (settings only visible to ADMIN)
    - _Requirements: 8.9, 9.4, 10.3_

  - [x] 16.2 Implement the admin dashboard page
    - Create `src/app/(admin)/admin/page.tsx` calling `getDashboardStats()` and `getRecentPosts(5)`
    - Display counts of posts by status, total categories, total tags, total media items (Req 10.1)
    - Display the 5 most recently updated posts with title, status, and `updated_at` (Req 10.2)
    - Show error UI if data fetch fails without revealing partial counts (Req 10.4)
    - _Requirements: 10.1, 10.2, 10.4_

  - [x] 16.3 Implement the user management settings page (ADMIN only)
    - Create `src/app/(admin)/admin/settings/page.tsx` with a server-side `requireRole('user:manage')` call; return 403 if unauthorized (Req 9.1, 9.3)
    - List all users with their current roles; provide role-promotion/demotion form controls (Req 9.3)
    - _Requirements: 9.1, 9.3_

---

### 17. Admin Post CRUD and Markdown Editor

- [x] 17. Build post management pages, editor, and Server Actions
  - [x] 17.1 Create the Markdown editor Client Component
    - Create `src/components/admin/MarkdownEditor.tsx` as `'use client'`
    - Implement debounced preview (500ms after keypress) that calls `POST /api/preview` with `{ markdown }` and renders the returned `html` in a preview pane
    - Toolbar buttons: bold, italic, link, image insert
    - The preview pane renders HTML via `dangerouslySetInnerHTML` (same sanitized output as public pages) (Req 11.7)
    - _Requirements: 11.7_

  - [x] 17.2 Create the markdown preview API route
    - Create `src/app/api/preview/route.ts` as a POST Route Handler
    - Require authenticated session (call `getServerSession()`); return 401 if none
    - Parse `{ markdown: string }` from request body; call `renderMarkdown(markdown)`; return `{ html }`
    - _Requirements: 11.7, 8.9_

  - [x] 17.3 Create the PostForm Client Component
    - Create `src/components/admin/PostForm.tsx` as `'use client'`
    - Fields: title, slug (auto-derived from title, editable), excerpt, cover image picker, category multi-select, tag multi-select, status actions (Save Draft, Publish, Archive, Delete)
    - Client-side validation mirrors server Zod schema for immediate feedback
    - Deletion requires a confirmation dialog (Req 11.6)
    - _Requirements: 11.6, 11.7_

  - [x] 17.4 Implement post Server Actions
    - Create `src/actions/posts.ts` with `'use server'`
    - Implement `createPostAction`: `requireRole('post:create')` → `CreatePostSchema.safeParse()` → `generateSlug()` → `ensureUniqueSlug()` → `createPost()` → `revalidateTag('posts')` → redirect to edit page (Req 11.1, 11.10)
    - Implement `updatePostAction`: `requireOwnership(post.author_id, 'post:edit')` → `UpdatePostSchema.safeParse()` → `updatePost()` → `revalidateTag('post-<slug>')` and `revalidateTag('posts')` (Req 11.2)
    - Implement `publishPostAction`: sets status=PUBLISHED, `published_at = now()` only if currently null (Req 11.3)
    - Implement `unpublishPostAction`: sets status=DRAFT, does NOT modify `published_at` (Req 11.4)
    - Implement `archivePostAction`: sets status=ARCHIVED (Req 11.5)
    - Implement `deletePostAction`: `requireOwnership(post.author_id, 'post:delete')` → confirm deletion → `deletePost()` → cascade removes `post_categories`/`post_tags` → `revalidateTag('posts')` (Req 11.6)
    - Return typed `{ error }` on validation failure (never throw to client); return HTTP 500 path on DB unavailability without partial writes (Req 11.11, 11.12)
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.10, 11.11, 11.12_

  - [x] 17.5 Build post list and editor pages
    - Create `src/app/(admin)/admin/posts/page.tsx`: list all posts (all statuses) with title, status, updated_at; links to edit and create
    - Create `src/app/(admin)/admin/posts/new/page.tsx`: render `<PostForm>` bound to `createPostAction`
    - Create `src/app/(admin)/admin/posts/[id]/page.tsx`: fetch post by ID, render `<PostForm>` pre-populated, bound to `updatePostAction`, `publishPostAction`, `unpublishPostAction`, `archivePostAction`, `deletePostAction`
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

---

### 18. Admin Category and Tag Management

- [x] 18. Build category and tag management pages and Server Actions
  - [x] 18.1 Implement category and tag Server Actions
    - Create `src/actions/categories.ts` with `'use server'`:
      - `createCategoryAction`: `requireRole('category:write')` → `CreateCategorySchema.safeParse()` → `categoryNameExists()` (case-insensitive; error if true) → `generateSlug(name)` → `createCategory()` (Req 12.1, 12.3)
      - `updateCategoryAction`: `requireRole('category:write')` → validate → `generateSlug(newName)` → `updateCategory()` atomically (Req 12.7)
      - `deleteCategoryAction`: `requireRole('category:write')` → `deleteCategory()` — cascade removes `post_categories` (Req 12.4)
    - Create `src/actions/tags.ts` with identical structure for tags (Req 12.2, 12.5, 12.7)
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

  - [x] 18.2 Build category and tag management pages
    - Create `src/app/(admin)/admin/categories/page.tsx`: list with inline create/edit/delete controls calling the Server Actions
    - Create `src/app/(admin)/admin/tags/page.tsx`: same pattern
    - Both pages display validation errors returned from Server Actions
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

---

### 19. Admin Media Library

- [x] 19. Build the media upload, listing, and deletion feature
  - [x] 19.1 Implement the media Server Action and service
    - Create `src/lib/services/media.ts` implementing `uploadMedia({ file, uploaderId })`:
      - `MediaUploadSchema.safeParse({ mime_type, size_bytes })` — return error if invalid (Req 13.1, 13.2, 13.3)
      - Generate `storagePath = media/{uploaderId}/{year}/{month}/{uuid}.{ext}`
      - Upload to Supabase Storage `blog-media` bucket; throw `StorageError` on failure
      - Insert `media` row via `createMediaRecord()`; on DB failure, remove the uploaded file (compensating transaction) (Req 13.5)
      - Return `{ media, url }` (Req 13.6)
    - Create `src/actions/media.ts` with `'use server'`:
      - `uploadMediaAction`: `requireRole('media:upload')` → call `uploadMedia()` (Req 13.10)
      - `deleteMediaAction`: `requireRole('media:delete:any')` or ownership check → `isMediaInUse()` (return error if in use, Req 13.9) → `deleteMediaRecord()` + Supabase Storage remove atomically (Req 13.8)
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.8, 13.9, 13.10_

  - [x] 19.2 Create the MediaUploader Client Component and media library page
    - Create `src/components/admin/MediaUploader.tsx` as `'use client'`: file input with client-side MIME/size pre-validation, progress indicator, calls `uploadMediaAction`, displays returned URL for copy/embed (Req 13.6)
    - Create `src/app/(admin)/admin/media/page.tsx`: paginated media grid (max 100/page) showing storage_path, mime_type, size_bytes, upload date, and URL; delete button per item with confirmation (Req 13.7)
    - _Requirements: 13.6, 13.7, 13.8, 13.9, 13.10_

---

### 20. Cache Revalidation and ISR Wiring

- [x] 20. Wire cache revalidation and ISR across all routes
  - [x] 20.1 Implement cache tag strategy and revalidation calls
    - Wrap all public query calls in `unstable_cache` with correct tags: `posts` (list), `post-{slug}` (detail), `posts-category-{slug}`, `posts-tag-{slug}`, `admin-stats`
    - Verify all Server Actions call `revalidateTag()` for affected tags after mutations
    - Verify ISR is active (`export const revalidate = 60`) on all public listing and detail pages
    - Implement error handling: on revalidation failure, log the error and continue serving cached content (Req 5.7)
    - Cover-image unavailability: render placeholder `<Image>` instead of breaking (Req 5.8)
    - _Requirements: 5.1, 5.3, 5.7, 5.8_

---

### 21. CSRF Protection

- [x] 21. Implement CSRF protection for admin state-mutating requests
  - [x] 21.1 Add CSRF token generation and verification
    - Next.js Server Actions automatically enforce same-origin via `Origin` header check — document this in a code comment in `src/actions/README.md`
    - For any non-Server Action admin form POST (Route Handlers), generate a per-session CSRF token stored in a separate non-HttpOnly cookie and verify the submitted token server-side (Req 15.6, 15.7)
    - Return HTTP 403 with `"CSRF validation failure"` body when token is missing or mismatched (Req 15.7)
    - _Requirements: 15.6, 15.7_

---

### 22. Testing — Unit Tests

- [ ] 22. Write unit tests for critical utility modules
  - [x] 22.1 Write unit tests for slug generation
    - Create `src/test/unit/slug.test.ts`
    - Test `generateSlug`: valid titles produce expected slugs, special characters are stripped, consecutive hyphens collapse, leading/trailing hyphens trimmed, empty-ish inputs produce empty string
    - Test `ensureUniqueSlug`: returns base slug if no conflict, appends `-2` on first conflict, increments correctly, throws after `-999`
    - _Requirements: 18.1_

  - [x] 22.2 Write property-based test CP-1 (Slug Idempotence)
    - Create `src/test/property/slug.property.test.ts`
    - Use `fast-check` `fc.string()` arbitrary; assert `generateSlug(generateSlug(title)) === generateSlug(title)` for 1000 runs
    - **Property 1: Slug Idempotence**
    - **Validates: Requirements 3.9, 11.1, 12.1, 12.2**
    - _Requirements: 18.6_

  - [x] 22.3 Write property-based test CP-2 (Slug Character Invariant)
    - In `src/test/property/slug.property.test.ts` (same file as CP-1)
    - Use `fc.string({ minLength: 1 })`; when slug is non-empty assert it matches `/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/` and does not contain `--`
    - **Property 2: Slug Character Invariant**
    - **Validates: Requirements 3.9, 6.12, 11.9**
    - _Requirements: 18.6_

  - [x] 22.4 Write unit tests for the markdown sanitizer
    - Create `src/test/unit/markdown.test.ts`
    - Test that `renderMarkdown` strips `<script>alert(1)</script>`, `<img onerror="x">`, `<a href="javascript:alert(1)">`, `onload=`, `data:text/html` payloads from rendered output (Req 18.1)
    - _Requirements: 18.1_

  - [x] 22.5 Write property-based test CP-3 (Sanitization XSS Safety Invariant)
    - Create `src/test/property/sanitizer.property.test.ts`
    - Use `fc.string()` arbitrary; for any input assert the rendered HTML does not match `/<script/i`, `/\son\w+=/i`, `/javascript:/i`, `/data:text\/html/i`
    - **Property 3: Markdown Sanitization — XSS Safety Invariant**
    - **Validates: Requirements 1.7, 14.5**
    - _Requirements: 18.6_

  - [x] 22.6 Write unit tests for Zod validation schemas
    - Create `src/test/unit/validation/post.test.ts`: valid input passes, empty title fails with `title` field error, title >255 chars fails, whitespace-only content fails, invalid UUID in `category_ids` fails, slug not matching pattern fails
    - Create `src/test/unit/validation/category.test.ts` and `tag.test.ts`: valid/invalid name tests
    - Create `src/test/unit/validation/media.test.ts`: boundary tests — 10_485_760 bytes passes, 10_485_761 fails; allowed MIME types pass, unsupported MIME fails
    - _Requirements: 18.1_

  - [x] 22.7 Write property-based test CP-4 (Zod Validator — Invalid Input Rejection)
    - Create `src/test/property/validation.property.test.ts`
    - For `CreatePostSchema`: use `fc.stringMatching(/^\s*$/)` for title; assert `safeParse().success === false` with a `title` field issue (1000 runs)
    - For `MediaUploadSchema`: use `fc.integer({ min: 10_485_761 })` for `size_bytes`; assert rejection (1000 runs)
    - **Property 4: Zod Validator — Invalid Input Rejection**
    - **Validates: Requirements 11.9, 11.11, 13.1, 13.2, 14.1, 14.2**
    - _Requirements: 18.6_

  - [x] 22.8 Write property-based test CP-5 (Zod Validator — Valid Input Round-Trip)
    - In `src/test/property/validation.property.test.ts` (same file as CP-4)
    - Use `fc.record({ title: fc.string(...).filter(...), content: fc.string(...).filter(...) })`; for inputs that pass `safeParse`, verify JSON round-trip produces deeply equal result (500 runs)
    - **Property 5: Zod Validator — Valid Input Round-Trip**
    - **Validates: Requirements 14.1, 14.4**
    - _Requirements: 18.6_

  - [x] 22.9 Write unit tests for RBAC role-checking logic
    - Create `src/test/unit/authz/roles.test.ts`
    - Assert `isAuthorized('ADMIN', action)` is `true` for every action in the `Action` union
    - Assert `isAuthorized('USER', action)` is `false` for every action
    - Assert `isAuthorized('EDITOR', 'user:manage')` and `isAuthorized('EDITOR', 'settings:manage')` are both `false`
    - Assert `isAuthorized('EDITOR', 'post:create')`, `'category:write'`, `'media:upload'` are all `true`
    - _Requirements: 18.1_

  - [x] 22.10 Write property-based test CP-6 (RBAC Role Permission Invariant)
    - Create `src/test/property/rbac.property.test.ts`
    - Use `fc.constantFrom(...allActions)` arbitrary; assert USER returns false for all, EDITOR returns false for ADMIN-only actions
    - **Property 6: RBAC — Role Permission Invariant**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.5**
    - _Requirements: 18.6_

---

### 23. Testing — Property-Based Tests (Remaining Properties)

- [ ] 23. Write remaining property-based tests
  - [x] 23.1 Write property-based test CP-7 (Post Status Transition Invariants)
    - Create `src/test/property/posts.property.test.ts`
    - Generate arbitrary Post-like objects; apply `publishPost`, `unpublishPost`, `archivePost` transition logic (extract pure transition functions from service layer); assert post-conditions for each transition
    - **Property 7: Post Status Transition Invariants**
    - **Validates: Requirements 11.3, 11.4, 11.5**
    - _Requirements: 18.6_

  - [x] 23.2 Write property-based test CP-8 (Pagination Completeness Invariant)
    - In `src/test/property/posts.property.test.ts` (same file as CP-7)
    - Generate `fc.integer({ min: 0, max: 500 })` for N and `fc.integer({ min: 1, max: 50 })` for P; verify sum of page record counts equals N, each page ≤ P records, no duplicate IDs (using the pure pagination logic from the query layer)
    - **Property 8: Pagination Completeness Invariant**
    - **Validates: Requirements 1.1, 1.5, 1.6**
    - _Requirements: 18.6_

  - [x] 23.3 Write property-based test CP-9 (Parameterized Query — No SQL Injection)
    - Create `src/test/property/query-layer.property.test.ts`
    - Use `fc.string()` containing SQL metacharacters; pass as search query parameter to `searchPosts` against a test DB (or mock); assert the query executes without DB syntax error and returns only data rows (not structural changes)
    - **Property 9: Parameterized Query — No SQL Injection**
    - **Validates: Requirements 16.1, 16.2**
    - _Requirements: 18.6_

  - [x] 23.4 Write property-based test CP-10 (Media Upload Validation — Boundary Invariant)
    - In `src/test/property/validation.property.test.ts` (same file as CP-4/CP-5)
    - Assert `MediaUploadSchema.safeParse({ size_bytes: N, mime_type: M })` fails for any `N > 10_485_760` or disallowed MIME; passes for all valid combinations
    - **Property 10: Media Upload Validation — Boundary Invariant**
    - **Validates: Requirements 13.1, 13.2, 13.3**
    - _Requirements: 18.6_

---

### 24. Testing — Integration Tests

- [ ] 24. Write integration tests for auth, RBAC, and post CRUD
  - [x] 24.1 Write authentication integration tests
    - Create `src/test/integration/auth.test.ts`
    - Test: unauthenticated GET `/admin` returns HTTP 307 redirect with `location` containing `/auth/login` (Req 18.2)
    - Test: authenticated request with valid session to `/admin` returns HTTP 200 (Req 18.2)
    - Test: authenticated request with invalid/expired session to `/admin` returns HTTP 302 to sign-in (Req 18.2)
    - Use MSW to mock Supabase Auth responses
    - _Requirements: 18.2_

  - [x] 24.2 Write RBAC enforcement integration tests
    - Create `src/test/integration/rbac.test.ts`
    - Test: EDITOR session requesting `/admin/settings` returns HTTP 403 (Req 18.2, 18.5)
    - Test: USER role requesting any `/admin/**` route returns HTTP 403 within 500ms (Req 9.4)
    - Test: unauthenticated request to role-required route returns HTTP 401 (Req 9.8)
    - _Requirements: 9.4, 9.8, 18.2, 18.5_

  - [x] 24.3 Write post CRUD lifecycle integration tests
    - Create `src/test/integration/posts-crud.test.ts`
    - Test create draft: HTTP 201, `status = 'DRAFT'` (Req 18.3)
    - Test update: HTTP 200, `updated_at` is later than before update (Req 18.3)
    - Test publish: HTTP 200, `status = 'PUBLISHED'`, `published_at` is non-null (Req 18.3)
    - Test unpublish: HTTP 200, `status = 'DRAFT'`, original `published_at` preserved (Req 18.3)
    - Test archive: HTTP 200, `status = 'ARCHIVED'` (Req 18.3)
    - Test delete: HTTP 204, post record absent from DB (Req 18.3)
    - Test unauthenticated GET to draft post's public URL returns HTTP 404 (Req 18.4)
    - _Requirements: 18.3, 18.4_

  - [x] 24.4 Write media upload/delete integration tests
    - Create `src/test/integration/media.test.ts`
    - Test: upload with valid MIME and size → HTTP 200, media record exists, URL returned (Req 13.4)
    - Test: upload with invalid MIME → HTTP 400 with field-level error (Req 13.3)
    - Test: upload with size > 10 MB → HTTP 400 with size error (Req 13.3)
    - Test: delete media in use → HTTP 400 with "media is in use" error (Req 13.9)
    - Test: unauthenticated upload → HTTP 401 (Req 13.10)
    - _Requirements: 13.3, 13.4, 13.9, 13.10_

---

### 25. Developer Documentation

- [ ] 25. Write developer documentation and seed data
  - [ ] 25.1 Create README.md
    - Create `README.md` in the project root with sections covering:
      1. Prerequisites (Node.js version, Supabase CLI)
      2. Local development setup with exact commands
      3. Supabase project initialization (`supabase init`, `supabase start`)
      4. Environment variable configuration (reference `.env.example`)
      5. Migration execution (`supabase db push`)
      6. Seed data loading (`supabase db reset` or `psql -f supabase/seed.sql`)
      7. Running the dev server, linter, formatter, type-checker, and tests
    - Each step includes the exact command or action required (Req 17.5)
    - _Requirements: 17.5_

---

### 26. Deployment Configuration

- [ ] 26. Finalize deployment configuration
  - [ ] 26.1 Verify Vercel and Supabase deployment readiness
    - Run `npm run build` locally with all required env vars set; fix any type errors or build failures (Req 20.1)
    - Verify `DATABASE_URL` points to Transaction Pooler (port 6543) with `?pgbouncer=true` and `prepare: false` is set in `client.ts` (Req 20.2)
    - Verify HTTP → HTTPS redirect is configured in `next.config.ts` for production (Req 20.3)
    - Verify `.gitignore` excludes `.env`, `.env.local`, `.env.*.local` but not `.env.example` (Req 20.4)
    - Verify `NEXT_PUBLIC_` prefix is used only for `NEXT_PUBLIC_SITE_URL` and no secrets use this prefix (Req 17.2)
    - _Requirements: 17.2, 20.1, 20.2, 20.3, 20.4_

- [ ] 27. Final checkpoint — ensure the full build, lint, and test suite passes
  - Run `npm run type-check`, `npm run lint`, `npm run test`, and `npm run build` in sequence
  - Fix any type errors, lint violations, failing tests, or build errors before considering the implementation complete
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP; they cover property-based and integration tests
- Each task references specific requirements clauses for traceability
- Tasks build incrementally — no task produces orphaned code that isn't integrated in a later step
- Property tests (CP-1 through CP-10) must only be implemented after their corresponding modules exist (enforced by the dependency graph)
- The middleware (`middleware.ts`) is the single source of truth for security headers; do not duplicate header logic in individual route handlers
- All Server Actions use `requireRole()` or `requireOwnership()` as their first statement before any data access
- Supabase Storage and DB operations in media upload/delete are treated as a pseudo-transaction via compensating operations
- The `DATABASE_URL` must always point to the Transaction Pooler (port 6543) for application code; use direct connection only for Supabase CLI operations

---

## Task Dependency Graph

```json
{
  "waves": [
    {
      "id": 0,
      "tasks": ["1.1"]
    },
    {
      "id": 1,
      "tasks": ["1.2"]
    },
    {
      "id": 2,
      "tasks": ["1.3", "1.4", "1.5"]
    },
    {
      "id": 3,
      "tasks": ["2.1", "4.1"]
    },
    {
      "id": 4,
      "tasks": ["3.1", "4.2", "4.3", "4.4", "5.1"]
    },
    {
      "id": 5,
      "tasks": ["5.2", "5.3", "5.4", "5.5", "6.1", "6.2", "6.3"]
    },
    {
      "id": 6,
      "tasks": ["6.4", "7.1", "8.1"]
    },
    {
      "id": 7,
      "tasks": ["9.1", "9.2", "10.1", "22.1", "22.4", "22.6", "22.9"]
    },
    {
      "id": 8,
      "tasks": ["9.3", "10.2", "22.2", "22.3", "22.5", "22.7", "22.8", "22.10"]
    },
    {
      "id": 9,
      "tasks": ["11.1", "11.2", "11.3", "12.1", "13.1", "13.2"]
    },
    {
      "id": 10,
      "tasks": ["11.5.1", "14.1", "15.1", "15.2", "16.1", "17.1", "17.2"]
    },
    {
      "id": 11,
      "tasks": [
        "11.5.2",
        "14.2",
        "14.3",
        "14.4",
        "14.5",
        "14.6",
        "16.2",
        "16.3",
        "17.3",
        "18.1",
        "19.1"
      ]
    },
    {
      "id": 12,
      "tasks": ["17.4", "17.5", "18.2", "19.2", "20.1", "21.1"]
    },
    {
      "id": 13,
      "tasks": ["23.1", "23.2", "23.3", "23.4", "24.1", "24.2", "24.3", "24.4"]
    },
    {
      "id": 14,
      "tasks": ["25.1", "26.1"]
    }
  ]
}
```


---

### 25. UI/UX Enhancement and Modern Design Overhaul

**Status:** 🔴 Not Started

**Objective:** Transform the blog from a functional but basic design into an attractive, modern, and engaging user experience. Based on analysis of the current implementation, improve visual hierarchy, typography, spacing, interactions, and overall aesthetic while maintaining accessibility and performance.

#### Current UX Analysis & Findings:

**Homepage (`src/app/(public)/page.tsx`)**
- ✅ Good: Clean structure, paginated posts, clear hierarchy
- ❌ Issues identified:
  - Generic "Latest Posts" heading lacks personality
  - Simple 3-column grid is functional but uninspired
  - No visual differentiation between featured/recent posts
  - Missing hero section or visual hook
  - Empty state is too plain
  - No post reading time indicator
  - Pagination controls are basic text links

**Post Detail Page (`src/app/(public)/posts/[slug]/page.tsx`)**
- ✅ Good: Readable prose styles, semantic HTML
- ❌ Issues identified:
  - Cover image treatment is basic (simple rounded corner)
  - Author section lacks visual weight
  - Category/tag badges are functional but not visually engaging
  - No related posts section
  - No social sharing affordances
  - Missing table of contents for long articles
  - No reading progress indicator
  - Metadata (date, author) lacks visual hierarchy

**Header (`src/components/layout/Header.tsx`)**
- ✅ Good: Responsive, accessible navigation
- ❌ Issues identified:
  - "My Blog" is a placeholder, needs branding
  - Header is flat, lacks depth or personality
  - Search bar design is too basic
  - No visual feedback on navigation hover/active states
  - Missing mobile menu treatment
  - No sticky header on scroll

**Post Cards (`src/components/blog/PostCard.tsx`)**
- ✅ Good: Covers all required information
- ❌ Issues identified:
  - Card design is too similar to generic blog templates
  - Hover states are minimal
  - Image aspect ratio treatment could be more dynamic
  - Category/tag badges lack visual interest
  - No excerpt fade effect for long text
  - Missing "featured" variant design
  - Card shadows are subtle but could be more pronounced

**Overall Visual Design Issues:**
- Color palette is default Tailwind (blue/gray) - lacks brand identity
- Typography hierarchy could be stronger (size/weight contrast)
- Spacing feels cramped in some areas
- Animations and transitions are missing or basic
- Dark mode support exists but isn't optimized for visual appeal
- No micro-interactions or delightful details
- Lacks modern design trends (glassmorphism, gradients, blur effects)

**Performance & Accessibility Strengths to Preserve:**
- ✅ Semantic HTML throughout
- ✅ next/image optimization
- ✅ Keyboard navigation support
- ✅ Focus indicators present
- ✅ ARIA labels where needed
- ✅ ISR caching strategy

---

#### Tasks:

- [x] **25.1 Design System Foundation**
  - [x] 25.1.1 Define custom color palette
    - Create `src/styles/design-tokens.css` with CSS custom properties
    - Define primary, secondary, accent colors (not default Tailwind blue)
    - Create comprehensive color scales (50-950) for each
    - Define semantic color tokens (success, warning, error, info)
    - Ensure WCAG AA contrast ratios for all text/background combinations
    - Create separate dark mode color mappings
    - _Requirements: 4.3 (WCAG contrast), modern branding_

  - [x] 25.1.2 Typography scale and font pairing
    - Add Google Fonts or custom font files: one serif for headings, one sans-serif for body
    - Define typographic scale in Tailwind config: display, h1-h6, body, caption, overline
    - Set up line-height and letter-spacing rules for readability
    - Create `.prose` overrides for article content
    - Ensure base font size ≥16px (Req 4.7)
    - _Requirements: 4.7 (font size), enhanced readability_

  - [x] 25.1.3 Spacing and layout utilities
    - Define consistent spacing scale (extend Tailwind defaults if needed)
    - Create layout container utilities with max-widths
    - Define responsive breakpoint conventions
    - Create grid and flexbox composition utilities
    - _Requirements: Responsive design consistency_

  - [x] 25.1.4 Animation and transition library
    - Create reusable animation utilities in `src/styles/animations.css`
    - Define entrance animations (fade-up, fade-in, slide-in)
    - Create hover/focus transition utilities
    - Add loading skeleton animations
    - Define easing curves (ease-smooth, ease-bounce, etc.)
    - Keep animations under 300ms for responsiveness
    - _Requirements: Performance, modern UX_

- [ ] **25.2 Enhanced Homepage**
  - [x] 25.2.1 Hero section
    - Add hero section above post grid with:
      - Large, eye-catching headline with gradient text effect
      - Subheading or tagline
      - Optional featured post spotlight or CTA
      - Decorative background (gradient, pattern, or subtle animation)
    - Make hero height responsive (taller on desktop)
    - Add scroll indicator or arrow
    - _Requirements: Engaging first impression_

  - [x] 25.2.2 Featured post card variant
    - Create `FeaturedPostCard.tsx` for the first/hero post
    - Larger layout (full width or 2-column span)
    - Prominent cover image with overlay gradient
    - Larger typography
    - "Featured" badge
    - _Requirements: Visual hierarchy, content prioritization_

  - [x] 25.2.3 Improved post grid layout
    - Change from uniform 3-column to masonry or bento-box style layout
    - Add staggered entrance animations on load
    - Implement hover effects:
      - Card lift (translateY + shadow increase)
      - Image zoom on hover
      - Category badge color shift
    - Add subtle parallax effect on scroll
    - _Requirements: Modern aesthetic, engagement_

  - [x] 25.2.4 Enhanced empty state
    - Replace plain text with illustrated empty state
    - Add friendly message and suggestion (e.g., "No posts yet. Check back soon!")
    - Optional: Add decorative SVG illustration
    - _Requirements: Better UX for edge case_

  - [x] 25.2.5 Improved pagination
    - Replace text links with styled button components
    - Add page number indicators (1, 2, 3...)
    - Include first/last page jumps
    - Add keyboard navigation (arrow keys)
    - Show total page count
    - Disable/dim unavailable navigation
    - _Requirements: Better navigation UX_

- [ ] **25.3 Enhanced Post Detail Page**
  - [ ] 25.3.1 Hero cover image treatment
    - Full-width cover image above content
    - Add gradient overlay for text readability
    - Position title and metadata over the image (or below with overlap)
    - Parallax scroll effect on cover image
    - Fallback to decorative gradient pattern if no image
    - _Requirements: Visual impact, modern layout_

  - [ ] 25.3.2 Reading progress indicator
    - Add thin progress bar at top of page
    - Updates based on scroll position through article
    - Smooth animation
    - Color matches brand primary
    - _Requirements: User engagement, UX feedback_

  - [ ] 25.3.3 Enhanced author byline
    - Larger author avatar (64px)
    - Author name as prominent heading
    - Author bio excerpt (if available)
    - Social links or website link
    - Visual separation from content (border or background)
    - _Requirements: Author prominence, social connection_

  - [ ] 25.3.4 Improved category/tag badges
    - Add icons or emojis to category badges
    - Use distinct colors per category (hash-based or predefined)
    - Pill-shaped with better padding
    - Hover effect (scale, brighten)
    - Group tags visually separate from categories
    - _Requirements: Visual interest, scannability_

  - [ ] 25.3.5 Table of contents (for long articles)
    - Auto-generate from H2/H3 headings
    - Sticky sidebar on desktop (or collapsible on mobile)
    - Highlight current section on scroll
    - Smooth scroll to section on click
    - Show estimated reading time
    - _Requirements: Navigation, UX for long content_

  - [ ] 25.3.6 Related posts section
    - Add "You Might Also Like" section at end of article
    - Show 3-4 related posts based on shared categories/tags
    - Use compact card design
    - _Requirements: Content discovery, engagement_

  - [ ] 25.3.7 Social sharing component
    - Add share buttons (Twitter/X, LinkedIn, Facebook, Copy Link)
    - Floating share bar on left side (desktop) or bottom (mobile)
    - Include share count (if API available)
    - Accessible button labels
    - _Requirements: Social engagement, distribution_

  - [ ] 25.3.8 Enhanced prose styling
    - Add drop cap to first paragraph
    - Blockquote styling with left border and icon
    - Code block syntax highlighting with copy button
    - Image captions with smaller, italicized text
    - Pull quotes with larger text and decorative quotation marks
    - _Requirements: Rich content presentation_

- [ ] **25.4 Header & Navigation Enhancement**
  - [ ] 25.4.1 Branded header design
    - Replace "My Blog" with logo image or stylized wordmark
    - Add tagline or subtitle (optional)
    - Use brand colors in logo/nav
    - _Requirements: Brand identity_

  - [ ] 25.4.2 Sticky header on scroll
    - Make header sticky with `position: sticky`
    - Reduce header height on scroll (compact mode)
    - Add subtle shadow when scrolled
    - Smooth transition animation
    - _Requirements: Modern UX pattern, accessibility_

  - [ ] 25.4.3 Enhanced navigation
    - Add active state styling (underline, background, or color)
    - Smooth hover transitions
    - Mobile hamburger menu with slide-in drawer
    - Menu overlay with blur backdrop
    - Accessibility: focus trap in mobile menu
    - _Requirements: Mobile UX, visual feedback_

  - [ ] 25.4.4 Improved search bar
    - Larger, more prominent search input
    - Search icon inside input field
    - Floating/expanding search on focus
    - Recent searches dropdown (optional)
    - Loading state while searching
    - Keyboard shortcuts hint (e.g., "Press / to search")
    - _Requirements: Discoverability, modern UX_

- [ ] **25.5 Enhanced Components**
  - [ ] 25.5.1 Post card improvements
    - Add glass morphism effect on hover
    - Image parallax/zoom on hover
    - Gradient overlay on image for text readability
    - Read time calculation and display ("5 min read")
    - Excerpt fade-out with "Read more" CTA
    - Skeleton loading state
    - _Requirements: Engagement, polish_

  - [ ] 25.5.2 Category & tag pages enhancement
    - Add category/tag header with:
      - Large title with gradient
      - Description (if available)
      - Post count
      - Background pattern or image
    - Show related categories/tags in sidebar
    - _Requirements: Context, navigation_

  - [ ] 25.5.3 About page redesign
    - Add hero section with author photo
    - Timeline or grid layout for bio sections
    - Social proof (testimonials, achievements)
    - Link to contact or social profiles with icons
    - _Requirements: Personal connection, professionalism_

  - [ ] 25.5.4 Footer redesign
    - Multi-column layout (links, social, newsletter signup)
    - Add social media icons with hover effects
    - Copyright with current year (dynamic)
    - Back-to-top button
    - Optional: Subscribe form for future newsletter feature
    - _Requirements: Complete UX, engagement_

- [ ] **25.6 Micro-interactions and Delighters**
  - [ ] 25.6.1 Loading states
    - Replace default loading with branded spinner
    - Skeleton screens for post cards
    - Smooth fade-in when content loads
    - _Requirements: Perceived performance_

  - [ ] 25.6.2 Scroll animations
    - Fade-up animation for post cards as they enter viewport
    - Stagger animations (cards appear sequentially)
    - Use Intersection Observer API
    - Respect `prefers-reduced-motion`
    - _Requirements: Modern UX, accessibility_

  - [ ] 25.6.3 Interactive elements polish
    - Button press animation (scale down slightly)
    - Link underline animation (grow from center)
    - Form input focus glow effect
    - Toast notifications for actions
    - _Requirements: Feedback, polish_

  - [ ] 25.6.4 Easter eggs (optional)
    - Konami code or secret interaction
    - Fun 404 page design
    - Seasonal theme variants
    - _Requirements: Delight, personality_

- [ ] **25.7 Dark Mode Optimization**
  - [ ] 25.7.1 Dedicated dark mode color palette
    - Don't just invert colors - design for dark
    - Ensure proper contrast in dark mode (Req 4.3)
    - Use warmer grays to reduce eye strain
    - Adjust shadow/glow for dark backgrounds
    - Test all components in both modes
    - _Requirements: 4.2 (dark mode), 4.3 (contrast), quality_

  - [ ] 25.7.2 Dark mode toggle enhancements
    - Add sun/moon icon toggle in header
    - Smooth transition between modes
    - Remember user preference in localStorage
    - Respect system preference on first visit
    - _Requirements: User control, modern UX_

- [ ] **25.8 Responsive & Mobile Optimization**
  - [ ] 25.8.1 Mobile-first review
    - Test all new designs on mobile viewports first
    - Ensure touch targets are ≥44×44px
    - Optimize image sizes for mobile
    - Test hamburger menu UX
    - _Requirements: Mobile UX, accessibility_

  - [ ] 25.8.2 Tablet layout optimization
    - Define 2-column layouts for tablet breakpoint
    - Adjust hero section for medium screens
    - Optimize sidebar placement
    - _Requirements: Responsive design_

- [ ] **25.9 Performance Optimization**
  - [ ] 25.9.1 Image optimization strategy
    - Ensure all images use next/image (already done)
    - Define optimal sizes and quality settings
    - Use AVIF/WebP formats (already configured)
    - Lazy load images below fold
    - _Requirements: 5.2 (next/image), 5.4 (formats), performance_

  - [ ] 25.9.2 CSS optimization
    - Use Tailwind's JIT mode (likely already enabled)
    - Remove unused CSS
    - Minimize custom CSS - leverage Tailwind utilities
    - Extract critical CSS for above-fold content
    - _Requirements: Performance, best practices_

  - [ ] 25.9.3 Animation performance
    - Use `transform` and `opacity` for animations (GPU-accelerated)
    - Avoid layout thrashing
    - Use `will-change` sparingly
    - Test on low-end devices
    - _Requirements: Performance, accessibility_

---

#### Design Inspiration & Approach:

**Modern Blog Design Trends to Consider:**
- **Brutalism/Neo-brutalism**: Bold typography, strong contrasts, unconventional layouts
- **Glassmorphism**: Frosted glass effects, blur, transparency
- **Neumorphism** (subtle): Soft shadows for depth
- **Gradient overlays**: On images, backgrounds, text
- **Asymmetric layouts**: Break out of rigid grids
- **Generous whitespace**: Let content breathe
- **Custom illustrations**: Unique visual language

**Typography Hierarchy:**
- Display: 60-72px (hero headlines)
- H1: 48-56px (page titles)
- H2: 36-40px (section headers)
- H3: 28-32px (subsections)
- Body: 16-18px (main content)
- Caption: 14px (metadata)

**Color Palette Example (customizable):**
- Primary: Deep purple or teal (not blue)
- Secondary: Complementary warm tone
- Accent: Vibrant for CTAs
- Neutral: Warm gray scale
- Surface: Off-white, not pure white

**Animation Philosophy:**
- Purposeful, not gratuitous
- Fast (< 300ms for most)
- Respect `prefers-reduced-motion`
- Enhance, don't distract

---

#### Acceptance Criteria:

- [ ] All pages have a cohesive, branded visual identity
- [ ] Design feels modern and professional (not generic)
- [ ] User feedback on interactions (hover, focus, loading)
- [ ] Dark mode is thoughtfully designed (not just inverted)
- [ ] Mobile experience is optimized and delightful
- [ ] Accessibility maintained or improved (WCAG AA)
- [ ] Performance metrics maintained or improved (Lighthouse scores)
- [ ] All animations respect `prefers-reduced-motion`
- [ ] Design system is documented and reusable

---

#### Dependencies:
- Builds on tasks 1-24 (existing functional blog)
- No breaking changes to existing functionality
- Maintain all accessibility features from task 4
- Maintain all performance features from task 5
- Can be implemented incrementally (component by component)

---

#### Notes:
- This is a visual overhaul, not a functional rewrite
- Prioritize components with highest user impact (homepage, post detail)
- Consider creating a Figma/design mockup first
- Get user feedback on designs before full implementation
- Consider A/B testing key design decisions
- Document design tokens and patterns for future consistency

