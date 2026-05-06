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
  /** If true, the animation starts immediately on mount without IntersectionObserver */
  autoStart?: boolean;
};

/**
 * Contador con easeOutQuart en requestAnimationFrame.
 * Usa IntersectionObserver + fallback setTimeout para sticky sections.
 */
export default function AnimatedCounter({
  target,
  duration = 2000,
  prefix = '',
  suffix = '',
  className = '',
  autoStart = false,
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

    const startAnimation = () => {
      animatingRef.current = true;
      const startTime = performance.now();
      const step = (now: number) => {
        if (!animatingRef.current) return;
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 4);
        setCount(Math.round(eased * target));
        if (progress < 1) {
          requestAnimationFrame(step);
        }
      };
      requestAnimationFrame(step);
    };

    if (autoStart) {
      startAnimation();
      return () => {
        animatingRef.current = false;
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            startAnimation();
          } else {
            setCount(0);
            animatingRef.current = false;
          }
        }
      },
      { threshold: [0, 0.1] },
    );

    observer.observe(node);

    const fallbackTimer = setTimeout(() => {
      if (animatingRef.current) return;
      const rect = node.getBoundingClientRect();
      const inViewport = rect.top < window.innerHeight && rect.bottom > 0;
      if (inViewport) startAnimation();
    }, 500);

    return () => {
      observer.disconnect();
      clearTimeout(fallbackTimer);
      animatingRef.current = false;
    };
  }, [target, duration, autoStart]);

  return (
    <span ref={ref} className={className}>
      {prefix}{autoStart ? target : count}{suffix}
    </span>
  );
}
