/**
 * Unit tests for the admin dashboard page.
 *
 * Tests Requirements 10.1, 10.2, 10.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdminDashboardPage from '@/app/(admin)/admin/page';
import type { DashboardStats, Post } from '@/types/database';

// Mock the query functions
vi.mock('@/lib/db/queries/posts', () => ({
  getDashboardStats: vi.fn(),
  getRecentPosts: vi.fn(),
}));

const { getDashboardStats, getRecentPosts } = await import(
  '@/lib/db/queries/posts'
);

describe('AdminDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Req 10.1 — Display aggregate counts of posts by status, categories, tags, and media items
   */
  it('should display dashboard statistics when data is available', async () => {
    const mockStats: DashboardStats = {
      drafts: 5,
      published: 10,
      archived: 2,
      categories: 3,
      tags: 8,
      media: 15,
    };

    const mockPosts: Post[] = [
      {
        id: '1',
        title: 'Test Post 1',
        slug: 'test-post-1',
        excerpt: null,
        content: null,
        cover_image_url: null,
        author_id: 'author-1',
        status: 'PUBLISHED',
        published_at: '2024-01-15T10:00:00Z',
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
        ai_generated: false,
        ai_review_status: 'not_applicable',
        ai_meta_description: null,
        ai_image_prompt: null,
      },
    ];

    vi.mocked(getDashboardStats).mockResolvedValue(mockStats);
    vi.mocked(getRecentPosts).mockResolvedValue(mockPosts);

    const page = await AdminDashboardPage();
    render(page);

    // Check that all stat cards are displayed with correct values (Req 10.1)
    expect(screen.getByText('Draft Posts')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();

    expect(screen.getByText('Published Posts')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();

    expect(screen.getByText('Archived Posts')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();

    expect(screen.getByText('Categories')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();

    expect(screen.getByText('Tags')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();

    expect(screen.getByText('Media Items')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  /**
   * Req 10.2 — Display the 5 most recently updated posts with title, status, and updated_at
   */
  it('should display recent posts with title, status, and updated_at', async () => {
    const mockStats: DashboardStats = {
      drafts: 1,
      published: 1,
      archived: 0,
      categories: 1,
      tags: 1,
      media: 1,
    };

    const mockPosts: Post[] = [
      {
        id: '1',
        title: 'Recent Post 1',
        slug: 'recent-post-1',
        excerpt: null,
        content: null,
        cover_image_url: null,
        author_id: 'author-1',
        status: 'PUBLISHED',
        published_at: '2024-01-15T10:00:00Z',
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
        ai_generated: false,
        ai_review_status: 'not_applicable',
        ai_meta_description: null,
        ai_image_prompt: null,
      },
      {
        id: '2',
        title: 'Recent Post 2',
        slug: 'recent-post-2',
        excerpt: null,
        content: null,
        cover_image_url: null,
        author_id: 'author-1',
        status: 'DRAFT',
        published_at: null,
        created_at: '2024-01-14T10:00:00Z',
        updated_at: '2024-01-14T10:00:00Z',
        ai_generated: false,
        ai_review_status: 'not_applicable',
        ai_meta_description: null,
        ai_image_prompt: null,
      },
    ];

    vi.mocked(getDashboardStats).mockResolvedValue(mockStats);
    vi.mocked(getRecentPosts).mockResolvedValue(mockPosts);

    const page = await AdminDashboardPage();
    render(page);

    // Check that recent posts section is displayed (Req 10.2)
    expect(screen.getByText('Recent Posts')).toBeInTheDocument();

    // Check post titles are displayed
    expect(screen.getByText('Recent Post 1')).toBeInTheDocument();
    expect(screen.getByText('Recent Post 2')).toBeInTheDocument();

    // Check that status badges are displayed
    expect(screen.getByText('PUBLISHED')).toBeInTheDocument();
    expect(screen.getByText('DRAFT')).toBeInTheDocument();

    // Check that updated_at timestamps are displayed
    expect(screen.getByText(/Updated Jan 15, 2024/)).toBeInTheDocument();
    expect(screen.getByText(/Updated Jan 14, 2024/)).toBeInTheDocument();
  });

  /**
   * Req 10.2 — Handle empty recent posts list
   */
  it('should display "No posts found" when recent posts list is empty', async () => {
    const mockStats: DashboardStats = {
      drafts: 0,
      published: 0,
      archived: 0,
      categories: 0,
      tags: 0,
      media: 0,
    };

    vi.mocked(getDashboardStats).mockResolvedValue(mockStats);
    vi.mocked(getRecentPosts).mockResolvedValue([]);

    const page = await AdminDashboardPage();
    render(page);

    expect(screen.getByText('No posts found.')).toBeInTheDocument();
  });

  /**
   * Req 10.4 — Show error UI if data fetch fails without revealing partial counts
   */
  it('should display error UI without partial data when getDashboardStats fails', async () => {
    vi.mocked(getDashboardStats).mockRejectedValue(
      new Error('Database connection failed'),
    );
    vi.mocked(getRecentPosts).mockResolvedValue([]);

    const page = await AdminDashboardPage();
    render(page);

    // Check that error UI is displayed (Req 10.4)
    expect(screen.getByText('Dashboard Unavailable')).toBeInTheDocument();
    expect(
      screen.getByText(/The dashboard data could not be loaded/),
    ).toBeInTheDocument();

    // Verify that no statistics are displayed
    expect(screen.queryByText('Draft Posts')).not.toBeInTheDocument();
    expect(screen.queryByText('Published Posts')).not.toBeInTheDocument();
    expect(screen.queryByText('Categories')).not.toBeInTheDocument();

    // Verify that recent posts section is not displayed
    expect(screen.queryByText('Recent Posts')).not.toBeInTheDocument();
  });

  /**
   * Req 10.4 — Show error UI without partial data when getRecentPosts fails
   */
  it('should display error UI without partial data when getRecentPosts fails', async () => {
    const mockStats: DashboardStats = {
      drafts: 5,
      published: 10,
      archived: 2,
      categories: 3,
      tags: 8,
      media: 15,
    };

    vi.mocked(getDashboardStats).mockResolvedValue(mockStats);
    vi.mocked(getRecentPosts).mockRejectedValue(
      new Error('Query timeout'),
    );

    const page = await AdminDashboardPage();
    render(page);

    // Check that error UI is displayed (Req 10.4)
    expect(screen.getByText('Dashboard Unavailable')).toBeInTheDocument();

    // Verify that no statistics are displayed (even though fetch succeeded)
    expect(screen.queryByText('Draft Posts')).not.toBeInTheDocument();
    expect(screen.queryByText('Published Posts')).not.toBeInTheDocument();

    // Verify that recent posts section is not displayed
    expect(screen.queryByText('Recent Posts')).not.toBeInTheDocument();
  });

  /**
   * Test status badge styling for different post statuses
   */
  it('should render status badges with correct styling', async () => {
    const mockStats: DashboardStats = {
      drafts: 1,
      published: 1,
      archived: 1,
      categories: 1,
      tags: 1,
      media: 1,
    };

    const mockPosts: Post[] = [
      {
        id: '1',
        title: 'Published Post',
        slug: 'published-post',
        excerpt: null,
        content: null,
        cover_image_url: null,
        author_id: 'author-1',
        status: 'PUBLISHED',
        published_at: '2024-01-15T10:00:00Z',
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
        ai_generated: false,
        ai_review_status: 'not_applicable',
        ai_meta_description: null,
        ai_image_prompt: null,
      },
      {
        id: '2',
        title: 'Draft Post',
        slug: 'draft-post',
        excerpt: null,
        content: null,
        cover_image_url: null,
        author_id: 'author-1',
        status: 'DRAFT',
        published_at: null,
        created_at: '2024-01-14T10:00:00Z',
        updated_at: '2024-01-14T10:00:00Z',
        ai_generated: false,
        ai_review_status: 'not_applicable',
        ai_meta_description: null,
        ai_image_prompt: null,
      },
      {
        id: '3',
        title: 'Archived Post',
        slug: 'archived-post',
        excerpt: null,
        content: null,
        cover_image_url: null,
        author_id: 'author-1',
        status: 'ARCHIVED',
        published_at: '2024-01-13T10:00:00Z',
        created_at: '2024-01-13T10:00:00Z',
        updated_at: '2024-01-13T10:00:00Z',
        ai_generated: false,
        ai_review_status: 'not_applicable',
        ai_meta_description: null,
        ai_image_prompt: null,
      },
    ];

    vi.mocked(getDashboardStats).mockResolvedValue(mockStats);
    vi.mocked(getRecentPosts).mockResolvedValue(mockPosts);

    const page = await AdminDashboardPage();
    render(page);

    // Check that all status badges are displayed
    const publishedBadge = screen.getByText('PUBLISHED');
    const draftBadge = screen.getByText('DRAFT');
    const archivedBadge = screen.getByText('ARCHIVED');

    // Verify each badge has appropriate styling classes
    expect(publishedBadge).toHaveClass('bg-green-100');
    expect(draftBadge).toHaveClass('bg-yellow-100');
    expect(archivedBadge).toHaveClass('bg-gray-100');
  });
});
