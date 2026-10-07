// src/app/sitemap.ts
// Dynamic sitemap generation (Req 3.4)

import { MetadataRoute } from 'next';
import { getAllPostSlugs } from '@/lib/db/queries/posts';

// Revalidate every hour (Req 3.4)
export const revalidate = 3600;

/**
 * Generates a sitemap listing all published post URLs (Req 3.4).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:8000';

  // Fetch all published post slugs
  const postSlugs = await getAllPostSlugs();

  // Generate sitemap entries for all published posts
  const postEntries: MetadataRoute.Sitemap = postSlugs.map((slug) => ({
    url: `${siteUrl}/posts/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${siteUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${siteUrl}/search`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
  ];

  return [...staticPages, ...postEntries];
}
