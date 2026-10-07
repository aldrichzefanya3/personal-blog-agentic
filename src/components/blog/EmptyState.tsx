export interface EmptyStateProps {
  message?: string;
  suggestion?: string;
}

/**
 * EmptyState component - displays an illustrated empty state with
 * a friendly message and suggestion.
 *
 * Requirements:
 * - Better UX for edge case
 * - Illustrated empty state
 * - Friendly message and helpful suggestion
 */
export function EmptyState({
  message = 'No posts yet',
  suggestion = 'Check back soon for new content!',
}: EmptyStateProps) {
  return (
    <div className="flex min-h-[420px] items-center justify-center py-10">
      <div className="w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white/80 p-8 text-center shadow-[0_20px_50px_rgba(15,23,42,0.06)] backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/80">
        <div className="mb-6 flex justify-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-cyan-100 to-violet-100 dark:from-cyan-950 dark:to-violet-950">
            <svg className="h-12 w-12 text-cyan-600 dark:text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M9 12h6M9 8h6M9 16h4M7 21h10a2 2 0 002-2V7l-5-5H7a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>

        <h2 className="mb-3 text-2xl font-black tracking-[-0.04em] text-slate-900 dark:text-slate-50">
          {message}
        </h2>

        <p className="mb-6 text-base text-slate-600 dark:text-slate-300">
          {suggestion}
        </p>

        <div className="flex justify-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-cyan-500 animate-pulse" style={{ animationDelay: '0ms' }} />
          <span className="h-2.5 w-2.5 rounded-full bg-violet-500 animate-pulse" style={{ animationDelay: '150ms' }} />
          <span className="h-2.5 w-2.5 rounded-full bg-pink-500 animate-pulse" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
