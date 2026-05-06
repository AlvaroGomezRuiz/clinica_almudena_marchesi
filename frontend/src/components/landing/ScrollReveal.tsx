'use client';

import { useEffect, useRef, useState, type CSSProperties, type JSX } from 'react';

type ScrollRevealProps = {
  children: React.ReactNode;
  className?: string;
  /** Distance to translate from (px). Default 40 */
  offset?: number;
  /** Animation duration in seconds. Default 0.8 */
  duration?: number;
  /** Stagger delay in seconds. Default 0 */
  delay?: number;
  /** Direction of the reveal. Default 'up' */
  direction?: 'up' | 'down' | 'left' | 'right';
  /** Scale effect on entry. Default 1 (no scale) */
  scale?: number;
  /** Custom element tag. Default 'div' */
  as?: keyof JSX.IntrinsicElements;
};

const directionMap: Record<string, { x: number; y: number }> = {
  up: { x: 0, y: 1 },
  down: { x: 0, y: -1 },
  left: { x: 1, y: 0 },
  right: { x: -1, y: 0 },
};

/**
 * Reveal bidireccional basado en IntersectionObserver + CSS transitions.
 *
 * Estrategia SSR-safe:
 * 1. En SSR el componente se renderiza VISIBLE (opacity 1, sin transform).
 * 2. Al montar en el cliente, si el elemento NO está en viewport se oculta
 *    inmediatamente y queda preparado para animarse al entrar.
 * 3. Si el elemento YA está en viewport al montar (primer fold, subpáginas),
 *    se mantiene visible y NO se oculta nunca.
 *
 * Nota: soporta prefers-reduced-motion (elimina transform y filter).
 */
export default function ScrollReveal({
  children,
  className,
  offset = 40,
  duration = 0.8,
  delay = 0,
  direction = 'up',
  scale = 1,
  as = 'div',
}: ScrollRevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  // Start as 'visible' for SSR. Client will evaluate on mount.
  const [state, setState] = useState<'visible' | 'hidden' | 'mounted'>('visible');

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mql.matches);
    const handler = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const dir = directionMap[direction] ?? directionMap.up;
  const initialTransform = `translate3d(${dir.x * offset}px, ${dir.y * offset}px, 0) scale(${scale < 1 ? scale : 1})`;

  useEffect(() => {
    const node = ref.current;
    if (!node || reduceMotion) return;

    if (typeof IntersectionObserver === 'undefined') {
      setState('visible');
      return;
    }

    // On mount: check if element is currently in viewport
    const rect = node.getBoundingClientRect();
    const isCurrentlyVisible = rect.top < window.innerHeight && rect.bottom > 0;

    if (!isCurrentlyVisible) {
      // Element is below the fold → hide it immediately (no transition)
      setState('hidden');
    }
    // If already visible, keep 'visible' state from SSR → no flash

    // After a frame, mark already-visible elements as 'mounted' so they
    // get proper transition rules for when they scroll OUT and back IN
    requestAnimationFrame(() => {
      setState(prev => prev === 'visible' ? 'mounted' : prev);
    });

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setState(entry.isIntersecting ? 'mounted' : 'hidden');
        }
      },
      { threshold: [0, 0.1] },
    );

    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  const Tag = as as React.ElementType;

  if (reduceMotion) {
    return <Tag className={className}>{children}</Tag>;
  }

  let style: CSSProperties;

  if (state === 'visible') {
    // SSR state or already-in-viewport: fully visible, no transition yet
    style = {};
  } else if (state === 'hidden') {
    // Below fold or scrolled out: hidden, no transition (instant hide)
    style = {
      opacity: 0,
      transform: initialTransform,
    };
  } else {
    // 'mounted' — transitioning to visible
    style = {
      opacity: 1,
      transform: 'translate3d(0,0,0) scale(1)',
      transition: `opacity ${duration}s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s, transform ${duration}s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s`,
      willChange: 'opacity, transform',
    };
  }

  return (
    <Tag ref={ref as never} className={className} style={style}>
      {children}
    </Tag>
  );
}
