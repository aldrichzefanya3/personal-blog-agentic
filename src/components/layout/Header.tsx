import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';
import { SearchBar } from './SearchBar';

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 shadow-[0_10px_30px_rgba(15,23,42,0.04)] backdrop-blur-xl transition-shadow duration-200 dark:border-slate-700/80 dark:bg-slate-950/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              className="group inline-flex items-center gap-3 rounded-full focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:outline-none dark:focus:ring-cyan-400"
              aria-label="Go to homepage"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 via-blue-600 to-violet-600 text-sm font-bold text-white shadow-lg shadow-cyan-500/20">
                M
              </span>
              <span className="flex min-w-0 flex-col leading-none">
                <span className="truncate text-lg font-black tracking-tight text-slate-900 transition group-hover:text-cyan-700 dark:text-slate-50 dark:group-hover:text-cyan-300">
                  My Blog
                </span>
                <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  Notes & ideas
                </span>
              </span>
            </Link>
          </div>

          <nav aria-label="Main navigation" className="hidden items-center md:flex">
            <ul className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50/80 p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
              <li>
                <Link
                  href="/"
                  className="rounded-full px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white hover:text-cyan-700 focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:outline-none dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-cyan-300 dark:focus:ring-cyan-400"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="rounded-full px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white hover:text-cyan-700 focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:outline-none dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-cyan-300 dark:focus:ring-cyan-400"
                >
                  About
                </Link>
              </li>
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <div className="w-52 sm:w-64 lg:w-72">
              <SearchBar />
            </div>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
