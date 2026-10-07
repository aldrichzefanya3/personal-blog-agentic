# Requirements Document

## Introduction

A secure personal blog platform built with Next.js (App Router), TypeScript, Tailwind CSS, PostgreSQL via Supabase, and Supabase Auth. The platform serves two distinct audiences: public visitors who can read and discover published content, and authenticated admins/editors who manage content through a private admin panel. The project doubles as a full-stack learning project, so architecture and security practices are held to production standards.

---

## Glossary

- **System**: The personal blog platform as a whole.
- **Blog**: The public-facing website that displays published content.
- **Admin_Panel**: The private web interface at `/admin/**` used to manage content, users, and settings.
- **Post**: A piece of content with fields: id, title, slug, excerpt, content, cover_image, author_id, status, published_at, created_at, updated_at.
- **Post_Status**: An enumeration of content states: `DRAFT`, `PUBLISHED`, `ARCHIVED`.
- **Category**: A named grouping that a Post can belong to.
- **Tag**: A keyword label; a Post can have multiple Tags.
- **Media**: An uploaded file (image) stored via Supabase Storage.
- **Slug**: A URL-safe, human-readable string derived from a Post title; used in public URLs.
- **Author**: The user account associated with a Post.
- **User**: An application-level user account with fields: id (application-assigned UUID), email, display_name, bio, avatar_url, created_at, updated_at. User identity is independent of authentication provider.
- **Auth_Identity**: A record linking an authentication provider (e.g., Supabase Auth, future OAuth providers) to an application User via provider_type, provider_user_id, and user_id.
- **Role**: A named collection of Permissions (e.g., `admin`, `editor`, `viewer`). Users are assigned one or more Roles via the `user_roles` table.
- **Permission**: A specific authorization grant represented as a string action (e.g., `users:view`, `posts:create`, `roles:assign`). Permissions are assigned to Roles via the `role_permissions` table.
- **Session**: An authenticated session managed by the current Auth_Provider, transmitted via HTTP-only cookies. The Session contains the provider_user_id which maps to a User.
- **Auth_Provider**: The pluggable authentication system currently implemented as Supabase Auth, responsible for credential verification and session issuance. Future providers (OAuth, custom) can replace it without redesigning the User/Role/Permission system.
- **AuthZ_Layer**: The server-side authorization middleware and route guards that enforce Permission-based access control via database queries against the user_roles and role_permissions tables.
- **Legacy_Schema**: The original database schema where `users.id` was a foreign key to `auth.users.id` and authorization was based on a `role` TEXT column with values ADMIN, EDITOR, USER.
- **DB**: The PostgreSQL database hosted on Supabase.
- **Query_Layer**: The module that executes parameterized SQL via Postgres.js; no ORM is used.
- **Validator**: The server-side validation layer implemented with Zod schemas.
- **Sanitizer**: The module that strips or escapes unsafe HTML from Markdown-rendered output before it reaches the browser.
- **Migration**: A versioned SQL file in `supabase/migrations/` applied in order to evolve the DB schema.
- **RLS**: Row-Level Security policies enforced by PostgreSQL on the Supabase DB.
- **Open_Graph**: A metadata protocol for rich link previews on social platforms.
- **Sitemap**: An XML document at `/sitemap.xml` enumerating public URLs for search engine crawlers.
- **Transaction_Pooler**: The Supabase connection pooler mode compatible with serverless (Vercel) deployments; requires `prepare: false`.
- **Server_Component**: A Next.js React Server Component that renders on the server and never ships its logic to the browser.
- **Client_Component**: A Next.js component that renders in the browser and uses React client-side APIs.

---

## Requirements

### Requirement 1: Public Post Browsing

**User Story:** As a visitor, I want to browse published blog posts so that I can discover content relevant to my interests.

#### Acceptance Criteria

1. THE Blog SHALL display a paginated list of Posts whose status is `PUBLISHED`, ordered by `published_at` descending, with a maximum of 10 Posts per page.
2. WHEN a visitor navigates to a post's canonical URL (`/posts/<slug>`), THE Blog SHALL display the full content of the matching Published Post, including title, full body content rendered from Markdown, cover image (if present), author name, published date, associated Category name(s), and Tag labels.
3. IF a visitor requests a URL for a Post whose status is not `PUBLISHED`, THEN THE Blog SHALL return an HTTP 404 response without revealing the existence or content of the Post.
4. THE Blog SHALL display each Post summary in the paginated list with: title, excerpt of no more than 300 characters, cover image (if present), author name, published date formatted as YYYY-MM-DD, associated Category name(s), and Tag labels.
5. WHEN a visitor selects a Category, THE Blog SHALL display only Published Posts associated with that Category, using the same paginated layout defined in criterion 1.
6. WHEN a visitor selects a Tag, THE Blog SHALL display only Published Posts associated with that Tag, using the same paginated layout defined in criterion 1.
7. THE Blog SHALL render Published Post content as sanitized HTML converted from Markdown, stripping all `<script>` tags, inline event handlers (e.g. `onclick`, `onerror`), and `javascript:` URLs before sending the response to the visitor's browser.
8. THE Blog SHALL display an author profile page at `/about` containing the author's bio text and at least one external profile link.
9. WHEN a visitor requests a page number beyond the last available page, THE Blog SHALL return an HTTP 404 response.
10. IF a Category or Tag has no associated Published Posts, THEN THE Blog SHALL display an empty list with a message indicating no posts are available, rather than returning an HTTP 404 response.

---

### Requirement 2: Post Search

**User Story:** As a visitor, I want to search blog posts by keyword so that I can find specific content quickly.

#### Acceptance Criteria

1. WHEN a visitor submits a non-empty search query of 1 to 200 characters, THE Blog SHALL return a list of Published Posts whose title, excerpt, or content contains the query as a case-insensitive substring match, limited to a maximum of 20 results.
2. IF a visitor submits a search query that is empty or exceeds 200 characters, THEN THE Blog SHALL display a validation message indicating the input constraint and SHALL NOT execute a search.
3. WHEN a visitor submits a search query that returns results, THE Blog SHALL display those results ordered by the number of fields (title, excerpt, content) in which the query appears, descending, with ties broken by post published date descending.
4. IF no Published Posts match the search query, THEN THE Blog SHALL display a "no results" message.

---

### Requirement 3: SEO and Metadata

**User Story:** As a blog owner, I want every public page to be properly indexed and shareable so that readers can discover my content through search engines and social platforms.

#### Acceptance Criteria

