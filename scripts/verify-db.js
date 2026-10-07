#!/usr/bin/env node

const { readFileSync, existsSync } = require('fs');
const { join, resolve } = require('path');
const postgres = require('postgres');

// Load .env
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
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

async function verifyDatabase() {
  const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1 });
  
  try {
    console.log('🔍 Checking database tables...\n');
    
    const tables = await sql`
      SELECT tablename 
      FROM pg_catalog.pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `;
    
    console.log('📊 Database Tables:');
    tables.forEach(t => console.log('  ✓', t.tablename));
    
    console.log('\n✨ Database is ready!');
  } catch (error) {
    console.error('❌ Database verification failed:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

verifyDatabase();
