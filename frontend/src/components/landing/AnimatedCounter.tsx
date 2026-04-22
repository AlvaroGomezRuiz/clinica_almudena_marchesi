'use client';

import { useEffect, useRef, useState } from 'react';

type AnimatedCounterProps = {
  /** Final number to count to */
  target: number;
  /** Duration of counting animation in milliseconds. Default 2000 */
  duration?: number;
  /** Prefix like "+" to show before the number */
  prefix?: string;
  /** Suffix like "%" to show after the number */
  suffix?: string;
  /** CSS class for the number text */
  className?: string;
};

/**
 * Contador con easeOutQuart en requestAnimationFrame.
 * Antes dependía de framer-motion (useInView). Ahora usa IntersectionObserver
 * nativo para cero coste extra en el bundle público.
 */
export default function AnimatedCounter({
  target,
  duration = 2000,
  prefix = '',
  suffix = '',
  className = '',
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [count, setCount] = useState(0);
  const animatingRef = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === 'undefined') {
      setCount(target);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const inView = entry.isIntersecting && entry.intersectionRatio >= 0.5;

          if (!inView) {
            /* Reset al salir de viewport para re-animar al volver */
            setCount(0);
            animatingRef.current = false;
            continue;
          }

          if (animatingRef.current) continue;
          animatingRef.current = true;

          const startTime = performance.now();
          const step = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 4);
            setCount(Math.round(eased * target));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: [0, 0.5, 1] },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [target, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}{count}{suffix}
    </span>
  );
}
