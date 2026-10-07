import Link from 'next/link';

/**
 * Hero section component - displays large, eye-catching headline with gradient text,
 * subheading, decorative background, and scroll indicator.
 *
 * Requirements:
 * - Engaging first impression
 * - Responsive height (taller on desktop)
 * - Gradient text effect on headline
 * - Decorative background with gradient
 * - Scroll indicator
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-slate-200 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),transparent_35%),linear-gradient(135deg,#f8fbff_0%,#eef2ff_30%,#f8fafc_100%)] dark:border-slate-700 dark:bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),transparent_28%),linear-gradient(135deg,#020817_0%,#0f172a_30%,#111827_100%)]">
      <div className="absolute inset-0 opacity-80">
        <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-cyan-400/30 blur-3xl dark:bg-cyan-500/20" />
        <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-violet-400/30 blur-3xl dark:bg-violet-500/20" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-fuchsia-400/20 blur-3xl dark:bg-fuchsia-500/20" />
      </div>

      <div className="container relative mx-auto px-4 py-16 md:py-24 lg:py-28">
        <div className="mx-auto max-w-5xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700 backdrop-blur-sm dark:border-cyan-500/30 dark:bg-slate-900/50 dark:text-cyan-300">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
            Writing • Design • Ideas
          </div>

          <h1 className="mb-6 text-4xl font-black leading-[0.9] tracking-[-0.06em] text-slate-900 sm:text-5xl md:text-6xl lg:text-7xl dark:text-white">
            <span className="bg-gradient-to-r from-sky-600 via-violet-600 to-pink-600 bg-clip-text text-transparent dark:from-cyan-300 dark:via-violet-300 dark:to-pink-300">
              Welcome to My Blog
            </span>
          </h1>

          <p className="mx-auto mb-10 max-w-3xl text-lg text-slate-600 sm:text-xl md:text-2xl dark:text-slate-300">
            Thoughts, stories, and ideas on technology, design, and life — thoughtfully written and built to be easy to revisit.
          </p>

          <div className="mb-12 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="#posts"
              className="inline-flex items-center rounded-full bg-slate-900 px-7 py-3 text-base font-semibold text-white shadow-[0_18px_30px_rgba(15,23,42,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 focus:ring-4 focus:ring-cyan-500/50 focus:ring-offset-2 focus:outline-none dark:bg-cyan-400 dark:text-slate-950 dark:hover:bg-cyan-300"
            >
              Explore Articles
              <svg className="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="flex flex-col items-center text-slate-600 dark:text-slate-300">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </div>
    </section>
  );
}
