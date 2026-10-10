/**
 * Admin route group layout.
 *
 * This layout wraps all routes under `/admin/**` and performs server-side
 * authentication and authorization checks before rendering admin content.
 *
 * Defense-in-depth: While middleware already redirects unauthenticated requests,
 * this layout adds an additional server-side check and only allows the two
 * supported roles to access admin content.
 *
 * CSRF Token Initialization: The CsrfTokenInitializer client component runs on
 * mount to generate the CSRF token via a Server Action. This is necessary because
 * Server Components cannot modify cookies during render in Next.js 15+.
 *
 * SPA-like Navigation: The NavigationProgress bar provides instant visual
 * feedback on link clicks. The client-side router cache (staleTimes in
 * next.config.ts) keeps RSC payloads for 30 s so revisiting a page doesn't
 * hit the server again. loading.tsx files in each sub-route provide skeleton
 * UIs so the layout shell is always shown immediately.
 *
 * Requirements: 8.9, 9.4, 10.3, 15.6
 *
 * Req 8.9  — Session verified server-side before rendering admin content
 * Req 9.4  — Only ADMIN and EDITOR roles may access /admin/** routes
 * Req 10.3 — Dashboard available to ADMIN and EDITOR roles
 * Req 15.6 — CSRF token generated and stored in non-HttpOnly cookie
 */

import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth/session';
import { Sidebar } from '@/components/admin/Sidebar';
import { CsrfTokenInitializer } from '@/components/admin/CsrfTokenInitializer';
import { NavigationProgress } from '@/components/admin/NavigationProgress';

interface AdminLayoutProps {
  children: React.ReactNode;
}

/**
 * Admin layout component.
 *
 * Verifies the session and role server-side on every render:
 *
 * 1. If no session exists → redirect to /auth/login (defense-in-depth,
 *    middleware should have already caught this)
 *
 * 2. If session has an unsupported role → redirect to /auth/login with
 *    an error message (Req 9.4)
 *
 * 3. Initialize CSRF token for the session (Req 15.6)
 *
 * 4. If session exists and role is 'ADMIN' or 'EDITOR' → render the admin
 *    layout with the Sidebar and main content slot (Req 10.3)
 *
 * The sidebar receives the user's role to conditionally show/hide navigation
 * items (e.g., settings is only visible to ADMIN).
 */
export default async function AdminLayout({ children }: AdminLayoutProps) {
  // Step 1: Verify session server-side (Req 8.9)
  const session = await getServerSession();

  // Step 2: Redirect if no session (defense-in-depth)
  if (!session) {
    redirect('/auth/login');
  }

  // Step 3: Ensure the session role is one of the supported roles (Req 9.4)
  if (session.role !== 'ADMIN' && session.role !== 'EDITOR') {
    redirect('/auth/login?error=insufficient_permissions');
  }

  // Step 4: Render admin layout for ADMIN and EDITOR roles
  // Note: CSRF token is initialized by CsrfTokenInitializer client component
  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-gray-950 lg:flex-row">
      {/* SPA-like navigation progress indicator */}
      <NavigationProgress />
      <CsrfTokenInitializer />
      <Sidebar role={session.role} />
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
