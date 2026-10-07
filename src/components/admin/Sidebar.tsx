/**
 * Admin sidebar navigation component.
 *
 * Displays role-conditional navigation items for the admin panel.
 * Settings link is only visible to ADMIN role users.
 *
 * Requirements: 8.9, 9.4, 10.3
 *
 * Req 8.9  — Session verified server-side before rendering admin content
 * Req 9.4  — USER role is blocked from /admin/** routes
 * Req 10.3 — Dashboard displays for ADMIN and EDITOR users
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  { label: 'Settings', href: '/admin/settings', minRole: 'ADMIN' },
];

/**
 * Determines if a user role has permission to see a nav item.
 *
 * ADMIN can see everything.
 * EDITOR can see everything except items marked minRole: 'ADMIN'.
 * USER should never reach this component (blocked by middleware + layout).
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

  // Filter nav items based on user role (Req 9.4)
  const visibleItems = NAV_ITEMS.filter((item) => canAccessNavItem(role, item));

  return (
    <aside className="w-64 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 min-h-screen">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Admin Panel
        </h2>
        <nav className="space-y-1">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  block px-4 py-2 rounded-md text-sm font-medium transition-colors
                  ${
                    isActive
                      ? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
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