1. THE Blog SHALL generate a unique `<title>` tag of no more than 60 characters and a `<meta name="description">` tag of no more than 160 characters for each public page, derived from the Post title and excerpt. If the Post has no excerpt, THE Blog SHALL use the first 160 characters of the Post content as the description fallback.
2. THE Blog SHALL include Open_Graph tags (`og:title`, `og:description`, `og:image`, `og:url`, `og:type`) on every Post detail page. If the Post has no cover image, `og:image` SHALL fall back to a site-wide default image.
3. THE Blog SHALL include Twitter/X Card metadata using the `summary_large_image` card type with tags `twitter:card`, `twitter:title`, `twitter:description`, and `twitter:image` on every Post detail page.
4. THE Blog SHALL serve a machine-readable Sitemap at `/sitemap.xml` listing all Published Post URLs.
5. THE Blog SHALL serve a `robots.txt` file that disallows indexing of all `/admin/**` routes and allows all other public routes.
6. THE Blog SHALL set a canonical `<link rel="canonical">` tag on every public page to prevent duplicate-content penalties.
7. THE Blog SHALL use semantic HTML elements (e.g., `<article>`, `<nav>`, `<main>`, `<header>`, `<footer>`) on all public pages.
8. THE Blog SHALL include JSON-LD structured data of type `BlogPosting` on each Post detail page, with at minimum the properties: `headline`, `author`, `datePublished`, `description`, and `url`.
9. THE Blog SHALL derive Slugs deterministically from Post titles by: converting to lowercase, replacing non-alphanumeric characters with hyphens, collapsing consecutive hyphens into one, and trimming leading/trailing hyphens. If a slug collision occurs, THE Blog SHALL append a numeric suffix starting at `-2`, incrementing until unique.

---

### Requirement 4: Responsive Design and Accessibility

**User Story:** As a visitor, I want the blog to be comfortable to read and navigate on any device so that I can access content from desktop or mobile.

#### Acceptance Criteria

1. THE Blog SHALL render a fully usable layout at viewport widths from 320px through 2560px without horizontal overflow.
2. THE Blog SHALL support a light color scheme and a dark color scheme, switching based on the visitor's OS-level color scheme preference (via the `prefers-color-scheme` media query), with the light scheme applied as the default when no system preference is detected.
3. THE Blog SHALL achieve a color contrast ratio of at least 4.5:1 for normal text (text below 18pt or below 14pt bold) and 3:1 for large text (text at or above 18pt, or 14pt bold) in both light and dark modes, in accordance with WCAG 2.1 AA.
4. THE Blog SHALL be keyboard-navigable so that all interactive elements (links, buttons, form fields) are reachable and operable via keyboard alone, with a visible focus indicator on every focused element that meets a minimum 3:1 contrast ratio against its adjacent background.
5. THE Blog SHALL include descriptive `alt` attributes on all meaningful images so that screen readers can convey their purpose, and decorative images SHALL use an empty `alt` attribute (`alt=""`) so that screen readers skip them.
6. THE Blog SHALL set the HTML `lang` attribute on every page to a valid BCP 47 language tag (e.g., `en` for English).
7. WHEN a visitor navigates to a page, THE Blog SHALL render all content at a base font size of at least 16px, and all text SHALL remain readable without loss of content or functionality when the browser text size is scaled up to 200%.
8. WHEN a visitor activates an interactive element via keyboard, THE Blog SHALL execute the same action as a pointer-device activation of that element.

---

### Requirement 5: Performance

**User Story:** As a visitor, I want pages to load quickly so that I can read content without waiting.

#### Acceptance Criteria

1. THE Blog SHALL use Next.js static generation or incremental static regeneration for Published Post listing and detail pages so that responses are served from cache without a DB query on every request.
2. THE Blog SHALL use Next.js Server_Components for all data-fetching operations on public pages so that data-fetching logic is never shipped to the client bundle.
3. WHEN a Published Post is updated or a new Post is published, THE Blog SHALL revalidate the affected cached pages within 60 seconds so that visitors see current content within that window.
4. THE Blog SHALL serve cover images in a next-gen format (WebP or AVIF) via the Next.js Image component so that image payloads are minimized.
5. THE Blog SHALL paginate Post listings at a maximum of 10 Posts per page so that initial page payload is bounded.
6. THE Query_Layer SHALL establish DB connections using the Supabase Transaction_Pooler with `prepare: false` so that connections are compatible with Vercel serverless functions.
7. IF the page revalidation process fails (e.g., due to a downstream error), THEN THE Blog SHALL continue serving the previously cached version and SHALL log the revalidation error, rather than returning an error response to visitors.
8. IF a cover image is unavailable at render time, THEN THE Blog SHALL render the page with a placeholder image rather than a broken image or an error response.

---

### Requirement 6: Content Model and Database Schema

**User Story:** As a blog owner, I want a well-structured database schema so that content is stored consistently and relationships are enforced at the database level.

#### Acceptance Criteria

