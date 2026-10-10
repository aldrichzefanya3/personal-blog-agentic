import { Suspense } from 'react';
import { sql } from '@/lib/db/client';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import type { User } from '@/types/database';

export const revalidate = 60;

async function AboutPageContent() {
  const rows = await sql<User[]>`
    SELECT id, role, display_name, bio, avatar_url, created_at
    FROM public.users
    WHERE role IN ('ADMIN', 'EDITOR')
    ORDER BY created_at ASC
    LIMIT 1
  `;

  const author = rows[0];

  if (!author) {
    notFound();
  }

  const displayName = author.display_name || 'Anonymous Author';
  const bio = author.bio || 'No bio available.';
  const externalProfileUrl =
    `https://example.com/profile/${author.id}`;

  return (
    <div className="bg-slate-50/80 dark:bg-slate-950/30">
      <div className="container mx-auto px-4 py-8 sm:py-10 lg:py-12">
        <article className="mx-auto max-w-4xl rounded-[2rem] border border-slate-200 bg-white/80 p-6 shadow-lg dark:border-slate-700 dark:bg-slate-900/80 sm:p-8 lg:p-10">
          <header className="mb-8">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-cyan-700 dark:text-cyan-300">
              About
            </p>
            <h1 className="text-3xl font-black text-slate-900 dark:text-slate-50 sm:text-4xl">
              A little more context
            </h1>
          </header>

          {author.avatar_url ? (
            <div className="mb-6 flex justify-center">
              <div className="relative h-32 w-32 overflow-hidden rounded-full">
                <Image
                  src={author.avatar_url}
                  alt={`${displayName}'s profile picture`}
                  fill
                  sizes="128px"
                  className="object-cover"
                />
              </div>
            </div>
          ) : (
            <div className="mb-6 flex justify-center">
              <div className="flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-cyan-100 to-violet-100 text-3xl font-black text-slate-700 dark:from-cyan-950 dark:to-violet-950 dark:text-slate-200">
                {displayName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
            </div>
          )}

          <h2 className="mb-4 text-center text-2xl font-black text-slate-900 dark:text-slate-50 sm:text-3xl">
            {displayName}
          </h2>

          <div className="prose prose-lg mb-8 max-w-none dark:prose-invert">
            <p className="whitespace-pre-wrap leading-relaxed text-slate-700 dark:text-slate-300">
              {bio}
            </p>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800">
            <h3 className="mb-3 text-lg font-bold text-slate-900 dark:text-slate-50">
              Connect
            </h3>
            <a
              href={externalProfileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 dark:bg-cyan-400 dark:text-slate-950"
            >
              View External Profile ↗
            </a>
          </section>
        </article>
      </div>
    </div>
  );
}

export default function AboutPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading about page...</div>}>
      <AboutPageContent />
    </Suspense>
  );
}