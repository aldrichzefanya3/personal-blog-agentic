// src/lib/seo/metadata.ts
// Metadata generation helpers for SEO (Req 3.1, 3.2, 3.3, 3.6)

import { Metadata } from 'next';
import { getPostBySlug } from '@/lib/db/queries/posts';

const SITE_NAME = 'Personal Blog';
const SITE_DESCRIPTION = 'A personal blog platform showcasing thoughts and ideas';
const DEFAULT_OG_IMAGE = '/og-default.png'; // Fallback image

/**
 * Truncates a string to a maximum length, adding ellipsis if truncated.
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Extracts plain text from markdown content (simple implementation).
 */
function extractPlainText(markdown: string): string {
  // Remove markdown syntax for a plain text preview
  return markdown
    .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
    .replace(/[#*_`~]/g, '') // Remove markdown formatting
    .replace(/\n\s*\n/g, ' ') // Collapse multiple newlines
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim();
}

/**
 * Generates Next.js Metadata object for a post detail page.
 * Sets title ≤60 chars, description ≤160 chars with fallback to content preview (Req 3.1).
 * Includes Open Graph tags (Req 3.2) and Twitter card metadata (Req 3.3).
 * Sets canonical URL (Req 3.6).
 */
export async function generatePostMetadata(
  slug: string,
): Promise<Metadata | null> {
  const post = await getPostBySlug(slug);

  if (!post || post.status !== 'PUBLISHED') {
    return null;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:8000';
  const canonicalUrl = `${siteUrl}/posts/${post.slug}`;

  // Title: truncate to 60 characters (Req 3.1)
  const title = truncate(post.title, 60);

  // Description: use excerpt if available, otherwise first 160 chars of content (Req 3.1)
  let description: string;
  if (post.ai_meta_description) {
    description = truncate(post.ai_meta_description, 160);
  } else if (post.excerpt) {
    description = truncate(post.excerpt, 160);
  } else if (post.content) {
    const plainText = extractPlainText(post.content);
    description = truncate(plainText, 160);
  } else {
    description = truncate(title, 160);
  }

  // Open Graph image: use cover image or fallback to default (Req 3.2)
  const ogImage = post.cover_image_url || `${siteUrl}${DEFAULT_OG_IMAGE}`;

  // Author name for metadata
  const authorName = post.author?.display_name || 'Former contributor';

  return {
    title,
    description,
    authors: [{ name: authorName }],
    alternates: {
      canonical: canonicalUrl, // Req 3.6
    },
    openGraph: {
      // Req 3.2
      title: truncate(post.title, 60),
      description,
      url: canonicalUrl,
      type: 'article',
      images: [
        {
          url: ogImage,
          alt: post.title,
        },
      ],
      publishedTime: post.published_at || undefined,
      authors: [authorName],
    },
    twitter: {
      // Req 3.3
      card: 'summary_large_image',
      title: truncate(post.title, 60),
      description,
      images: [ogImage],
    },
  };
}

/**
 * Generates metadata for the home page / post listing.
 */
export function generateHomeMetadata(page: number = 1): Metadata {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:8000';
  const title = page === 1 ? SITE_NAME : `${SITE_NAME} - Page ${page}`;
  const canonicalUrl = page === 1 ? siteUrl : `${siteUrl}?page=${page}`;

  return {
    title,
    description: SITE_DESCRIPTION,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description: SITE_DESCRIPTION,
      url: canonicalUrl,
      type: 'website',
      images: [
        {
          url: `${siteUrl}${DEFAULT_OG_IMAGE}`,
          alt: SITE_NAME,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: SITE_DESCRIPTION,
      images: [`${siteUrl}${DEFAULT_OG_IMAGE}`],
    },
  };
}

/**
 * Generates metadata for category pages.
 */
export function generateCategoryMetadata(
  categoryName: string,
  categorySlug: string,
  page: number = 1,
): Metadata {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:8000';
  const title =
    page === 1
      ? `${categoryName} - ${SITE_NAME}`
      : `${categoryName} - Page ${page} - ${SITE_NAME}`;
  const description = `Browse posts in the ${categoryName} category`;
  const canonicalUrl =
    page === 1
      ? `${siteUrl}/categories/${categorySlug}`
      : `${siteUrl}/categories/${categorySlug}?page=${page}`;

  return {
    title: truncate(title, 60),
    description: truncate(description, 160),
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: truncate(title, 60),
      description: truncate(description, 160),
      url: canonicalUrl,
      type: 'website',
      images: [
        {
          url: `${siteUrl}${DEFAULT_OG_IMAGE}`,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: truncate(title, 60),
      description: truncate(description, 160),
      images: [`${siteUrl}${DEFAULT_OG_IMAGE}`],
    },
  };
}

/**
 * Generates metadata for tag pages.
 */
export function generateTagMetadata(
  tagName: string,
  tagSlug: string,
  page: number = 1,
): Metadata {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:8000';
  const title =
    page === 1
      ? `${tagName} - ${SITE_NAME}`
      : `${tagName} - Page ${page} - ${SITE_NAME}`;
  const description = `Browse posts tagged with ${tagName}`;
  const canonicalUrl =
    page === 1
      ? `${siteUrl}/tags/${tagSlug}`
      : `${siteUrl}/tags/${tagSlug}?page=${page}`;

  return {
    title: truncate(title, 60),
    description: truncate(description, 160),
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: truncate(title, 60),
      description: truncate(description, 160),
      url: canonicalUrl,
      type: 'website',
      images: [
        {
          url: `${siteUrl}${DEFAULT_OG_IMAGE}`,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: truncate(title, 60),
      description: truncate(description, 160),
      images: [`${siteUrl}${DEFAULT_OG_IMAGE}`],
    },
  };
}
