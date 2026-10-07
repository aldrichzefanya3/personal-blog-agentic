'use client';

import Link from 'next/link';
import { notFound, useRouter } from 'next/navigation';
import { useCallback, useEffect } from 'react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  basePath?: string;
}

/**
 * Enhanced Pagination component - renders styled page navigation with:
 * - Styled button components
 * - Page number indicators
 * - First/Last page jumps
 * - Keyboard navigation (arrow keys)
 * - Total page count display
 * - Disabled/dimmed unavailable navigation
 *
 * Requirements:
 * - Calls notFound() when page > totalPages (Req 1.9)
 * - All links keyboard accessible (Req 4.4, 4.8)
 * - Better navigation UX
 */
export function Pagination({
  currentPage,
  totalPages,
  basePath = '',
}: PaginationProps) {
  const router = useRouter();

  const generatePageUrl = useCallback(
    (page: number) => {
      if (basePath) {
        return `${basePath}?page=${page}`;
      }
      return `?page=${page}`;
    },
    [basePath],
  );

  // Keyboard navigation handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.key === 'ArrowLeft' && currentPage > 1) {
        e.preventDefault();
        router.push(generatePageUrl(currentPage - 1));
      } else if (e.key === 'ArrowRight' && currentPage < totalPages) {
        e.preventDefault();
        router.push(generatePageUrl(currentPage + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages, router, generatePageUrl]);

  if (currentPage > totalPages && totalPages > 0) {
    notFound();
  }

  if (totalPages <= 1) {
    return null;
  }

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      // Show current page and surrounding pages
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  const pages = getPageNumbers();

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-col items-center gap-4 rounded-[1.5rem] border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/80 sm:flex-row sm:justify-between"
    >
      <div className="text-sm text-slate-600 dark:text-slate-400">
        Page <span className="font-bold text-slate-900 dark:text-slate-100">{currentPage}</span> of{' '}
        <span className="font-bold text-slate-900 dark:text-slate-100">{totalPages}</span>
      </div>

      <div className="flex items-center gap-2">
        {currentPage > 1 ? (
          <Link
            href={generatePageUrl(1)}
            className="flex h-10 items-center justify-center rounded-full border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition-all hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700 focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-cyan-500/60 dark:hover:bg-slate-700 dark:hover:text-cyan-300"
            aria-label="Go to first page"
            title="First page"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </Link>
        ) : (
          <span
            className="flex h-10 cursor-not-allowed items-center justify-center rounded-full border border-slate-300 bg-slate-100 px-3 text-sm font-medium text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-600"
            aria-disabled="true"
            title="Already at first page"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </span>
        )}

        {currentPage > 1 ? (
          <Link
            href={generatePageUrl(currentPage - 1)}
            className="flex h-10 items-center justify-center gap-1 rounded-full border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition-all hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700 focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-cyan-500/60 dark:hover:bg-slate-700 dark:hover:text-cyan-300"
            aria-label="Go to previous page"
            title="Previous page (←)"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">Previous</span>
          </Link>
        ) : (
          <span
            className="flex h-10 cursor-not-allowed items-center justify-center gap-1 rounded-full border border-slate-300 bg-slate-100 px-4 text-sm font-medium text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-600"
            aria-disabled="true"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">Previous</span>
          </span>
        )}

        <div className="flex gap-1">
          {pages.map((page, index) => {
            if (page === '...') {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="flex h-10 w-10 items-center justify-center text-slate-500 dark:text-slate-400"
                  aria-hidden="true"
                >
                  ⋯
                </span>
              );
            }

            const pageNum = page as number;
            const isActive = pageNum === currentPage;

            if (isActive) {
              return (
                <span
                  key={pageNum}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-cyan-600 to-violet-600 text-sm font-bold text-white shadow-lg shadow-cyan-500/20"
                  aria-current="page"
                  aria-label={`Current page, page ${pageNum}`}
                >
                  {pageNum}
                </span>
              );
            }

            return (
              <Link
                key={pageNum}
                href={generatePageUrl(pageNum)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-sm font-medium text-slate-700 transition-all hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700 focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-cyan-500/60 dark:hover:bg-slate-700 dark:hover:text-cyan-300"
                aria-label={`Go to page ${pageNum}`}
              >
                {pageNum}
              </Link>
            );
          })}
        </div>

        {currentPage < totalPages ? (
          <Link
            href={generatePageUrl(currentPage + 1)}
            className="flex h-10 items-center justify-center gap-1 rounded-full border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition-all hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700 focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-cyan-500/60 dark:hover:bg-slate-700 dark:hover:text-cyan-300"
            aria-label="Go to next page"
            title="Next page (→)"
          >
            <span className="hidden sm:inline">Next</span>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ) : (
          <span
            className="flex h-10 cursor-not-allowed items-center justify-center gap-1 rounded-full border border-slate-300 bg-slate-100 px-4 text-sm font-medium text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-600"
            aria-disabled="true"
          >
            <span className="hidden sm:inline">Next</span>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        )}

        {currentPage < totalPages ? (
          <Link
            href={generatePageUrl(totalPages)}
            className="flex h-10 items-center justify-center rounded-full border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition-all hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700 focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-cyan-500/60 dark:hover:bg-slate-700 dark:hover:text-cyan-300"
            aria-label="Go to last page"
            title="Last page"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </Link>
        ) : (
          <span
            className="flex h-10 cursor-not-allowed items-center justify-center rounded-full border border-slate-300 bg-slate-100 px-3 text-sm font-medium text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-600"
            aria-disabled="true"
            title="Already at last page"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </span>
        )}
      </div>
    </nav>
  );
}

