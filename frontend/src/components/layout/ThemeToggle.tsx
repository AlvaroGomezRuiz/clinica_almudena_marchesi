'use client';

/**
 * ThemeToggle — selector de tema claro / oscuro.
 *
 * Se apoya en next-themes (ya inicializado en src/app/layout.tsx con
 * attribute="class"). Render SSR-safe: mientras `mounted === false`
 * devolvemos un placeholder del mismo tamaño para evitar hydration mismatch.
 *
 * Variantes:
 *   - compact:   un único botón BINARIO. Un click alterna claro ↔ oscuro
 *                sin pasar por "system" (UX solicitada por el cliente).
 *   - segmented: tres botones horizontales (claro / oscuro / sistema) para
 *                usuarios avanzados en /portal/ajustes y /admin/configuracion.
 */

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

type Variant = 'compact' | 'segmented';

interface ThemeToggleProps {
  readonly variant?: Variant;
  readonly className?: string;
}

type Mode = 'light' | 'dark' | 'system';
const ORDER: readonly Mode[] = ['light', 'dark', 'system'];

function iconFor(mode: Mode): string {
  return mode === 'dark' ? 'dark_mode' : mode === 'light' ? 'light_mode' : 'computer';
}

function labelFor(mode: Mode): string {
  return mode === 'dark' ? 'Oscuro' : mode === 'light' ? 'Claro' : 'Sistema';
}

export default function ThemeToggle({ variant = 'compact', className = '' }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const current = (theme as Mode | undefined) ?? 'system';

  if (!mounted) {
    // Placeholder SSR-safe con las mismas dimensiones que el control real
    const skeleton =
      variant === 'compact'
        ? 'size-11 rounded-full bg-white/40 ring-1 ring-inset ring-ink/8'
        : 'h-11 w-full max-w-[280px] rounded-full bg-white/40 ring-1 ring-inset ring-ink/8';
    return <span aria-hidden="true" className={`${skeleton} ${className}`} />;
  }

  if (variant === 'segmented') {
    return (
      <div
        role="radiogroup"
        aria-label="Tema"
        className={`flex w-full flex-wrap items-stretch justify-center gap-1 rounded-full bg-white/60 p-1 ring-1 ring-inset ring-ink/8 backdrop-blur-md dark:bg-white/5 dark:ring-white/10 sm:flex-nowrap sm:justify-stretch ${className}`}
      >
        {ORDER.map((mode) => {
          const active = current === mode;
          return (
            <button
              key={mode}
              role="radio"
              aria-checked={active}
              type="button"
              onClick={() => setTheme(mode)}
              className={`inline-flex min-w-0 flex-1 basis-[30%] items-center justify-center gap-1 rounded-full px-2 py-2 font-body text-[0.62rem] uppercase tracking-[0.1em] transition-[background-color,color] duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] sm:basis-0 sm:px-3 sm:text-[0.72rem] sm:tracking-[0.14em] ${
                active
                  ? 'bg-primary/12 text-primary dark:bg-primary/25 dark:text-white'
                  : 'text-ink-soft hover:text-ink dark:text-white/60 dark:hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined shrink-0 text-[1rem]" aria-hidden="true">
                {iconFor(mode)}
              </span>
              <span className="truncate">{labelFor(mode)}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Variante compacta: binaria. El tema "efectivo" se calcula siempre a partir
  // de resolvedTheme (que ya resuelve 'system' al modo real del SO). Un click
  // escribe el OPUESTO, de modo que siempre se alterna a la primera.
  const effective: 'light' | 'dark' =
    (resolvedTheme as 'light' | 'dark' | undefined) ?? 'light';
  const nextBinary: 'light' | 'dark' = effective === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(nextBinary)}
      aria-label={`Cambiar a modo ${labelFor(nextBinary).toLowerCase()} (actual: ${labelFor(effective)})`}
      title={`Tema actual: ${labelFor(effective)} · click para ${labelFor(nextBinary).toLowerCase()}`}
      className={`group grid size-11 min-h-[44px] min-w-[44px] place-items-center rounded-full bg-white/55 ring-1 ring-inset ring-ink/10 backdrop-blur-md transition-[background-color,box-shadow] duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:bg-white/80 dark:bg-white/5 dark:ring-white/10 dark:hover:bg-white/10 ${className}`}
    >
      <span
        className="material-symbols-outlined text-[1.1rem] text-ink-soft group-hover:text-primary transition-colors dark:text-white/70 dark:group-hover:text-white"
        aria-hidden="true"
      >
        {iconFor(effective)}
      </span>
    </button>
  );
}