1. THE DB SHALL define a `posts` table with columns: `id` (UUID primary key, default `gen_random_uuid()`), `title` (text, not null, max 255 characters), `slug` (text, not null, unique, max 255 characters), `excerpt` (text, max 500 characters), `content` (text), `cover_image_url` (text, max 2048 characters), `author_id` (UUID, not null, foreign key → `users.id`), `status` (text, not null, check constraint in (`DRAFT`, `PUBLISHED`, `ARCHIVED`), default `DRAFT`), `published_at` (timestamptz, nullable), `created_at` (timestamptz, not null, default `now()`), `updated_at` (timestamptz, not null, default `now()`).
2. THE DB SHALL define a `categories` table with columns: `id` (UUID primary key, default `gen_random_uuid()`), `name` (text, not null, unique, max 100 characters), `slug` (text, not null, unique, max 100 characters), `created_at` (timestamptz, not null, default `now()`).
3. THE DB SHALL define a `tags` table with columns: `id` (UUID primary key, default `gen_random_uuid()`), `name` (text, not null, unique, max 100 characters), `slug` (text, not null, unique, max 100 characters), `created_at` (timestamptz, not null, default `now()`).
4. THE DB SHALL define a `post_categories` join table with columns: `post_id` (UUID, not null, foreign key → `posts.id` on delete cascade), `category_id` (UUID, not null, foreign key → `categories.id` on delete cascade), primary key (`post_id`, `category_id`).
5. THE DB SHALL define a `post_tags` join table with columns: `post_id` (UUID, not null, foreign key → `posts.id` on delete cascade), `tag_id` (UUID, not null, foreign key → `tags.id` on delete cascade), primary key (`post_id`, `tag_id`).
6. THE DB SHALL define a `users` table with columns: `id` (UUID primary key, default `gen_random_uuid()`), `email` (text, not null, unique, max 255 characters), `display_name` (text, not null, max 100 characters, default `'Anonymous'`), `bio` (text, max 1000 characters), `avatar_url` (text, max 2048 characters), `created_at` (timestamptz, not null, default `now()`), `updated_at` (timestamptz, not null, default `now()`).
7. THE DB SHALL define an `auth_identities` table with columns: `id` (UUID primary key, default `gen_random_uuid()`), `user_id` (UUID, not null, foreign key → `users.id` on delete cascade), `provider_type` (text, not null, max 50 characters), `provider_user_id` (text, not null, max 255 characters), `created_at` (timestamptz, not null, default `now()`), with a unique constraint on (`provider_type`, `provider_user_id`) to prevent duplicate provider mappings.
8. THE DB SHALL define a `roles` table with columns: `id` (UUID primary key, default `gen_random_uuid()`), `name` (text, not null, unique, max 50 characters), `description` (text, max 500 characters), `created_at` (timestamptz, not null, default `now()`).
9. THE DB SHALL define a `permissions` table with columns: `id` (UUID primary key, default `gen_random_uuid()`), `action` (text, not null, unique, max 100 characters), `description` (text, max 500 characters), `created_at` (timestamptz, not null, default `now()`).
10. THE DB SHALL define a `user_roles` join table with columns: `user_id` (UUID, not null, foreign key → `users.id` on delete cascade), `role_id` (UUID, not null, foreign key → `roles.id` on delete cascade), `assigned_at` (timestamptz, not null, default `now()`), primary key (`user_id`, `role_id`).
11. THE DB SHALL define a `role_permissions` join table with columns: `role_id` (UUID, not null, foreign key → `roles.id` on delete cascade), `permission_id` (UUID, not null, foreign key → `permissions.id` on delete cascade), primary key (`role_id`, `permission_id`).
12. THE DB SHALL define a `media` table with columns: `id` (UUID primary key, default `gen_random_uuid()`), `uploader_id` (UUID, not null, foreign key → `users.id`), `filename` (text, not null, max 255 characters), `storage_path` (text, not null, unique, max 1024 characters), `mime_type` (text, not null, max 127 characters), `size_bytes` (bigint, not null, check constraint `size_bytes > 0`), `created_at` (timestamptz, not null, default `now()`).
13. THE DB SHALL create indexes on: `posts.slug`, `posts.status`, `posts.author_id`, `posts.published_at`, `categories.slug`, `tags.slug`, `users.email`, `auth_identities.user_id`, `auth_identities(provider_type, provider_user_id)`.
14. THE DB SHALL enforce all foreign key, unique, check, and not-null constraints at the database level.
15. THE DB SHALL apply an `updated_at` trigger on the `posts` table that sets `updated_at = now()` on every row update.
16. THE DB SHALL apply an `updated_at` trigger on the `users` table that sets `updated_at = now()` on every row update.
17. THE DB SHALL enforce a check constraint on the `posts` table requiring that `published_at IS NOT NULL` whenever `status = 'PUBLISHED'`.
18. THE DB SHALL enforce a check constraint on the `posts`, `categories`, and `tags` tables requiring that each `slug` column matches the pattern `^[a-z0-9][a-z0-9-]*[a-z0-9]$` (or is a single character `[a-z0-9]`), with no consecutive hyphens.
19. THE DB SHALL enforce a check constraint on the `users` table requiring that `email` matches a valid email format pattern.
20. THE DB SHALL seed initial data including at minimum: three standard roles (`admin`, `editor`, `viewer`) and twelve core permissions (`users:view`, `users:create`, `users:update`, `users:delete`, `roles:view`, `roles:create`, `roles:update`, `roles:delete`, `roles:assign`, `posts:create`, `posts:update`, `profile:update`), with the `admin` role granted all twelve permissions, the `editor` role granted `posts:create`, `posts:update`, and `profile:update`, and the `viewer` role granted only `profile:update`.

---

### Requirement 7: SQL Migration Strategy

**User Story:** As a developer, I want versioned SQL migrations so that the DB schema evolves in a controlled, reproducible manner.

#### Acceptance Criteria

1. THE System SHALL store all schema changes as versioned SQL files in `supabase/migrations/` with filenames matching the pattern `<timestamp>_<description>.sql`, where `<timestamp>` is a 14-digit UTC timestamp in the format `YYYYMMDDHHmmss` and `<description>` contains only lowercase letters, digits, and underscores with a maximum length of 60 characters.
2. WHEN a migration run is initiated, THE System SHALL apply all pending migrations in strict ascending timestamp order, applying each migration exactly once, so that schema evolution is deterministic and idempotent.
3. THE System SHALL use the Supabase CLI (`supabase db push` to apply migrations and `supabase migration new` to create new migration files) to manage and apply migrations so that local and remote schemas remain in sync.
4. THE System SHALL include a seed SQL file at `supabase/seed.sql` containing no fewer than 3 and no more than 100 representative sample rows per table, so that local development environments can be bootstrapped without manual data entry.
5. IF a migration introduces a destructive change (DROP COLUMN, DROP TABLE, or column rename), THEN THE System SHALL include a down-migration comment block in the same file, beginning with `-- DOWN:` and documenting the exact SQL reverse operation sufficient to undo the change.
6. IF a migration file contains a syntax error or fails to execute against the target database, THEN THE System SHALL halt the migration run, report an error message indicating the failing migration filename and failure reason, and leave all previously applied migrations unchanged.

---

### Requirement 8: Authentication

**User Story:** As a blog admin, I want to sign in securely and have my session managed safely so that only I can access protected functionality.

#### Acceptance Criteria

1. WHEN a user submits valid credentials to the Auth_Provider, THE System SHALL resolve the provider_user_id to an application User via the `auth_identities` table, or create a new User if no mapping exists, and establish a Session stored exclusively in an HTTP-only, Secure, SameSite=Lax cookie with a maximum age of 24 hours so that the session token is inaccessible to JavaScript.
2. WHEN a new user authenticates for the first time with provider credentials, THE System SHALL create a User record with `email` from the provider, `display_name = 'Anonymous'`, and create an `auth_identities` record linking the provider_user_id to the new User, all within a single database transaction.
3. WHEN an existing user authenticates with provider credentials matching an existing `auth_identities` record, THE System SHALL NOT create a duplicate User or auth_identities record, and SHALL resolve to the existing User.
4. THE System SHALL NOT store session tokens, JWTs, or Auth_Provider keys in `localStorage` or `sessionStorage`.
5. THE System SHALL NOT expose the Auth_Provider service-role key or any privileged credentials to any browser-executed code.
6. WHEN a user requests a password reset, THE Auth_Provider SHALL send a reset link to the user's registered email address, SHALL invalidate any prior unused reset tokens for that account, and SHALL expire the new reset link after 60 minutes.
7. WHEN a user follows a valid password-reset link and submits a new password that satisfies the password policy, THE Auth_Provider SHALL update the credential, invalidate the consumed reset token, and redirect the user to the sign-in page.
8. IF a user follows a password-reset link that is expired or has already been consumed, THEN THE Auth_Provider SHALL reject the request and redirect the user to the password-reset request page with an error message indicating the link is invalid or expired.
9. WHEN a user explicitly logs out, THE System SHALL invalidate the server-side Session and instruct the browser to clear the session cookie so that the cookie cannot be replayed.
10. WHEN an unauthenticated request is made to any `/admin/**` route, THE System SHALL redirect the request to the sign-in page, preserving the originally requested URL as a redirect parameter.
11. WHEN an authenticated request is made to any `/admin/**` route, THE AuthZ_Layer SHALL verify the Session server-side, resolve the User via `auth_identities`, and load the User's Permissions before rendering any content.
12. THE Auth_Provider SHALL enforce a minimum password length of 8 characters and a maximum of 128 characters, containing at least one uppercase letter, one lowercase letter, and one digit.
13. IF a user submits credentials that fail authentication, THEN THE Auth_Provider SHALL reject the attempt with an error message that does not distinguish between an unknown username and an incorrect password, and SHALL block further attempts from that account for 15 minutes after 5 consecutive failures within a 10-minute window.
14. THE System SHALL provide a secure one-time admin setup flow at `/auth/setup-admin` that: verifies a secret token from environment variables, creates the first admin User with provided credentials, assigns the `admin` role, creates a corresponding `auth_identities` record, and becomes inaccessible (returns HTTP 404) after the first admin User exists.

