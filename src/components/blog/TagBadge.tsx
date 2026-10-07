import Link from 'next/link';
import type { Tag } from '@/types';

export interface TagBadgeProps {
  tag: Tag;
  asLink?: boolean;
}

function getTagTone(name: string) {
  const tones = [
    'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
    'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-500/40 dark:bg-fuchsia-500/10 dark:text-fuchsia-200',
    'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-200',
    'border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-500/40 dark:bg-teal-500/10 dark:text-teal-200',
  ];

  const hash = Array.from(name).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return tones[hash % tones.length];
}

export function TagBadge({ tag, asLink = true }: TagBadgeProps) {
  const badgeClasses = `inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium tracking-[0.02em] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:outline-none ${getTagTone(tag.name)}`;

  if (asLink) {
    return (
      <Link href={`/tags/${tag.slug}`} className={badgeClasses}>
        <span aria-hidden="true">#</span>
        {tag.name}
      </Link>
    );
  }

  return (
    <span className={badgeClasses}>
      <span aria-hidden="true">#</span>
      {tag.name}
    </span>
  );
}
