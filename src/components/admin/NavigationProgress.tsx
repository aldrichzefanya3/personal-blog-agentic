/**
 * Navigation progress bar for admin panel.
 *
 * Renders a thin animated progress bar at the top of the page during
 * client-side route transitions, giving immediate visual feedback that the
 * navigation is in progress — the hallmark of a SPA-like experience.
 *
 * Uses Next.js `useRouter` events via the navigation hooks pattern:
 * - Listens to link clicks on the document and marks the bar "loading"
 * - Resolves once the new page has mounted (pathname change)
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

export function NavigationProgress() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const prevPathname = useRef(pathname);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Start the bar whenever any navigation link is clicked
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = (e.target as Element).closest('a');
      if (!target) return;
      const href = target.getAttribute('href');
      // Only intercept same-origin, non-hash navigations
      if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto:')) return;

      setLoading(true);
      setProgress(10);
    }

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Animate the bar forward while loading
  useEffect(() => {
    if (loading) {
      intervalRef.current = setInterval(() => {
        setProgress((p) => {
          // Slow down asymptotically towards 90%
          if (p >= 90) return p;
          const increment = (90 - p) * 0.08;
          return p + Math.max(increment, 0.5);
        });
      }, 100);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loading]);

  // Detect when the navigation has completed (pathname changed) and finish the bar
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      if (loading) {
        setProgress(100);
        timeoutRef.current = setTimeout(() => {
          setLoading(false);
          setProgress(0);
        }, 400);
      }
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [pathname, loading]);

  if (!loading && progress === 0) return null;

  return (
    <div
      role="progressbar"
      aria-label="Page loading"
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none"
    >
      <div
        className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500 transition-all ease-out shadow-[0_0_10px_rgba(99,179,237,0.8)]"
        style={{
          width: `${progress}%`,
          transitionDuration: progress === 100 ? '200ms' : '300ms',
          opacity: progress === 100 ? 0 : 1,
        }}
      />
    </div>
  );
}
