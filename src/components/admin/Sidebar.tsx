/**
 * Admin sidebar navigation component.
 *
 * Displays role-conditional navigation items for the admin panel.
 * Settings is only visible to ADMIN role users; Profile is visible to all.
 *
 * Requirements: 8.7, 8.9, 9.4, 10.3, 15.6
 *
 * Req 8.7  — Logout invalidates session and clears cookie
 * Req 8.9  — Session verified server-side before rendering admin content
 * Req 9.4  — Only ADMIN and EDITOR roles access /admin/** routes
 * Req 10.3 — Dashboard displays for ADMIN and EDITOR users
 * Req 15.6 — Logout clears CSRF token cookie
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { logoutAction } from '@/actions/auth';
import type { UserRole } from '@/types/database';

interface SidebarProps {
  /** The authenticated user's role from the session */
  role: UserRole;
}

interface NavItem {
  label: string;
  href: string;
  /** Minimum role required to see this item */
  minRole?: UserRole;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/admin' },
  { label: 'Posts', href: '/admin/posts' },
  { label: 'Categories', href: '/admin/categories' },
  { label: 'Tags', href: '/admin/tags' },
  { label: 'Media', href: '/admin/media' },
  { label: 'Profile', href: '/admin/profile' },
  { label: 'Settings', href: '/admin/settings', minRole: 'ADMIN' },
];

/**
 * Determines if a user role has permission to see a nav item.
 *
 * ADMIN can see everything.
 * EDITOR can see everything except items marked minRole: 'ADMIN'.
 */
function canAccessNavItem(userRole: UserRole, item: NavItem): boolean {
  if (!item.minRole) return true;
  if (item.minRole === 'ADMIN') return userRole === 'ADMIN';
  return true;
}

/**
 * Admin sidebar navigation.
 *
 * Renders a vertical navigation menu with role-based filtering.
 * Active route is highlighted with a distinct background color.
 * A "Sign out" button at the bottom triggers the logoutAction server action.
 */
export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Filter nav items based on user role (Req 9.4)
  const visibleItems = NAV_ITEMS.filter((item) => canAccessNavItem(role, item));

  return (
    <aside className="w-full shrink-0 border-b border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/80 lg:min-h-screen lg:w-64 lg:border-r lg:border-b-0">
      <div className="flex h-full flex-col p-4 sm:p-5 lg:p-4">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white dark:bg-slate-100 dark:text-slate-900">
              A
            </div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Admin Panel
            </h2>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            aria-label={isOpen ? 'Collapse admin menu' : 'Expand admin menu'}
            aria-expanded={isOpen}
            aria-controls="admin-sidebar-nav"
            onClick={() => setIsOpen((current) => !current)}
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-700 shadow-sm transition hover:bg-slate-100 focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 lg:hidden"
          >
            <span className="sr-only">Toggle menu</span>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* ── Navigation links ─────────────────────────────────────────────── */}
        <nav
          id="admin-sidebar-nav"
          className={`${isOpen ? 'mt-4' : 'hidden'} grid gap-1 sm:grid-cols-2 lg:mt-4 lg:block lg:flex-1`}
        >
          {visibleItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`
                  block rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200
                  ${
                    isActive
                      ? 'bg-slate-200 text-slate-900 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                  }
                `}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* ── Logout footer ─────────────────────────────────────────────────
         *
         * Security notes (Req 8.7, 15.6):
         *  - logoutAction runs server-side: calls supabase.auth.signOut() to
         *    revoke the session in Supabase, then clears the HTTP-only session
         *    cookie and the CSRF cookie before redirecting to /auth/login.
         *  - Invoked via a Server Action (POST), not a plain link, so a
         *    cross-origin GET request (CSRF) cannot trigger it.
         *  - isLoggingOut guard disables the button to prevent double-submit.
         * ──────────────────────────────────────────────────────────────────── */}
        <div
          className={`${isOpen ? 'mt-4' : 'hidden'} border-t border-slate-200 pt-4 dark:border-slate-800 lg:mt-auto lg:block lg:pt-4`}
        >
          {/* Current role badge */}
          <p className="mb-3 px-1 text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Signed in as{' '}
            <span className="font-semibold text-slate-600 dark:text-slate-300">{role}</span>
          </p>

          <button
            id="admin-logout-btn"
            type="button"
            disabled={isLoggingOut}
            aria-label="Sign out of admin panel"
            aria-busy={isLoggingOut}
            onClick={async () => {
              setIsLoggingOut(true);
              try {
                await logoutAction();
              } catch {
                // logoutAction always redirects; only reachable on unexpected error
                setIsLoggingOut(false);
              }
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition-all duration-200 hover:bg-red-50 hover:text-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/40 dark:hover:text-red-300"
          >
            {/* Sign-out arrow icon */}
            <svg
              className="h-4 w-4 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            {isLoggingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </div>
    </aside>
  );
}
