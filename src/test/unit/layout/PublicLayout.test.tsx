import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PublicLayout from '@/app/(public)/layout';

describe('PublicLayout', () => {
  it('renders header, main content, and footer', () => {
    render(
      <PublicLayout>
        <div>Test Content</div>
      </PublicLayout>
    );

    // Check that the main content is rendered
    expect(screen.getByText('Test Content')).toBeInTheDocument();

    // Check for semantic HTML elements
    const main = document.querySelector('main');
    expect(main).toBeInTheDocument();
    expect(main).toHaveClass('flex-1'); // Ensure main takes available space

    // Check for header and footer
    const header = document.querySelector('header');
    const footer = document.querySelector('footer');
    expect(header).toBeInTheDocument();
    expect(footer).toBeInTheDocument();
  });

  it('applies Tailwind prose styles to content', () => {
    render(
      <PublicLayout>
        <div>Test Content</div>
      </PublicLayout>
    );

    const proseContainer = document.querySelector('.prose');
    expect(proseContainer).toBeInTheDocument();
    expect(proseContainer).toHaveClass('prose-base');
    expect(proseContainer).toHaveClass('prose-gray');
    expect(proseContainer).toHaveClass('dark:prose-invert');
  });

  it('applies responsive padding and max-width constraints', () => {
    render(
      <PublicLayout>
        <div>Test Content</div>
      </PublicLayout>
    );

    const main = document.querySelector('main');
    expect(main).toHaveClass('max-w-7xl');
    expect(main).toHaveClass('px-4');
    expect(main).toHaveClass('sm:px-6');
    expect(main).toHaveClass('lg:px-8');
  });

  it('ensures base font size is at least 16px via prose-base', () => {
    render(
      <PublicLayout>
        <div>Test Content</div>
      </PublicLayout>
    );

    // prose-base applies font-size: 1rem (16px)
    const proseContainer = document.querySelector('.prose-base');
    expect(proseContainer).toBeInTheDocument();
  });
});