---

### Requirement 9: Permission-Based Access Control

**User Story:** As a blog owner, I want fine-grained permission-based authorization so that different user types can only perform the actions appropriate to their assigned roles and permissions.

#### Acceptance Criteria

1. THE AuthZ_Layer SHALL enforce that only users with the `users:view` permission can list users, and only users with the `users:create`, `users:update`, or `users:delete` permissions can create, update, or delete users respectively.
2. THE AuthZ_Layer SHALL enforce that only users with the `roles:view` permission can list roles and permissions, and only users with the `roles:create`, `roles:update`, `roles:delete`, or `roles:assign` permissions can create roles, update roles, delete roles, or assign roles to users respectively.
3. THE AuthZ_Layer SHALL enforce that only users with the `posts:create` or `posts:update` permissions can create or edit posts.
4. THE AuthZ_Layer SHALL enforce that all authenticated users have the `profile:update` permission to update their own User record (`display_name`, `bio`, `avatar_url`), regardless of assigned roles.
5. WHEN a user with no admin or editor roles (i.e., only the `viewer` role or no roles) requests any `/admin/**` route, THE AuthZ_Layer SHALL return an HTTP 403 response within 500 milliseconds without revealing route-specific resource details in the response body.
6. THE AuthZ_Layer SHALL perform all Permission checks on the server side by querying the DB for the authenticated User's assigned Roles and their associated Permissions, so that authorization enforcement cannot be bypassed by manipulating client-side state or UI.
7. THE DB SHALL enforce RLS policies on the `posts`, `categories`, `tags`, `media`, `users`, `roles`, `permissions`, `user_roles`, and `role_permissions` tables so that unauthorized DB-level reads and writes are rejected even if the application layer is bypassed.
8. WHEN an authenticated user attempts to edit or delete a Post they do not own, THE AuthZ_Layer SHALL return an HTTP 403 response unless the user holds the `posts:update` or `posts:delete` permission respectively (i.e., permission-based, not ownership-based for privileged users).
9. IF an unauthenticated request is made to any route requiring a Permission, THEN THE AuthZ_Layer SHALL return an HTTP 401 response without processing the request further.
10. WHEN a Permission check is performed, THE AuthZ_Layer SHALL derive the user's Permissions exclusively from server-side database queries joining `users` → `user_roles` → `role_permissions` → `permissions`, not from any client-supplied permission values in the request body or headers.
11. IF a user's role assignment is changed (added or removed via `user_roles`), THEN THE AuthZ_Layer SHALL apply the new permissions to all subsequent requests within 60 seconds of the change being persisted, without requiring the affected user to re-authenticate.
12. THE System SHALL NOT allow users to assign themselves roles or grant themselves permissions; role assignment requires the `roles:assign` permission held by a different user.
13. THE System SHALL allow an `admin` role user to create new users directly via the Admin_Panel, setting email and initial roles, without requiring the new user to authenticate first. The created user SHALL have a placeholder `auth_identities` record or remain without one until first authentication.
14. THE System SHALL provide Admin_Panel UI for: listing all users with their emails, display names, and assigned role names; creating new users; updating user emails and role assignments; deleting users (with cascade to `auth_identities`, `user_roles`, `posts`, `media`).
15. THE System SHALL provide Admin_Panel UI for: listing all roles with their names and assigned permission counts; creating new roles; updating role names and descriptions; deleting roles (with cascade to `user_roles` and `role_permissions`); viewing and editing the permissions assigned to each role.
16. THE System SHALL enforce that the last user with the `admin` role cannot have that role removed, to prevent lock-out scenarios where no admin users remain.

---

### Requirement 10: Admin Panel — Dashboard

**User Story:** As a blog admin, I want a dashboard showing platform statistics so that I can understand the state of my content at a glance.

#### Acceptance Criteria

1. WHEN an authenticated user with at least one permission granting admin panel access navigates to `/admin`, THE Admin_Panel SHALL display aggregate counts of: total Posts by status (`DRAFT`, `PUBLISHED`, `ARCHIVED`), total Categories, total Tags, and total Media items.
2. THE Admin_Panel SHALL display the 5 most recently updated Posts on the dashboard, each showing at minimum the Post title, status, and last-updated timestamp.
3. IF an unauthenticated request is made to `/admin`, THEN THE Admin_Panel SHALL reject the request and return an error response indicating insufficient authorization, without exposing any Post content, counts, or aggregate statistics.
4. IF an authenticated user navigates to `/admin` and the data required to populate the dashboard is unavailable, THEN THE Admin_Panel SHALL display an error message indicating that the dashboard data could not be loaded, without showing partial or stale counts.

---

### Requirement 11: Admin Panel — Post Management

**User Story:** As a blog admin or editor, I want to create, edit, publish, archive, and delete posts so that I can fully manage my content lifecycle.

#### Acceptance Criteria

