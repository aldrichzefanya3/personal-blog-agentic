import Link from 'next/link';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] dark:border-slate-700 dark:bg-[linear-gradient(180deg,#020817_0%,#0f172a_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-5 sm:flex-row">
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              © {currentYear} My Blog.
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Notes, ideas, and stories written with care.
            </p>
          </div>

          <nav aria-label="Footer navigation">
            <ul className="flex items-center gap-5 text-sm font-medium">
              <li>
                <Link
                  href="/about"
                  className="text-slate-600 transition-colors hover:text-cyan-700 focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:outline-none dark:text-slate-300 dark:hover:text-cyan-300"
                >
                  About
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
