#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Database Migration Script
 * Runs all SQL migrations in order without requiring Supabase CLI login
 */

const { readFileSync, readdirSync, existsSync } = require('fs');
const { join, resolve } = require('path');
const postgres = require('postgres');

// Load .env file from project root
const projectRoot = resolve(__dirname, '..');
const envPath = join(projectRoot, '.env');

if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, ''); // Remove quotes
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found in environment variables');
    process.exit(1);
  }

  console.log('🔗 Connecting to database...');
  const sql = postgres(databaseUrl, {
    ssl: 'require',
    max: 1,
  });

  try {
    // Read all migration files
    const migrationsDir = join(__dirname, '../supabase/migrations');
    const files = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort(); // Sort to ensure order

    console.log(`📁 Found ${files.length} migration files\n`);

    for (const file of files) {
      console.log(`⏳ Running: ${file}`);
      const filePath = join(migrationsDir, file);
      const migrationSQL = readFileSync(filePath, 'utf8');
      
      try {
        await sql.unsafe(migrationSQL);
        console.log(`✅ Completed: ${file}\n`);
      } catch (error) {
        console.error(`❌ Failed: ${file}`);
        console.error(`   Error: ${error.message}\n`);
        // Continue with other migrations even if one fails (idempotent)
      }
    }

    console.log('✨ Migration complete!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigrations();