1. WHEN an authorized user submits a new Post with at least a title and body content each containing at least 1 non-whitespace character, THE Admin_Panel SHALL persist the Post to the DB with status `DRAFT`, a `created_at` timestamp set to the current time, and a generated unique Slug derived from the title.
2. WHEN an authorized user saves an existing Post, THE Admin_Panel SHALL update the Post record and set `updated_at` to the current timestamp.
3. WHEN an authorized user publishes a Post, THE Admin_Panel SHALL set the Post's status to `PUBLISHED` and set `published_at` to the current timestamp if and only if `published_at` is currently null.
4. WHEN an authorized user unpublishes a Post, THE Admin_Panel SHALL set the Post's status to `DRAFT` and SHALL NOT modify the original `published_at` value.
5. WHEN an authorized user archives a Post, THE Admin_Panel SHALL set the Post's status to `ARCHIVED`.
6. WHEN an authorized user deletes a Post, THE Admin_Panel SHALL permanently remove the Post record and all associated `post_categories` and `post_tags` rows from the DB via cascade and SHALL display a confirmation prompt requiring explicit user confirmation before the deletion is executed.
7. THE Admin_Panel SHALL provide a Markdown editor with a live preview pane that updates within 1 second of the user pausing input, so that an authorized user can compose and preview Post content before saving.
8. WHEN an authorized user assigns a Category or Tag to a Post, THE Admin_Panel SHALL persist the relationship in the appropriate join table and SHALL NOT create a duplicate relationship row if the same Category or Tag is already assigned to that Post.
9. THE Validator SHALL reject a Post submission whose title exceeds 255 characters or whose slug does not match the pattern `^[a-z0-9]+(?:-[a-z0-9]+)*$`, and SHALL return an error message indicating which field failed validation and the rule that was violated.
10. WHEN a Slug conflict is detected (another Post already has the same Slug), THE Admin_Panel SHALL append a numeric suffix (starting at `-2`, incrementing by 1 until unique, up to a maximum suffix of `-999`) to produce a unique Slug rather than rejecting the submission.
11. IF an authorized user submits a Post and a required field (title or body content) is empty or contains only whitespace, THEN THE Validator SHALL reject the submission and return an error message indicating which field is missing before any DB write occurs.
12. IF the DB is unavailable when an authorized user attempts to save, publish, archive, or delete a Post, THEN THE Admin_Panel SHALL return an error message indicating the operation could not be completed and SHALL NOT partially modify the Post record.

---

### Requirement 12: Admin Panel — Category and Tag Management

**User Story:** As a blog admin, I want to manage categories and tags so that I can keep my taxonomy organized.

#### Acceptance Criteria

1. WHEN an authorized user creates a Category with a unique name of 1–100 characters, THE Admin_Panel SHALL persist the Category and auto-generate its Slug by converting the name to lowercase, replacing spaces and non-alphanumeric characters with hyphens, collapsing consecutive hyphens, and trimming leading/trailing hyphens.
2. WHEN an authorized user creates a Tag with a unique name of 1–100 characters, THE Admin_Panel SHALL persist the Tag and auto-generate its Slug using the same slug-generation rule as criterion 1.
3. IF an authorized user attempts to create a Category or Tag whose name already exists (case-insensitive match), THEN THE Admin_Panel SHALL return a validation error and SHALL NOT insert a duplicate record.
4. WHEN an authorized user deletes a Category, THE Admin_Panel SHALL remove the Category and all associated `post_categories` rows via cascade, leaving the Posts intact.
5. WHEN an authorized user deletes a Tag, THE Admin_Panel SHALL remove the Tag and all associated `post_tags` rows via cascade, leaving the Posts intact.
6. IF an authorized user submits a Category or Tag name that is empty or exceeds 100 characters, THEN THE Admin_Panel SHALL return a validation error indicating the name constraint and SHALL NOT insert a record.
7. WHEN an authorized user updates a Category or Tag name, THE Admin_Panel SHALL regenerate the Slug from the new name using the slug-generation rule in criterion 1 and update both the name and slug in the DB atomically.

---

### Requirement 13: Admin Panel — Media Management

**User Story:** As a blog admin, I want to upload and manage images so that I can use them in post content and as cover images.

#### Acceptance Criteria

1. WHEN an authorized user uploads an image file, THE Admin_Panel SHALL validate that the file's MIME type is one of: `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `image/avif` before storing it.
2. WHEN an authorized user uploads an image file, THE Admin_Panel SHALL validate that the file size does not exceed 10 MB (10,485,760 bytes).
3. IF a file upload fails MIME type or size validation, THEN THE Admin_Panel SHALL return an error message indicating which validation rule was violated and SHALL NOT store the file.
4. WHEN an authorized user uploads an image file that passes all validation, THE Admin_Panel SHALL store the file in Supabase Storage and record the `storage_path`, `mime_type`, `size_bytes`, `uploader_id`, and upload timestamp in the `media` table within 10 seconds of the upload request.
5. IF the file write to Supabase Storage or the `media` table record insertion fails, THEN THE Admin_Panel SHALL roll back both operations, return an error message indicating the upload failed, and SHALL NOT retain a partial record or orphaned file.
6. THE Admin_Panel SHALL generate a URL for each stored Media item and include it in the upload response and in list responses so that authorized users can copy or embed the URL.
7. WHEN an authorized user requests a list of Media items, THE Admin_Panel SHALL return all media records belonging to that user including `storage_path`, `mime_type`, `size_bytes`, `uploader_id`, upload timestamp, and URL, with a maximum of 100 items per page.
8. WHEN an authorized user deletes a Media item, THE Admin_Panel SHALL remove the file from Supabase Storage and delete the corresponding `media` row from the DB atomically such that either both succeed or neither is applied.
9. IF a Media item is referenced as a post's cover image or embedded in any post's content, THEN THE Admin_Panel SHALL NOT delete the Media item and SHALL return an error message indicating the media is in use.
10. THE System SHALL NOT allow unauthenticated requests to upload, list, or delete Media items.

---

### Requirement 14: Input Validation

**User Story:** As a blog owner, I want all user inputs validated on the server so that malformed or malicious data cannot reach the database.

#### Acceptance Criteria

1. THE Validator SHALL validate all form inputs and API request bodies using Zod schemas on the server side before any DB write occurs.
2. IF a request body fails Validator schema validation, THEN THE System SHALL return an HTTP 400 response containing a structured error object listing each invalid field and the reason for rejection.
3. THE Validator SHALL enforce that UUIDs in URL path parameters match the UUID v4 format before executing any DB query.
4. THE Validator SHALL enforce maximum length constraints on all text fields matching the constraints defined in the DB schema (e.g., title ≤ 255 characters).
5. THE System SHALL sanitize all Markdown content through the Sanitizer before rendering it as HTML so that `<script>` tags, event handler attributes, and other XSS vectors are stripped.
6. IF a UUID path parameter fails format validation, THEN THE System SHALL return an HTTP 400 response with an error indicating the parameter is invalid and SHALL NOT execute any DB query.
7. IF the Sanitizer encounters an error while processing Markdown content, THEN THE System SHALL return an HTTP 500 response and SHALL NOT persist or render the unprocessed content.

---

### Requirement 15: Security Headers and CSRF Protection

**User Story:** As a blog owner, I want standard security headers and CSRF protection so that visitors and my admin session are protected against common web attacks.

#### Acceptance Criteria

