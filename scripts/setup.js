#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Idempotent DB Setup Script
 *
 * Runs migrate + seed exactly once on first project start.
 * If the database already has the expected schema (checked via the
 * `posts` table existing), both steps are silently skipped —
 * safe to run on every `npm run dev`.
 */

const { readFileSync, readdirSync, existsSync } = require('fs');
const { join, resolve } = require('path');
const postgres = require('postgres');

// ── Load .env ────────────────────────────────────────────────────────────────

const projectRoot = resolve(__dirname, '..');

function loadEnvFile(filename) {
  const envPath = join(projectRoot, filename);
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^[\"']|[\"']$/g, '');
      if (!process.env[key]) process.env[key] = value;
    }
  });
}

loadEnvFile('.env');
loadEnvFile('.env.local');

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeClient(useDirectUrl) {
  const url = useDirectUrl
    ? process.env.DATABASE_DIRECT_URL || process.env.DATABASE_URL
    : process.env.DATABASE_URL;

  if (!url) {
    console.error('❌ DATABASE_URL is not set in your .env file.');
    process.exit(1);
  }

  return postgres(url, {
    ssl: 'require',
    max: 1,
    connect_timeout: 15,
    prepare: false,
  });
}

// ── Check: is the DB already initialised? ────────────────────────────────────

async function isAlreadyInitialised(sql) {
  try {
    const result = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE  table_schema = 'public'
        AND    table_name   = 'posts'
      ) AS exists
    `;
    return result[0]?.exists === true;
  } catch {
    return false;
  }
}

// ── Migrate ──────────────────────────────────────────────────────────────────

async function runMigrations(sql) {
  const migrationsDir = join(projectRoot, 'supabase/migrations');
  if (!existsSync(migrationsDir)) {
    console.warn('⚠️  No migrations directory found, skipping.');
    return;
  }

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('ℹ️  No migration files found.');
    return;
  }

  console.log(`📁 Running ${files.length} migration file(s)...`);

  for (const file of files) {
    process.stdout.write(`   ⏳ ${file} ... `);
    const migrationSQL = readFileSync(join(migrationsDir, file), 'utf8');
    try {
      await sql.unsafe(migrationSQL);
      console.log('✅');
    } catch (err) {
      console.log(`⚠️  skipped (${err.message})`);
    }
  }
  console.log('✨ Migrations done.\n');
}

// ── Seed ─────────────────────────────────────────────────────────────────────

async function runSeed(sql) {
  try {
    const [row] = await sql`SELECT COUNT(*) AS count FROM public.users`;
    if (parseInt(row.count, 10) > 0) {
      console.log('ℹ️  Seed skipped — database already has data.\n');
      return;
    }
  } catch {
    // Table might not exist yet if migrations just ran; continue to seed.
  }

  const seedPath = join(projectRoot, 'supabase/seed.sql');
  if (!existsSync(seedPath)) {
    console.warn('⚠️  No seed.sql found, skipping seed.');
    return;
  }

  console.log('🌱 Seeding database...');
  const seedSQL = readFileSync(seedPath, 'utf8');
  await sql.unsafe(seedSQL);
  console.log('✅ Seed complete.\n');
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const poolerSql = makeClient(false);

  let alreadyInit = false;
  try {
    alreadyInit = await isAlreadyInitialised(poolerSql);
  } finally {
    await poolerSql.end();
  }

  if (alreadyInit) {
    console.log('✅ Database already initialised — skipping migrate & seed.\n');
    return;
  }

  console.log('🚀 First run detected — running migrate & seed...\n');

  // Use direct URL for DDL (migrations) — Supavisor transaction-mode can
  // block DDL; the direct connection avoids that limitation.
  const directSql = makeClient(true);

  try {
    await runMigrations(directSql);
    await runSeed(directSql);
    console.log('🎉 Setup complete!');
  } catch (err) {
    console.error('❌ Setup failed:', err.message);
    process.exit(1);
  } finally {
    await directSql.end();
  }
}

main();
