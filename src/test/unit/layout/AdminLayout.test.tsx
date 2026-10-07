/**
 * Unit tests for AdminLayout component.
 *
 * These tests verify that the admin layout correctly:
 * - Calls getServerSession() to verify authentication
 * - Redirects to /auth/login when no session exists
 * - Redirects to /auth/login when role is unsupported
 * - Renders the Sidebar with the user's role
 * - Renders the main content slot
 *
 * Requirements: 8.9, 9.4, 10.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { redirect } from 'next/navigation';
import { render, screen } from '@testing-library/react';
import AdminLayout from '@/app/(admin)/layout';
import { getServerSession } from '@/lib/auth/session';
import type { SessionUser } from '@/lib/auth/session';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  usePathname: vi.fn(() => '/admin'),
}));

// Mock getServerSession
vi.mock('@/lib/auth/session', () => ({
  getServerSession: vi.fn(),
}));

describe('AdminLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to /auth/login when no session exists (defense-in-depth)', async () => {
    // Arrange: No session
    vi.mocked(getServerSession).mockResolvedValue(null);

    // Act: Render the layout
    await expect(AdminLayout({ children: <div>Test Content</div> })).rejects.toThrow(
      'NEXT_REDIRECT:/auth/login',
    );

    // Assert: Should redirect to login
    expect(redirect).toHaveBeenCalledWith('/auth/login');
  });

  it('redirects to /auth/login with error when role is unsupported (Req 9.4)', async () => {
    // Arrange: Session with a non-supported role value
    const userSession = {
      id: 'user-123',
      email: 'user@example.com',
      role: 'USER',
      display_name: 'Test User',
      bio: null,
      avatar_url: null,
      created_at: new Date().toISOString(),
    } as unknown as SessionUser;
    vi.mocked(getServerSession).mockResolvedValue(userSession);

    // Act: Render the layout
    await expect(AdminLayout({ children: <div>Test Content</div> })).rejects.toThrow(
      'NEXT_REDIRECT:/auth/login?error=insufficient_permissions',
    );

    // Assert: Should redirect to login with error parameter
    expect(redirect).toHaveBeenCalledWith('/auth/login?error=insufficient_permissions');
  });

  it('renders admin layout for EDITOR role (Req 10.3)', async () => {
    // Arrange: Session with EDITOR role
    const editorSession: SessionUser = {
      id: 'editor-123',
      email: 'editor@example.com',
      role: 'EDITOR',
      display_name: 'Test Editor',
      bio: null,
      avatar_url: null,
      created_at: new Date().toISOString(),
    };
    vi.mocked(getServerSession).mockResolvedValue(editorSession);

    // Act: Render the layout
    const result = await AdminLayout({ children: <div>Test Content</div> });
    render(result as React.ReactElement);

    // Assert: Should render the content
    expect(screen.getByText('Test Content')).toBeInTheDocument();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('renders admin layout for ADMIN role (Req 10.3)', async () => {
    // Arrange: Session with ADMIN role
    const adminSession: SessionUser = {
      id: 'admin-123',
      email: 'admin@example.com',
      role: 'ADMIN',
      display_name: 'Test Admin',
      bio: null,
      avatar_url: null,
      created_at: new Date().toISOString(),
    };
    vi.mocked(getServerSession).mockResolvedValue(adminSession);

    // Act: Render the layout
    const result = await AdminLayout({ children: <div>Test Content</div> });
    render(result as React.ReactElement);

    // Assert: Should render the content
    expect(screen.getByText('Test Content')).toBeInTheDocument();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('renders Sidebar with user role', async () => {
    // Arrange: Session with EDITOR role
    const editorSession: SessionUser = {
      id: 'editor-123',
      email: 'editor@example.com',
      role: 'EDITOR',
      display_name: 'Test Editor',
      bio: null,
      avatar_url: null,
      created_at: new Date().toISOString(),
    };
    vi.mocked(getServerSession).mockResolvedValue(editorSession);

    // Act: Render the layout
    const result = await AdminLayout({ children: <div>Test Content</div> });
    render(result as React.ReactElement);

    // Assert: Sidebar should be rendered with navigation items
    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Posts')).toBeInTheDocument();
  });

  it('renders main content in a main element', async () => {
    // Arrange: Session with EDITOR role
    const editorSession: SessionUser = {
      id: 'editor-123',
      email: 'editor@example.com',
      role: 'EDITOR',
      display_name: 'Test Editor',
      bio: null,
      avatar_url: null,
      created_at: new Date().toISOString(),
    };
    vi.mocked(getServerSession).mockResolvedValue(editorSession);

    // Act: Render the layout
    const result = await AdminLayout({ children: <div>Test Content</div> });
    render(result as React.ReactElement);

    // Assert: Content should be in a main element
    const main = document.querySelector('main');
    expect(main).toBeInTheDocument();
    expect(main).toHaveClass('flex-1', 'p-4', 'sm:p-6', 'lg:p-8');
    expect(main).toContainHTML('Test Content');
  });

  it('applies responsive layout styles', async () => {
    // Arrange: Session with ADMIN role
    const adminSession: SessionUser = {
      id: 'admin-123',
      email: 'admin@example.com',
      role: 'ADMIN',
      display_name: 'Test Admin',
      bio: null,
      avatar_url: null,
      created_at: new Date().toISOString(),
    };
    vi.mocked(getServerSession).mockResolvedValue(adminSession);

    // Act: Render the layout
    const result = await AdminLayout({ children: <div>Test Content</div> });
    render(result as React.ReactElement);

    // Assert: Container should have flex layout
    const container = document.querySelector('.flex.min-h-screen');
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass('bg-white', 'dark:bg-gray-950');
  });
});
