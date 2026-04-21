'use client';

/**
 * GlowCard — envoltorio que añade un "spotlight" radial que persigue el cursor.
 *
 * Montado como wrapper de SurfaceCard o de cualquier elemento. Usa variables
 * CSS (--mx, --my) actualizadas en `onPointerMove` para que el gradiente viva
 * en la GPU (el layout no se recalcula). El gradiente se apaga en touch /
 * reduced-motion / cuando `disabled` es true.
 */

import { useCallback, useRef, type CSSProperties, type ReactNode } from 'react';

interface GlowCardProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly intensity?: 'subtle' | 'medium' | 'strong';
  readonly radius?: string;
  readonly disabled?: boolean;
  readonly as?: 'div' | 'article' | 'section' | 'li';
}

const INTENSITY_MAP = {
  subtle: { light: 0.08, dark: 0.12, size: 380 },
  medium: { light: 0.14, dark: 0.2, size: 440 },
  strong: { light: 0.22, dark: 0.32, size: 520 },
} as const;

export default function GlowCard({
  children,
  className = '',
  intensity = 'medium',
  radius = '1.625rem',
  disabled = false,
  as: Tag = 'div',
}: GlowCardProps) {
  const ref = useRef<HTMLElement>(null);

  const onMove = useCallback((e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    el.style.setProperty('--my', `${e.clientY - rect.top}px`);
  }, []);

  const cfg = INTENSITY_MAP[intensity];

  const style: CSSProperties = {
    '--glow-r': `${cfg.size}px`,
    '--glow-a': cfg.light,
    '--glow-a-dark': cfg.dark,
    borderRadius: radius,
  } as CSSProperties;

  return (
    <Tag
      ref={ref as never}
      onPointerMove={disabled ? undefined : onMove}
      style={style}
      className={`glow-card ${disabled ? 'glow-card--off' : ''} ${className}`}
      data-glow=""
    >
      {children}
    </Tag>
  );
}
