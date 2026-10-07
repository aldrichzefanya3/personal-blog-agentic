'use client';

import { useMemo, useState } from 'react';

interface PostShareButtonsProps {
  title: string;
  url: string;
}

const shareLinks = {
  x: (title: string, url: string) =>
    `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
  linkedin: (title: string, url: string) =>
    `https://www.linkedin.com/shareArticle?mini=true&title=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
  facebook: (title: string, url: string) =>
    `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(title)}`,
};

export function PostShareButtons({ title, url }: PostShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const canonicalTitle = useMemo(() => title || 'Read this post', [title]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={shareLinks.x(canonicalTitle, url)}
        target="_blank"
        rel="noreferrer"
        aria-label={`Share ${canonicalTitle} on X`}
        className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:-translate-y-0.5 hover:border-cyan-300 hover:text-cyan-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-400 dark:hover:text-cyan-300"
      >
        X
      </a>
      <a
        href={shareLinks.linkedin(canonicalTitle, url)}
        target="_blank"
        rel="noreferrer"
        aria-label={`Share ${canonicalTitle} on LinkedIn`}
        className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:-translate-y-0.5 hover:border-cyan-300 hover:text-cyan-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-400 dark:hover:text-cyan-300"
      >
        LinkedIn
      </a>
      <a
        href={shareLinks.facebook(canonicalTitle, url)}
        target="_blank"
        rel="noreferrer"
        aria-label={`Share ${canonicalTitle} on Facebook`}
        className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:-translate-y-0.5 hover:border-cyan-300 hover:text-cyan-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-400 dark:hover:text-cyan-300"
      >
        Facebook
      </a>
      <button
        type="button"
        onClick={handleCopyLink}
        aria-label={`Copy link to ${canonicalTitle}`}
        className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:-translate-y-0.5 hover:border-violet-300 hover:text-violet-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-violet-400 dark:hover:text-violet-300"
      >
        {copied ? 'Copied!' : 'Copy link'}
      </button>
    </div>
  );
}
