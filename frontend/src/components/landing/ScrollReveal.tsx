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
  /** How much of the element must be visible. Default 0.15 */
  amount?: number;
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
 * Reemplaza la versión anterior que usaba framer-motion (~50 KB) para ahorrar
 * peso en el bundle público sin cambio visual.
 *
 * Nota: soporta prefers-reduced-motion (elimina transform y filter).
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
  const ref = useRef<HTMLElement | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mql.matches);
    const handler = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const dir = directionMap[direction] ?? directionMap.up;
  const initialTransform = `translate3d(${dir.x * offset}px, ${dir.y * offset}px, 0) scale(${scale < 1 ? scale : 1})`;
  const visibleTransform = 'translate3d(0,0,0) scale(1)';

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    /* Si el navegador no soporta IntersectionObserver (muy raro) → se muestra sin animar. */
    if (typeof IntersectionObserver === 'undefined') {
      node.style.opacity = '1';
      node.style.transform = visibleTransform;
      node.style.filter = 'blur(0px)';
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const isVisible = entry.isIntersecting && entry.intersectionRatio >= amount;
          if (node) {
            node.style.opacity = isVisible ? '1' : '0';
            node.style.transform = isVisible ? visibleTransform : initialTransform;
            node.style.filter = isVisible ? 'blur(0px)' : 'blur(4px)';
          }
        }
      },
      { threshold: [0, amount, 1] },
    );
    observer.observe(node);

    /* Verificación inmediata: si el elemento ya está en viewport al montar
       (ej. hero, primer fold), lo revelamos sin esperar al callback del IO. */
    const rect = node.getBoundingClientRect();
    const inViewport = rect.top < window.innerHeight && rect.bottom > 0;
    if (inViewport) {
      /* Defer para que la transición CSS arranque tras el primer frame. */
      requestAnimationFrame(() => {
        if (node) {
          node.style.opacity = '1';
          node.style.transform = visibleTransform;
          node.style.filter = 'blur(0px)';
        }
      });
    }

    return () => observer.disconnect();
  }, [amount, initialTransform, visibleTransform]);

  const Tag = as as React.ElementType;

  /* Reduced-motion: render simple sin transform ni blur. */
  if (reduceMotion) {
    return <Tag className={className}>{children}</Tag>;
  }

  const initialStyle: CSSProperties = {
    opacity: 0,
    transform: initialTransform,
    filter: 'blur(4px)',
    transition: `opacity ${duration}s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s, transform ${duration}s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s, filter ${duration}s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s`,
    willChange: 'opacity, transform',
  };

  return (
    <Tag ref={ref as never} className={className} style={initialStyle}>
      {children}
    </Tag>
  );
}
