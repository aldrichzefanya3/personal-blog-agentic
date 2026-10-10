/**
 * Database client — postgres.js + Drizzle ORM
 *
 * Connection strategy (lowest latency for serverless / Next.js):
 *
 *   DATABASE_URL          → Supabase Transaction Pooler (Supavisor), port 6543
 *                           e.g. postgres://postgres.[ref]:[pw]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
 *                           This is the PRIMARY connection used at runtime.
 *
 *   DATABASE_DIRECT_URL   → Supabase direct connection, port 5432
 *                           Only needed for drizzle-kit migrations (schema pushes).
 *                           Never used at runtime by the app.
 *
 * Why Transaction Pooler?
 *  - Serverless functions (Vercel, etc.) spin up a new process per request.
 *    Opening a raw TCP connection to Postgres on every cold-start adds ~100–500 ms.
 *  - Supavisor's Transaction Pooler pre-warms a pool of server-side connections and
 *    hands them out instantly, reducing per-request overhead to ~1–5 ms.
 *  - `prepare: false` is required because PgBouncer/Supavisor does not support
 *    PostgreSQL extended-query (prepared-statement) protocol in transaction mode.
 *
 * Exports:
 *  - `sql`  — raw postgres.js tagged-template client (backward compat with queries/)
 *  - `db`   — Drizzle ORM instance for type-safe query builder usage
 */

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

// ── Validate environment ───────────────────────────────────────────────────────

if (!process.env.DATABASE_URL) {
  throw new Error(
    'Missing required environment variable: DATABASE_URL\n' +
      'Set this to the Supabase Transaction Pooler URL:\n' +
      '  postgres://postgres.[ref]:[pw]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true',
  );
}

// ── Singleton pattern for dev hot-reload ──────────────────────────────────────

interface GlobalWithDb {
  _pgClient: postgres.Sql | undefined;
}

const g = globalThis as unknown as GlobalWithDb;

// ── Connection options ─────────────────────────────────────────────────────────

const connectionOptions: postgres.Options<Record<string, postgres.PostgresType>> = {
  // REQUIRED for Supabase Transaction Pooler (Supavisor) — it does not support
  // the PostgreSQL extended-query / prepared-statement wire protocol.
  prepare: false,

  // Keep the pool small: serverless functions are short-lived and each worker
  // only needs 1–2 concurrent DB connections.
  max: 1,

  // Aggressively close idle connections — serverless functions are recycled
  // frequently and we don't want to hold open connections unnecessarily.
  idle_timeout: 20,

  // Abort connection attempts that take longer than this (seconds).
  connect_timeout: 10,

  // Always require TLS when connecting to Supabase (the pooler enforces it).
  ssl: 'require',
};

export const sql: postgres.Sql =
  g._pgClient ??
  postgres(process.env.DATABASE_URL, connectionOptions);

// Cache the client on globalThis in development so Next.js hot-reloads do not
// exhaust the connection pool by creating a new client on every module reload.
if (process.env.NODE_ENV !== 'production') {
  g._pgClient = sql;
}

// ── Drizzle ORM instance ───────────────────────────────────────────────────────

/**
 * Type-safe Drizzle ORM client.
 *
 * Use `db` for new query builder code; use `sql` for existing raw-SQL queries.
 *
 * Example:
 *   import { db } from '@/lib/db/client';
 *   import { posts } from '@/lib/db/schema';
 *   const allPosts = await db.select().from(posts);
 */
export const db = drizzle(sql, { schema });
