'use client';

import type { JSX } from 'react';

/**
 * Piezas compartidas del menú móvil editorial (prot. img. 16):
 * fondo oscuro difuminado, tipografía display, enlaces centrados sin iconos.
 */

import Link from 'next/link';

import { cn } from '@/lib/utils';

export interface EditorialMobileNavItem {
  readonly href: string;
  readonly label: string;
  readonly active?: boolean;
  readonly badgeCount?: number;
}

/** Overlay: legible en claro y oscuro (el panel lleva fondo sólido). */
export const EDITORIAL_MOBILE_OVERLAY_CLASS =
  'absolute inset-0 cursor-default bg-ink/[0.48] transition-colors duration-500 dark:bg-[#070605]/85';

/** Panel: tinta en modo claro, blanco en `.dark` (WCAG frente a fondo sólido del panel). */
export const EDITORIAL_MOBILE_PANEL_CLASS =
  'relative z-[70] flex h-full max-h-[100dvh] w-full min-w-0 flex-col px-5 py-3 text-ink sm:px-8 sm:py-4 dark:text-white';

export function EditorialMobileNavLink({
  href,
  label,
  active,
  badgeCount,
  onNavigate,
}: EditorialMobileNavItem & { readonly onNavigate?: () => void }): JSX.Element {
  const hasBadge = typeof badgeCount === 'number' && badgeCount > 0;
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-h-11 w-full max-w-full flex-row items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-center transition-colors active:opacity-85',
        'font-display text-[clamp(0.92rem,4.4vw,1.14rem)] font-medium uppercase tracking-[0.14em]',
        active
          ? 'bg-primary/14 text-primary ring-1 ring-inset ring-primary/28 shadow-none dark:bg-white/12 dark:text-white dark:ring-white/22 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
          : /* text-ink sigue el token (--color-ink → claro en .dark); nunca usar zinc fijo (rompe modo oscuro). */
            'text-ink hover:bg-ink/[0.06] hover:text-ink dark:text-white dark:hover:bg-white/[0.08] dark:hover:text-white',
      )}
    >
      <span className="min-w-0 truncate">{label}</span>
      {hasBadge ? (
        <span
          className="shrink-0 rounded-full bg-[#c94c4c] px-1.5 py-0.5 font-body text-[0.58rem] font-semibold tabular-nums leading-none text-white ring-1 ring-ink/20 dark:ring-white/25"
          aria-label={`${badgeCount} sin leer`}
        >
          {badgeCount > 99 ? '99+' : String(badgeCount)}
        </span>
      ) : null}
    </Link>
  );
}
