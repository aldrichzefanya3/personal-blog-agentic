import Link from 'next/link';
import type { Category } from '@/types';

export interface CategoryBadgeProps {
  category: Category;
  asLink?: boolean;
}

function getCategoryTone(name: string) {
  const tones = [
    'border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-500/40 dark:bg-cyan-500/10 dark:text-cyan-200',
    'border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-200',
    'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200',
    'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200',
    'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200',
  ];

  const hash = Array.from(name).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return tones[hash % tones.length];
}

export function CategoryBadge({ category, asLink = true }: CategoryBadgeProps) {
  const badgeClasses = `inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.02em] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:outline-none ${getCategoryTone(category.name)}`;

  if (asLink) {
    return (
      <Link href={`/categories/${category.slug}`} className={badgeClasses}>
        <span aria-hidden="true">#</span>
        {category.name}
      </Link>
    );
  }

  return (
    <span className={badgeClasses}>
      <span aria-hidden="true">#</span>
      {category.name}
    </span>
  );
}
