import type { JSX } from 'react';

import { cn } from '@/lib/utils';

const REDEEM_SRC = '/fonts/RedeemGiftIcon.svg' as const;

/**
 * Icono regalo / canje — asset en `public/fonts/RedeemGiftIcon.svg`.
 * Para que herede color del texto en claro/oscuro, el SVG puede usar `fill="currentColor"`.
 */
export function RedeemGiftIcon({
  className,
  title,
}: {
  readonly className?: string;
  readonly title?: string;
}): JSX.Element {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- SVG estático en /public, sin optimización raster
    <img
      src={REDEEM_SRC}
      alt={title ?? ''}
      width={24}
      height={24}
      decoding="async"
      className={cn('shrink-0 object-contain', className)}
      aria-hidden={title ? undefined : true}
    />
  );
}
