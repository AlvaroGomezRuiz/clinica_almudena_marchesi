'use client';

import { useRef } from 'react';
import {
  motion,
  useInView,
  useReducedMotion,
  type Variant,
} from 'framer-motion';

type ScrollRevealProps = {
  children: React.ReactNode;
  className?: string;
  /** Distance to translate from (px). Default 40 */
  offset?: number;
  /** Animation duration in seconds. Default 0.8 */
  duration?: number;
  /** Stagger delay in seconds (for use inside a parent). Default 0 */
  delay?: number;
  /** How much of the element must be visible. Default 0.15 */
  amount?: number;
  /** Direction of the reveal. Default 'up' */
  direction?: 'up' | 'down' | 'left' | 'right';
  /** Scale effect on entry. Default 1 (no scale) */
  scale?: number;
  /** Custom element tag. Default 'div' */
  as?: keyof JSX.IntrinsicElements;
};

const directionMap: Record<string, { x?: number; y?: number }> = {
  up: { y: 1 },
  down: { y: -1 },
  left: { x: 1 },
  right: { x: -1 },
};

/**
 * Apple iPhone 17 Pro-style bidirectional scroll reveal.
 * Elements reveal when scrolling down into view and hide when scrolling back up.
 * Uses `once: false` so the animation replays every time the element enters/exits.
 */
export default function ScrollReveal({
  children,
  className,
  offset = 40,
  duration = 0.8,
  delay = 0,
  amount = 0.15,
  direction = 'up',
  scale = 1,
  as = 'div',
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const isInView = useInView(ref, {
    once: false,
    amount,
  });

  if (reduceMotion) {
    const Tag = as as React.ElementType;
    return <Tag className={className}>{children}</Tag>;
  }

  const dir = directionMap[direction] || directionMap.up;

  const hidden: Variant = {
    opacity: 0,
    x: (dir.x ?? 0) * offset,
    y: (dir.y ?? 0) * offset,
    scale: scale < 1 ? scale : 1,
    filter: 'blur(4px)',
  };

  const visible: Variant = {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
  };

  const Component = motion[as as keyof typeof motion] as React.ElementType;

  return (
    <Component
      ref={ref}
      className={className}
      initial={hidden}
      animate={isInView ? visible : hidden}
      transition={{
        duration,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </Component>
  );
}
