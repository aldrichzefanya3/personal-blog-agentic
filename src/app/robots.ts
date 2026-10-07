// src/app/robots.ts
// Robots.txt generation (Req 3.5)

import { MetadataRoute } from 'next';

/**
 * Generates robots.txt rules:
 * - Disallows /admin/** routes (Req 3.5)
 * - Allows all other public routes (Req 3.5)
 * - Includes sitemap URL (Req 3.5)
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:8000';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/admin/',
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
