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
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/**',
      },
      // Allow example.com for seed data images
      {
        protocol: 'https',
        hostname: 'example.com',
      },
    ],
  },

  // Server Actions configuration
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
