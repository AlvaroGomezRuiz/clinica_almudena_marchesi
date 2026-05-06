'use client';

import { ReactLenis, useLenis } from 'lenis/react';
import { ReactNode, useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

function ScrollRestorer() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lenis = useLenis();

  useEffect(() => {
    if (lenis) {
      // Force scroll to top on route change
      lenis.scrollTo(0, { immediate: true });
    }
  }, [pathname, searchParams, lenis]);

  return null;
}

export default function LenisProvider({ children }: { children: ReactNode }) {
  return (
    <ReactLenis root options={{ lerp: 0.1, duration: 1.5, smoothWheel: true }}>
      <Suspense fallback={null}>
        <ScrollRestorer />
      </Suspense>
      {children}
    </ReactLenis>
  );
}
