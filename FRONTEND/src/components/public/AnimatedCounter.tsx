'use client';

import { useRef, useState, useEffect } from 'react';
import { useInView } from 'framer-motion';

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
 * A real-time counting animation that triggers when the element scrolls into view.
 * Counts from 0 to the target number with an easeOut curve for a decelerating finish.
 */
export default function AnimatedCounter({
  target,
  duration = 2000,
  prefix = '',
  suffix = '',
  className = '',
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: false, amount: 0.5 });
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (!isInView) {
      // Reset when out of view so it re-animates when scrolled back
      setCount(0);
      setHasAnimated(false);
      return;
    }

    if (hasAnimated) return;
    setHasAnimated(true);

    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // easeOutQuart for a satisfying deceleration
      const eased = 1 - Math.pow(1 - progress, 4);
      const currentValue = Math.round(eased * target);

      setCount(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [isInView, target, duration, hasAnimated]);

  return (
    <span ref={ref} className={className}>
      {prefix}{count}{suffix}
    </span>
  );
}
