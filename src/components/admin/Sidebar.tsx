/**
 * Admin sidebar navigation component.
 *
 * Displays role-conditional navigation items for the admin panel.
 * Settings is only visible to ADMIN role users; Profile is visible to all.
 *
 * Requirements: 8.9, 9.4, 10.3
 *
 * Req 8.9  — Session verified server-side before rendering admin content
 * Req 9.4  — Only ADMIN and EDITOR roles access /admin/** routes
 * Req 10.3 — Dashboard displays for ADMIN and EDITOR users
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
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
 */
export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Filter nav items based on user role (Req 9.4)
  const visibleItems = NAV_ITEMS.filter((item) => canAccessNavItem(role, item));

  return (
    <aside className="w-full shrink-0 border-b border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/80 lg:min-h-screen lg:w-64 lg:border-r lg:border-b-0">
      <div className="p-4 sm:p-5 lg:p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white dark:bg-slate-100 dark:text-slate-900">
              A
            </div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Admin Panel
            </h2>
          </div>

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

        <nav
          id="admin-sidebar-nav"
          className={`${isOpen ? 'mt-4' : 'hidden'} grid gap-1 sm:grid-cols-2 lg:mt-4 lg:block`}
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
      </div>
    </aside>
  );
}