1. THE System SHALL set a `Content-Security-Policy` response header on all responses with at minimum the directives: `default-src 'self'`, `script-src 'self'`, and `style-src 'self' 'unsafe-inline'` to restrict resource loading to trusted origins.
2. THE System SHALL set the `X-Frame-Options: DENY` response header on all responses to prevent the site from being embedded in iframes.
3. THE System SHALL set the `X-Content-Type-Options: nosniff` response header on all responses.
4. THE System SHALL set the `Referrer-Policy: strict-origin-when-cross-origin` response header on all responses.
5. THE System SHALL set the `Strict-Transport-Security: max-age=31536000; includeSubDomains` response header on all HTTPS responses.
6. WHEN an Admin_Panel state-mutating request (POST, PUT, PATCH, DELETE) is received with a valid CSRF token, THE System SHALL process the request normally.
7. IF an Admin_Panel state-mutating request is received without a valid CSRF token or with a mismatched token, THEN THE System SHALL reject the request with an HTTP 403 response, return an error message indicating CSRF validation failure, and SHALL NOT apply the requested mutation.
8. IF a required security header cannot be set on a response, THEN THE System SHALL log the failure and return an HTTP 500 response rather than sending the response without the header.

---

### Requirement 16: SQL Injection Prevention

**User Story:** As a blog owner, I want all database queries to use parameterized SQL so that user-controlled values can never alter query structure.

#### Acceptance Criteria

1. THE Query_Layer SHALL use Postgres.js parameterized query syntax (tagged template literals or positional parameters) for every DB query that incorporates user-supplied values.
2. THE System SHALL NOT construct any DB query by concatenating or interpolating user-controlled strings into a SQL string.
3. WHEN a user-supplied value is received, THE Query_Layer SHALL validate the value through the Validator for type, length, and format constraints before passing it as a parameter; IF validation fails, THE Query_Layer SHALL reject the request and SHALL NOT execute the DB query.
4. IF the Validator rejects a user-supplied value, THEN THE System SHALL return an error response indicating the input is invalid without leaking query structure, table names, or schema details.

---

### Requirement 17: Environment Configuration and Secret Management

**User Story:** As a developer, I want all secrets managed through environment variables so that credentials are never hard-coded or committed to the repository.

#### Acceptance Criteria

1. THE System SHALL read all secrets (Supabase URL, Supabase anon key, Supabase service-role key, DB connection string) exclusively from server-side environment variables, where each variable name matches the corresponding entry in `.env.example`.
2. THE System SHALL NOT reference `NEXT_PUBLIC_` prefixed environment variables for any secret value so that secrets are not included in the client bundle.
3. IF any required environment variable (Supabase URL, Supabase anon key, Supabase service-role key, DB connection string) is absent or empty at server startup, THEN THE System SHALL exit with a non-zero status code and emit an error message identifying the name of each missing variable before accepting any requests.
4. THE System SHALL include a `.env.example` file listing all required environment variable names with placeholder values and documentation comments, where placeholder values contain no real credentials and each entry includes an inline comment describing the variable's purpose and expected format.
5. THE System SHALL include a `README.md` section documenting local development setup, Supabase project initialization, environment variable configuration, migration execution, and seed data loading, where each step includes the exact command or action required to complete it.

---

### Requirement 18: Testing Requirements

**User Story:** As a developer, I want a test suite covering critical paths so that regressions are detected automatically before deployment.

#### Acceptance Criteria

1. THE System SHALL include unit tests for: Validator schemas (asserting that valid inputs pass and invalid inputs return field-level errors), Sanitizer output (asserting that output contains no `<script>` tags, inline event handlers, or `javascript:` URLs), Slug generation (asserting idempotence and character invariant), and AuthZ_Layer role-checking logic (asserting correct boolean outcomes for each Role/action combination).
2. THE System SHALL include integration tests covering: user sign-in with valid credentials (expects HTTP 200 and a Set-Cookie header), protected admin route access with a valid Session (expects HTTP 200), protected admin route access with an invalid or expired Session (expects HTTP 302 redirect to the sign-in page), and RBAC enforcement (expects HTTP 403 when a user with insufficient Role requests a restricted route).
3. THE System SHALL include integration tests for Post CRUD verifying: create draft (expects HTTP 201 and `status = DRAFT`), update (expects HTTP 200 and updated `updated_at`), publish (expects HTTP 200 and `status = PUBLISHED` with non-null `published_at`), unpublish (expects HTTP 200, `status = DRAFT`, and original `published_at` preserved), archive (expects HTTP 200 and `status = ARCHIVED`), delete (expects HTTP 204 and the Post record absent from the DB).
4. THE System SHALL include an integration test verifying that an unauthenticated GET request to a Draft Post's public URL returns HTTP 404.
5. THE System SHALL include an integration test verifying that an authenticated request by a user with the `EDITOR` Role to a user-management route returns HTTP 403.
6. THE System SHALL include property-based tests for correctness properties CP-1 (slug idempotence), CP-2 (slug character invariant), CP-3 (sanitization XSS safety invariant), CP-4 (Zod validator invalid input rejection), and CP-5 (Zod validator valid input round-trip).

---

### Requirement 19: Developer Experience

**User Story:** As a developer, I want clear tooling setup and consistent code quality automation so that I can develop efficiently and maintain code standards.

#### Acceptance Criteria

1. THE System SHALL use ESLint with `eslint-config-next` configured for TypeScript so that code style violations are reported as errors or warnings during development.
2. THE System SHALL use Prettier with `prettier-plugin-tailwindcss` for TypeScript and Tailwind CSS class sorting so that formatting is enforced consistently across the codebase.
3. THE System SHALL include a TypeScript configuration (`tsconfig.json`) with `strict: true` so that type errors are caught at compile time.
4. THE System SHALL define the following scripts in `package.json`: `lint` (runs ESLint), `format` (runs Prettier), `type-check` (runs `tsc --noEmit`), `test` (runs the test suite), and `build` (runs `next build`), so that each step of the developer workflow is executable with a single command.

---

### Requirement 20: Deployment

**User Story:** As a blog owner, I want the application deployed to Vercel with a production-grade Supabase backend so that the blog is publicly accessible and reliably hosted.

#### Acceptance Criteria

1. WHEN the `build` script is executed with all required environment variables set, THE System SHALL complete the Next.js production build without errors.
2. THE System SHALL connect to the Supabase DB using the Transaction_Pooler connection string with `prepare: false` so that Vercel serverless function DB connections do not exhaust the connection pool.
3. THE System SHALL redirect all HTTP requests to HTTPS so that sessions and credentials are always encrypted in transit.
4. THE System SHALL include a `.gitignore` entry for `.env` and any file matching `.env.local`, `.env.*.local` so that real credentials are never committed to the repository. `.env.example` is explicitly excluded from this restriction.

---

### Requirement 21: Authentication Provider Independence and Migration Safety

