import { sql } from '@/lib/db/client';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import type { User } from '@/types/database';

// Enable ISR with 60 second revalidation (Req 5.1, 5.3)
export const revalidate = 60;

/**
 * About page - displays author profile with bio and external profile links.
 *
 * Requirements:
 * - Display author's bio text (Req 1.8)
 * - Display at least one external profile link (Req 1.8)
 * - Static Server Component (Req 5.2)
 * - ISR with 60s revalidation (Req 5.1, 5.3)
 * - Semantic HTML (Req 3.7)
 * - Use Next.js Image for optimization (Req 5.4)
 */
export default async function AboutPage() {
  // Fetch the first ADMIN or EDITOR user (primary author) from the database
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

  // Note: The current schema doesn't have a dedicated field for external profile links.
  // Using a derived link based on the example.com domain from seed data as a placeholder.
  // In production, this would be stored in a dedicated field in the database.
  const externalProfileUrl = `https://example.com/profile/${author.id}`;

  return (
    <div className="bg-slate-50/80 dark:bg-slate-950/30">
      <div className="container mx-auto px-4 py-8 sm:py-10 lg:py-12">
        <article className="mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white/80 shadow-[0_28px_80px_rgba(15,23,42,0.08)] backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/80">
          <header className="border-b border-slate-200 bg-gradient-to-r from-cyan-50 via-white to-violet-50 p-6 dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-violet-950 sm:p-8 lg:p-10">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700 dark:text-cyan-300">
              About
            </p>
            <h1 className="text-3xl font-black tracking-[-0.05em] text-slate-900 dark:text-slate-50 sm:text-4xl">
              A little more context
            </h1>
          </header>

          <div className="space-y-8 p-6 sm:p-8 lg:p-10">
            {author.avatar_url ? (
              <div className="flex justify-center">
                <div className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-slate-200 bg-slate-100 shadow-lg shadow-slate-200/60 dark:border-slate-700 dark:bg-slate-800 dark:shadow-slate-950/40">
                  <Image
                    src={author.avatar_url}
                    alt={`${displayName}'s profile picture`}
                    fill
                    className="object-cover"
                    sizes="128px"
                  />
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-slate-200 bg-gradient-to-br from-cyan-100 to-violet-100 text-3xl font-black text-slate-700 dark:border-slate-700 dark:from-cyan-950 dark:to-violet-950 dark:text-slate-200">
                  {displayName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
              </div>
            )}

            <div>
              <h2 className="mb-4 text-center text-2xl font-black tracking-[-0.04em] text-slate-900 dark:text-slate-50 sm:text-3xl">
                {displayName}
              </h2>
            </div>

            <div className="prose prose-lg max-w-none prose-headings:tracking-[-0.04em] prose-headings:text-slate-900 dark:prose-invert dark:prose-headings:text-slate-50">
              <p className="whitespace-pre-wrap leading-relaxed text-slate-700 dark:text-slate-300">
                {bio}
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/80">
              <h3 className="mb-3 text-lg font-bold text-slate-900 dark:text-slate-50">
                Connect
              </h3>
              <div className="flex flex-wrap gap-4">
                <a
                  href={externalProfileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:outline-none dark:bg-cyan-400 dark:text-slate-950 dark:hover:bg-cyan-300"
                >
                  View External Profile
                  <svg
                    className="ml-2 h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
