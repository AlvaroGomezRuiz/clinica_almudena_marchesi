import type { JSX } from 'react';

import { cn } from '@/lib/utils';

/**
 * Icono «ficha / contacto» (sustituto de Material `contact_page`) — trazo, sin fuente variable.
 */
export function ContactFichaIcon({
  className,
  title,
}: {
  readonly className?: string;
  readonly title?: string;
}): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={cn('shrink-0', className)}
      width={24}
      height={24}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.65}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      <rect x="3" y="3" width="14" height="18" rx="2" />
      <circle cx="10" cy="9" r="2.25" fill="currentColor" stroke="none" />
      <path d="M6.5 17.5c0-2 1.55-3.25 3.5-3.25S13.5 15.5 13.5 17.5" />
    </svg>
  );
}
