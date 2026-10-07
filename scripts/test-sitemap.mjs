import { sql } from '../src/lib/db/client.ts';

async function testSitemap() {
  try {
    const rows = await sql`SELECT slug FROM public.posts WHERE status = 'PUBLISHED'`;
    console.log('Found', rows.length, 'published posts');
    console.log('Slugs:', rows.map(r => r.slug));
    await sql.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testSitemap();