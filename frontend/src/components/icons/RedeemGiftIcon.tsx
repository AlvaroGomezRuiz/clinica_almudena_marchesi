import type { JSX } from 'react';

import { cn } from '@/lib/utils';

/** Mismo trazo que `public/fonts/RedeemGiftIcon.svg` — inline para `fill="currentColor"` real en UI. */
const REDEEM_PATH =
  'M160-280v80h640v-80H160Zm0-440h88q-5-9-6.5-19t-1.5-21q0-50 35-85t85-35q30 0 55.5 15.5T460-826l20 26 20-26q18-24 44-39t56-15q50 0 85 35t35 85q0 11-1.5 21t-6.5 19h88q33 0 56.5 23.5T880-640v440q0 33-23.5 56.5T800-120H160q-33 0-56.5-23.5T80-200v-440q0-33 23.5-56.5T160-720Zm0 320h640v-240H596l84 114-64 46-136-184-136 184-64-46 82-114H160v240Zm228.5-331.5Q400-743 400-760t-11.5-28.5Q377-800 360-800t-28.5 11.5Q320-777 320-760t11.5 28.5Q343-720 360-720t28.5-11.5ZM600-720q17 0 28.5-11.5T640-760q0-17-11.5-28.5T600-800q-17 0-28.5 11.5T560-760q0 17 11.5 28.5T600-720Z' as const;

/**
 * Icono regalo / canje. El archivo `public/fonts/RedeemGiftIcon.svg` se mantiene alineado para otros usos;
 * aquí va inline para que `currentColor` siga al texto del contenedor (claro/oscuro).
 */
export function RedeemGiftIcon({
  className,
  title,
}: {
  readonly className?: string;
  readonly title?: string;
}): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 -960 960 960"
      className={cn('shrink-0', className)}
      width={24}
      height={24}
      fill="currentColor"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      <path d={REDEEM_PATH} />
    </svg>
  );
}
