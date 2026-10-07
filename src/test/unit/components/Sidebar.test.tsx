/**
 * Unit tests for Sidebar component.
 *
 * These tests verify that the sidebar correctly:
 * - Displays all navigation items appropriate for the user's role
 * - Hides Settings link from EDITOR users
 * - Shows Settings link to ADMIN users
 * - Highlights the active route
 *
 * Requirements: 9.4, 10.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Sidebar } from '@/components/admin/Sidebar';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/admin'),
}));

// Import after mocking
import { usePathname } from 'next/navigation';

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all common navigation items for EDITOR role', () => {
    // Arrange & Act
    render(<Sidebar role="EDITOR" />);

    // Assert: Common items should be visible
    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Posts')).toBeInTheDocument();
    expect(screen.getByText('Categories')).toBeInTheDocument();
    expect(screen.getByText('Tags')).toBeInTheDocument();
    expect(screen.getByText('Media')).toBeInTheDocument();
  });

  it('hides Settings link from EDITOR role (Req 9.4)', () => {
    // Arrange & Act
    render(<Sidebar role="EDITOR" />);

    // Assert: Settings should NOT be visible to EDITOR
    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
  });

  it('shows Settings link to ADMIN role (Req 9.4)', () => {
    // Arrange & Act
    render(<Sidebar role="ADMIN" />);

    // Assert: Settings should be visible to ADMIN
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders all navigation items for ADMIN role', () => {
    // Arrange & Act
    render(<Sidebar role="ADMIN" />);

    // Assert: All items should be visible including Settings
    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Posts')).toBeInTheDocument();
    expect(screen.getByText('Categories')).toBeInTheDocument();
    expect(screen.getByText('Tags')).toBeInTheDocument();
    expect(screen.getByText('Media')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('highlights the active route', () => {
    // Arrange: Mock current path as /admin/posts
    vi.mocked(usePathname).mockReturnValue('/admin/posts');

    // Act
    render(<Sidebar role="ADMIN" />);

    // Assert: Posts link should have active styling
    const postsLink = screen.getByText('Posts').closest('a');
    expect(postsLink).toHaveClass('bg-gray-200', 'dark:bg-gray-800');
  });

  it('does not highlight inactive routes', () => {
    // Arrange: Mock current path as /admin
    vi.mocked(usePathname).mockReturnValue('/admin');

    // Act
    render(<Sidebar role="ADMIN" />);

    // Assert: Posts link should NOT have active styling
    const postsLink = screen.getByText('Posts').closest('a');
    expect(postsLink).not.toHaveClass('bg-gray-200');
    expect(postsLink).toHaveClass('text-gray-700', 'dark:text-gray-300');
  });

  it('renders navigation links with correct href attributes', () => {
    // Arrange & Act
    render(<Sidebar role="ADMIN" />);

    // Assert: Each link should have the correct href
    expect(screen.getByText('Dashboard').closest('a')).toHaveAttribute('href', '/admin');
    expect(screen.getByText('Posts').closest('a')).toHaveAttribute('href', '/admin/posts');
    expect(screen.getByText('Categories').closest('a')).toHaveAttribute('href', '/admin/categories');
    expect(screen.getByText('Tags').closest('a')).toHaveAttribute('href', '/admin/tags');
    expect(screen.getByText('Media').closest('a')).toHaveAttribute('href', '/admin/media');
    expect(screen.getByText('Settings').closest('a')).toHaveAttribute('href', '/admin/settings');
  });

  it('applies semantic HTML for navigation', () => {
    // Arrange & Act
    render(<Sidebar role="ADMIN" />);

    // Assert: Should use aside and nav elements
    const aside = document.querySelector('aside');
    expect(aside).toBeInTheDocument();
    expect(aside).toHaveClass('w-64', 'bg-gray-50', 'dark:bg-gray-900');

    const nav = document.querySelector('nav');
    expect(nav).toBeInTheDocument();
  });

  it('applies responsive styling for light and dark modes', () => {
    // Arrange & Act
    render(<Sidebar role="ADMIN" />);

    // Assert: Should have light/dark mode classes
    const aside = document.querySelector('aside');
    expect(aside).toHaveClass(
      'bg-gray-50',
      'dark:bg-gray-900',
      'border-r',
      'border-gray-200',
      'dark:border-gray-800'
    );
  });

  it('handles USER role (should not reach this point due to layout guard, but safe fallback)', () => {
    // Arrange & Act: Render with USER role
    render(<Sidebar role="USER" />);

    // Assert: Common items should still render (layout blocks access before this)
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    // Settings should not be visible
    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
  });
});