**User Story:** As a blog owner, I want the authentication system to be provider-independent so that I can replace Supabase Auth with another provider without redesigning my user, role, permission, or media systems.

#### Acceptance Criteria

1. THE System SHALL isolate all Auth_Provider-specific code within `src/lib/auth/providers/` or equivalent directory structure, where each provider implements a common authentication interface with methods: `signIn(credentials)`, `signOut()`, `getSession()`, `resetPassword(email)`, `updatePassword(token, newPassword)`.
2. THE DB schema SHALL NOT contain any direct foreign key references to `auth.users` or any other Auth_Provider-specific table; all provider-to-user mappings SHALL be mediated exclusively through the `auth_identities` table.
3. WHEN migrating from one Auth_Provider to another, THE System SHALL allow existing Users, Roles, Permissions, Posts, and Media to remain unchanged; only `auth_identities` records need updating to map to the new provider's user IDs.
4. THE System SHALL provide a migration utility or documented procedure for safely migrating existing `users` records that currently reference `auth.users.id` to the new schema where `users.id` is application-assigned and `auth_identities` mediates the provider mapping.
5. THE migration process SHALL preserve all existing user roles and permissions by migrating data from a legacy `users.role` column (if present) to the `user_roles` and `roles` tables, ensuring no user loses their assigned permissions after migration.
6. THE migration process SHALL preserve all media ownership by updating `media.uploader_id` foreign key relationships to reference the application's `users.id` instead of provider-specific IDs.
7. THE System SHALL support multiple simultaneous Auth_Providers (e.g., Supabase Auth for existing users, OAuth for new users) by allowing multiple `auth_identities` records per User with different `provider_type` values, though this is a future extensibility guarantee and not required for initial implementation.
8. IF an existing Supabase Auth user attempts to authenticate after the migration to the new schema, THE System SHALL resolve their `auth.users.id` through `auth_identities` to their application User, or create a new User and `auth_identities` mapping if the migration did not pre-populate their record.

---

### Requirement 23: Data Migration from Legacy to Provider-Independent Schema

**User Story:** As a developer, I want a safe, automated migration from the legacy auth.users-dependent schema to the new provider-independent schema so that existing users, posts, media, and roles are preserved without data loss or downtime.

#### Acceptance Criteria

1. THE System SHALL provide a migration script or SQL migration file that converts the Legacy_Schema to the new schema by: creating the `auth_identities`, `roles`, `permissions`, `user_roles`, and `role_permissions` tables; migrating existing `users.role` column values to the new role system; changing `users.id` from a foreign key to `auth.users.id` to an application-assigned UUID primary key; and updating all foreign key references to `users.id` in `posts` and `media` tables.
2. THE migration script SHALL create three standard roles (`admin`, `editor`, `viewer`) and twelve core permissions (`users:view`, `users:create`, `users:update`, `users:delete`, `roles:view`, `roles:create`, `roles:update`, `roles:delete`, `roles:assign`, `posts:create`, `posts:update`, `profile:update`) as initial seed data.
3. THE migration script SHALL assign permissions to roles as follows: `admin` role receives all twelve permissions, `editor` role receives `posts:create`, `posts:update`, and `profile:update`, `viewer` role receives only `profile:update`.
4. THE migration script SHALL migrate each existing user by: generating a new application-assigned UUID for `users.id` if not already independent, creating an `auth_identities` record linking the old `auth.users.id` to the new `users.id`, assigning the user to the appropriate role based on their legacy `role` column value (ADMIN → `admin` role, EDITOR → `editor` role, USER → `viewer` role), and updating all foreign key references in `posts.author_id` and `media.uploader_id` to the new `users.id`.
5. THE migration script SHALL execute all schema changes and data migrations within a single database transaction so that either all changes succeed or all are rolled back on failure, ensuring no partial migration state.
6. IF the migration script encounters a constraint violation or data inconsistency (e.g., a `posts.author_id` pointing to a non-existent user), THEN the script SHALL roll back the entire transaction, log the specific error with row identifiers, and exit with a non-zero status code without applying any changes.
7. THE migration script SHALL preserve all existing `posts.author_id` relationships by mapping each author_id from the old `users.id` (which was `auth.users.id`) to the new application-assigned `users.id` via the `auth_identities` table.
8. THE migration script SHALL preserve all existing `media.uploader_id` relationships using the same mapping as criterion 7.
9. AFTER the migration completes successfully, THE System SHALL validate that: every user has at least one role assigned via `user_roles`, every role has at least one permission assigned via `role_permissions`, no orphaned `posts` or `media` records exist (all foreign keys resolve to valid `users.id`), and all `auth_identities` records have valid `user_id` foreign keys.
10. THE migration script SHALL drop the legacy `role` column from the `users` table only after all role data has been successfully migrated to the `user_roles` table and validation checks pass.
11. THE migration script SHALL include a rollback procedure documented in comments or a separate down-migration file that can reverse the schema changes and restore the Legacy_Schema, though this rollback will not restore the legacy `role` column values if data has been modified post-migration.
12. THE System SHALL NOT allow the migration to run more than once; if the new tables (`auth_identities`, `roles`, `permissions`, `user_roles`, `role_permissions`) already exist, the migration script SHALL detect this and exit with a message indicating the migration has already been applied.

---

### Requirement 24: Post-Migration Authentication and Authorization Behavior

**User Story:** As a user, I want my authentication and authorization to work seamlessly after the migration so that I can continue using the platform without re-registering or losing access.

#### Acceptance Criteria

1. WHEN an existing user authenticates via Supabase Auth after the migration, THE System SHALL resolve their `auth.users.id` to an application `User` by querying the `auth_identities` table for a record where `provider_type = 'supabase'` and `provider_user_id = auth.uid()`, and use the resolved `user_id` for all subsequent authorization checks.
2. IF a user authenticates and no corresponding `auth_identities` record exists (e.g., a new Supabase Auth user created post-migration), THEN THE System SHALL create a new application `User` record with `display_name = 'Anonymous'`, create an `auth_identities` record linking the provider to the new User, assign the `viewer` role by default, and establish a Session.
3. THE AuthZ_Layer SHALL replace all legacy role checks (e.g., `WHERE u.role IN ('ADMIN', 'EDITOR')`) with permission-based checks querying the `user_roles` and `role_permissions` tables, so that authorization decisions are based exclusively on the user's assigned permissions, not role names.
4. WHEN a user who previously had the legacy `ADMIN` role requests an admin-protected route, THE System SHALL grant access if and only if the user has the required permission (e.g., `users:view` for listing users), not based on the role name being `admin`.
5. WHEN a user who previously had the legacy `EDITOR` role attempts to create a post, THE System SHALL grant access if and only if the user has the `posts:create` permission.
6. WHEN a user who previously had the legacy `USER` role attempts to access any `/admin/**` route requiring elevated permissions, THE System SHALL deny access with an HTTP 403 response, as the `viewer` role has only the `profile:update` permission.
7. IF a user's role assignment changes post-migration (e.g., an admin assigns them a new role), THEN THE AuthZ_Layer SHALL reflect the updated permissions on the next request without requiring the user to re-authenticate.
8. THE System SHALL continue to use HTTP-only, Secure, SameSite=Lax cookies for session management post-migration, with no change to cookie attributes or session duration.
9. THE System SHALL NOT expose the `auth_identities` table or its contents to any client-side code or unauthenticated API endpoint.

