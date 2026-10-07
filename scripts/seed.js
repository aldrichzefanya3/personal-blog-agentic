#!/usr/bin/env node

/**
 * Database Seeder Script
 * Populates the database with dummy data for development
 */

const { readFileSync, existsSync } = require('fs');
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
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

async function seedDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found in environment variables');
    process.exit(1);
  }

  console.log('🌱 Starting database seeding...');
  const sql = postgres(databaseUrl, {
    ssl: 'require',
    max: 1,
  });

  try {
    // Check if data already exists
    const existingUsers = await sql`SELECT COUNT(*) as count FROM public.users`;
    const userCount = parseInt(existingUsers[0].count);

    if (userCount > 0) {
      console.log(`ℹ️  Database already has ${userCount} users. Skipping seed to avoid duplicates.`);
      console.log('   To re-seed, reset the database first.');
      return;
    }

    // Read seed file
    const seedPath = join(projectRoot, 'supabase/seed.sql');
    if (!existsSync(seedPath)) {
      console.error('❌ Seed file not found at:', seedPath);
      process.exit(1);
    }

    console.log('📁 Reading seed data...');
    const seedSQL = readFileSync(seedPath, 'utf8');
    
    console.log('⏳ Inserting seed data...');
    await sql.unsafe(seedSQL);
    
    // Verify what was seeded
    const users = await sql`SELECT COUNT(*) as count FROM public.users`;
    const posts = await sql`SELECT COUNT(*) as count FROM public.posts`;
    const categories = await sql`SELECT COUNT(*) as count FROM public.categories`;
    const tags = await sql`SELECT COUNT(*) as count FROM public.tags`;
    
    console.log('\n✅ Seed complete!\n');
    console.log('📊 Seeded data:');
    console.log(`   • ${users[0].count} users (admin and editor)`);
    console.log(`   • ${posts[0].count} posts (2 published, 1 draft)`);
    console.log(`   • ${categories[0].count} categories`);
    console.log(`   • ${tags[0].count} tags`);
    console.log('\n🔐 Test accounts:');
    console.log('   • admin@example.com (ADMIN role)');
    console.log('   • editor@example.com (EDITOR role)');
    console.log('\n⚠️  Note: These accounts use placeholder passwords and cannot be used for login.');
    console.log('   Sign up through your app to create real accounts.');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

seedDatabase();
