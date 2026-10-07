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
import { fireEvent, render, screen } from '@testing-library/react';
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
    expect(postsLink).toHaveClass('bg-slate-200', 'dark:bg-slate-800');
  });

  it('does not highlight inactive routes', () => {
    // Arrange: Mock current path as /admin
    vi.mocked(usePathname).mockReturnValue('/admin');

    // Act
    render(<Sidebar role="ADMIN" />);

    // Assert: Posts link should NOT have active styling
    const postsLink = screen.getByText('Posts').closest('a');
    expect(postsLink).not.toHaveClass('bg-slate-200');
    expect(postsLink).toHaveClass('text-slate-700', 'dark:text-slate-300');
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
    expect(aside).toHaveClass('w-full', 'bg-slate-50/80', 'dark:bg-slate-950/80');

    const nav = document.querySelector('nav');
    expect(nav).toBeInTheDocument();
  });

  it('uses responsive layout classes for tablet and mobile screens', () => {
    // Arrange & Act
    render(<Sidebar role="ADMIN" />);

    // Assert: Sidebar should stack properly on small screens and keep width on large screens
    const aside = document.querySelector('aside');
    expect(aside).toHaveClass('w-full', 'lg:w-64', 'lg:border-r');
    expect(aside).toHaveClass('border-b', 'border-slate-200', 'lg:border-b-0');
  });

  it('applies responsive styling for light and dark modes', () => {
    // Arrange & Act
    render(<Sidebar role="ADMIN" />);

    // Assert: Should have light/dark mode classes
    const aside = document.querySelector('aside');
    expect(aside).toHaveClass(
      'bg-slate-50/80',
      'dark:bg-slate-950/80',
      'border-b',
      'border-slate-200',
      'dark:border-slate-800',
      'lg:border-r',
      'lg:border-b-0'
    );
  });

  it('renders a mobile menu toggle and allows expanding/collapsing the nav on smaller screens', () => {
    // Arrange & Act
    render(<Sidebar role="ADMIN" />);

    const toggleButton = screen.getByRole('button', { name: /expand admin menu/i });
    const nav = document.getElementById('admin-sidebar-nav');

    // Assert: Menu is collapsed by default and can be expanded
    expect(toggleButton).toBeInTheDocument();
    expect(nav).toHaveClass('hidden');

    fireEvent.click(toggleButton);

    expect(nav).not.toHaveClass('hidden');
    expect(screen.getByRole('button', { name: /collapse admin menu/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /collapse admin menu/i }));
    expect(nav).toHaveClass('hidden');
  });

});
