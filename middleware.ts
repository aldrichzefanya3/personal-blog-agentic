import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  // Authentication Guard for /admin/**
  // Uses getSession() (local JWT read, ~0ms) instead of getUser() (network
  // round-trip to Supabase Auth) for low-latency middleware checks.
  // Defense-in-depth: the admin layout independently calls getUser() server-side.
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const supabase = createServerClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value);
              response.cookies.set(name, value, options);
            });
          },
        },
      },
    );

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      const redirectUrl = new URL('/auth/login', request.url);
      redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Security Headers
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  response.headers.set('x-nonce', nonce);
  response.headers.set('Content-Security-Policy', buildCSP());
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  return response;
}

function buildCSP(): string {
  const directives = [
    `default-src 'self'`,
    // 'unsafe-inline' needed for the theme-toggle inline script in the root layout.
    // 'strict-dynamic' allows trusted scripts to load further scripts.
    `script-src 'self' 'unsafe-inline' 'strict-dynamic'`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: https:`,
    `font-src 'self' data:`,
    `connect-src 'self' https://*.supabase.co`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `upgrade-insecure-requests`,
  ];
  return directives.join('; ');
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder / api routes if needed
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};