---

## Correctness Properties

The following properties are suitable for property-based testing. They capture invariants and round-trip behaviors that must hold for all valid inputs, not just specific examples.

### CP-1: Slug Generation — Idempotence

**Pattern**: Idempotence  
**Scope**: `generateSlug` utility function

For any string `title`, applying `generateSlug` twice SHALL produce the same result as applying it once:

```
generateSlug(generateSlug(title)) === generateSlug(title)
```

### CP-2: Slug Generation — Character Invariant

**Pattern**: Invariant  
**Scope**: `generateSlug` utility function

For any non-empty string `title`, `generateSlug(title)` SHALL produce a string that:

- Contains only characters matching `[a-z0-9-]`
- Does not begin or end with a hyphen
- Does not contain consecutive hyphens

### CP-3: Markdown Sanitization — Safety Invariant

**Pattern**: Invariant  
**Scope**: `Sanitizer` module

For any arbitrary string `input` (including strings containing `<script>`, `onerror=`, `javascript:`, or `data:` URIs), the rendered output of `Sanitizer.sanitize(renderMarkdown(input))` SHALL NOT contain any `<script>` element, inline event handler attribute (e.g., `onload`, `onclick`), or `javascript:` protocol in any `href` or `src` attribute.

### CP-4: Zod Validator — Invalid Input Rejection

**Pattern**: Error Conditions  
**Scope**: `Validator` schemas (Post, Category, Tag, Media)

For any input object where at least one field violates a schema constraint (e.g., title is empty, title exceeds 255 characters, slug contains invalid characters, file size is negative), `Validator.validate(input)` SHALL return a failure result containing at least one field-level error.

### CP-5: Zod Validator — Valid Input Round-Trip

**Pattern**: Round-Trip  
**Scope**: `Validator` schemas

For any input object that satisfies all schema constraints, parsing the object with the Zod schema SHALL produce an output object that, when serialized to JSON and re-parsed by the same schema, produces an equivalent object:

```
schema.parse(JSON.parse(JSON.stringify(schema.parse(input)))) ≡ schema.parse(input)
```

### CP-6: Permission-Based Authorization — Invariant

**Pattern**: Invariant  
**Scope**: `AuthZ_Layer` permission-checking functions

For any user with no roles assigned (or only the `viewer` role), `hasPermission(user, 'users:create')` SHALL return `false` and `hasPermission(user, 'roles:assign')` SHALL return `false`. For any user with only the `editor` role, `hasPermission(user, 'users:create')` and `hasPermission(user, 'roles:assign')` SHALL both return `false`, while `hasPermission(user, 'posts:create')` SHALL return `true`. This invariant SHALL hold regardless of the number of roles or permissions defined in the system.

### CP-7: Post Status Transitions — Invariant

**Pattern**: Invariant  
**Scope**: Post status transition functions

For any Post record, after a publish transition: `post.status === 'PUBLISHED'` and `post.published_at !== null`. After an unpublish transition: `post.status === 'DRAFT'` and the original `published_at` value is preserved (not cleared). After an archive transition: `post.status === 'ARCHIVED'`.

### CP-8: Pagination — Invariant

**Pattern**: Invariant / Metamorphic  
**Scope**: Post listing query

For any total count `N` of Published Posts and page size `P`, the sum of record counts across all pages SHALL equal `N`. For any single page, the number of records returned SHALL be at most `P`. The union of all records across all pages SHALL contain no duplicate Post ids.

### CP-9: Parameterized Query — No Interpolation

**Pattern**: Invariant  
**Scope**: `Query_Layer`

For any user-supplied string `input` containing SQL metacharacters (e.g., `'`, `"`, `;`, `--`, `/*`), executing a DB query via the Query_Layer with `input` as a parameter SHALL produce a result equivalent to executing the same query with the literal string as data, and SHALL NOT alter query structure, return additional rows, or raise a DB syntax error attributable to the input content.

### CP-10: Media Upload Validation — Boundary Invariant

**Pattern**: Error Conditions / Boundary  
**Scope**: `Validator` media upload schema

For any file with `size_bytes > 10485760` (10 MB) or with a `mime_type` not in the allowed set, `Validator.validateMediaUpload(file)` SHALL return a failure result. For any file with `size_bytes` in the range `[1, 10485760]` and a MIME type in the allowed set, the validator SHALL return a success result.

### CP-11: Migration Data Preservation — Invariant

**Pattern**: Invariant  
**Scope**: Migration script

For the set of all user IDs `U_old` in the legacy `users` table before migration and the set of all user IDs `U_new` in the `users` table after migration, the cardinality SHALL be equal: `|U_old| = |U_new|`. For every `posts` record with `author_id = u_old` before migration, there SHALL exist a corresponding `posts` record with `author_id = u_new` after migration where `u_new` is mapped from `u_old` via `auth_identities`. The same invariant SHALL hold for `media.uploader_id`.

### CP-12: Role-Permission Resolution — Consistency

**Pattern**: Invariant / Model-Based  
**Scope**: `AuthZ_Layer` permission resolution

For any user `u` with assigned roles `R = {r1, r2, ..., rn}`, the set of permissions `P` returned by `getUserPermissions(u)` SHALL equal the union of all permissions assigned to roles in `R`:

```
P = ⋃(permissions assigned to r) for all r ∈ R
```

No permission SHALL appear in `P` unless it is assigned to at least one role in `R`. Every permission assigned to any role in `R` SHALL appear in `P`.


---

### Requirement 22: Future Extensibility

**User Story:** As a blog owner, I want the core architecture to accommodate future features without requiring foundational rewrites so that the platform can grow over time.

#### Acceptance Criteria

1. THE System SHALL isolate all DB query logic within `src/lib/db/queries/` so that new features can add query files to that directory without modifying existing query files.
2. THE System SHALL isolate business logic within `src/lib/services/` or equivalent service-layer files, separate from Next.js route handlers and UI components, so that logic can be reused across routes and future API consumers.
3. THE DB schema SHALL use UUID primary keys on all tables so that records can be merged without primary key conflicts.
4. THE System SHALL use a flexible role and permission system (via `roles`, `permissions`, `user_roles`, `role_permissions` tables) so that adding new roles or permissions requires only database inserts without altering application authorization code.
