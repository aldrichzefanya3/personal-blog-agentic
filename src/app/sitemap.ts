// src/app/sitemap.ts
// Dynamic sitemap generation (Req 3.4)

import { MetadataRoute } from 'next';
import { getAllPostSlugs } from '@/lib/db/queries/posts';

// Revalidate every hour (Req 3.4)
export const revalidate = 3600;

/**
 * Generates a sitemap listing all published post URLs (Req 3.4).
 *
 * The DB is not reachable during `next build`, so getAllPostSlugs is wrapped
 * in a try/catch. At build time the sitemap contains only static pages;
 * at runtime (after revalidation) it includes all published post slugs.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:8000';

  // Static pages — always included
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

  // Fetch all published post slugs — gracefully degrade if DB is unavailable
  // (e.g. during `next build`). Full sitemap is populated after first revalidation.
  let postEntries: MetadataRoute.Sitemap = [];
  try {
    const postSlugs = await getAllPostSlugs();
    postEntries = postSlugs.map((slug) => ({
      url: `${siteUrl}/posts/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));
  } catch {
    // DB unavailable at build time — sitemap will be repopulated on first revalidation
  }

  return [...staticPages, ...postEntries];
}
