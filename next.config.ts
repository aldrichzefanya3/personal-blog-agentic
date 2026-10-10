import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // HTTP to HTTPS redirect in production (Req 20.3)
  async redirects() {
    if (process.env.NODE_ENV === 'production') {
      return [
        {
          source: '/:path*',
          has: [
            {
              type: 'header',
              key: 'x-forwarded-proto',
              value: 'http',
            },
          ],
          destination: 'https://:path*',
          permanent: true,
        },
      ];
    }
    return [];
  },

  // Image optimization configuration (Req 5.4)
  // `**` wildcard allows any HTTPS hostname — no per-domain allowlist needed.
  // Next.js still validates that the URL is a valid image by content-type
  // during optimization, so arbitrary non-image URLs won't be served as images.
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // Server Actions configuration + SPA-like client cache
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    // Client-side router cache: keep dynamic RSC payloads for 30s so navigating
    // between admin pages doesn't re-fetch from the server (SPA-like feel).
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
  },
};

export default nextConfig;
