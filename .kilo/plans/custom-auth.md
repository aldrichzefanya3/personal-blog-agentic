# Custom Role-Based Auth — Implementation Plan

Status: approved by user (all 4 decisions confirmed). Ready for implementation.

## Decisions confirmed
1. Preserve existing accounts: hash their current Supabase bcrypt password into `password_hash`, carry over email/role.
2. Remove Supabase Auth entirely; keep Supabase only as a Postgres client via the service role key.
3. Use argon2id for password hashing.
4. DB-backed sessions (simple, secure).

## Scope
Replace Supabase Auth with a custom auth system: `users` (email/password_hash/role/is_active),
`sessions` (token_hash), `api_keys` (ai_writer), deny-all RLS, app-code authorization via the existing
`requireRole()`/`requireOwnership()` helpers, `/setup` fragment-secret flow, and "Former Contributor"
rendering for deleted authors.

## Files to change
- supabase/migrations/20261009000000_custom_auth.sql (new, up + down)
- src/lib/auth/session.ts, src/lib/auth/supabase-server.ts, src/lib/auth/admin-check.ts
- src/lib/auth/password.ts, src/lib/auth/sessions.ts, src/lib/auth/rate-limit.ts, src/lib/auth/api-keys.ts, src/lib/auth/author.ts (new)
- src/actions/auth.ts, src/actions/users.ts, src/actions/categories.ts, src/actions/tags.ts, src/actions/media.ts
- middleware.ts, src/lib/csrf.ts
- src/app/auth/** (login, setup, account-settings, reset-password)
- src/app/(admin)/admin/settings/** (user management, ai_writer keys)
- src/components/** (PostCard, PostList, post detail) — Former Contributor
- src/types/database.ts, src/lib/db/queries/users.ts
- .env.example, README.md
- src/test/** (permission matrix, setup flow, race, deleted author, ai_writer restrictions)

## Verification
- npm run type-check, npm run lint, npm test, npm run build