// src/lib/seo/jsonld.ts
// JSON-LD structured data builders (Req 3.8)

import type { PostWithRelations } from '@/types/database';

/**
 * Builds JSON-LD structured data for a BlogPosting.
 * Includes headline, author, datePublished, description, and url (Req 3.8).
 */
export function buildBlogPostingJsonLd(
  post: PostWithRelations,
  url: string,
): object {
  const authorName = post.author.display_name || 'Anonymous';
  const description = post.excerpt || post.title;

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    author: {
      '@type': 'Person',
      name: authorName,
    },
    datePublished: post.published_at || post.created_at,
    dateModified: post.updated_at,
    description,
    url,
    image: post.cover_image_url || undefined,
    publisher: {
      '@type': 'Organization',
      name: 'Personal Blog',
      logo: {
        '@type': 'ImageObject',
        url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:8000'}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
  };
}

/**
 * Serializes JSON-LD object to a script tag-safe string.
 */
export function serializeJsonLd(data: object): string {
  return JSON.stringify(data);
}
