'use client';

import type { JSX } from 'react';

import {
  PORTAL_BIENVENIDA_PASO_CITA,
  PORTAL_BIENVENIDA_PASO_PAGO,
  PORTAL_BIENVENIDA_PASO_PORTAL,
  PORTAL_BIENVENIDA_PASO_TARIFAS,
} from '@/lib/portal/onboarding-copy';
import { cn } from '@/lib/utils';

const STEPS: readonly { n: 1 | 2 | 3 | 4; label: string; detail: string }[] = [
  { n: 1, label: PORTAL_BIENVENIDA_PASO_TARIFAS, detail: 'Vista rápida en la web y resumen bajo' },
  { n: 2, label: PORTAL_BIENVENIDA_PASO_PAGO, detail: 'Bonos o prepago al confirmar cita' },
  { n: 3, label: PORTAL_BIENVENIDA_PASO_CITA, detail: 'Elige servicio, día y hora' },
  { n: 4, label: PORTAL_BIENVENIDA_PASO_PORTAL, detail: 'Mensajes, recursos, ajustes' },
] as const;

/**
 * Pista visual de fases: no reemplaza el gate del servidor, solo guía.
 */
export default function PortalBienvenidaStepper({ className }: { readonly className?: string }): JSX.Element {
  return (
    <div className={cn('grid grid-cols-1 gap-3 sm:grid-cols-2', className)}>
      {STEPS.map((s) => (
        <div
          key={s.n}
          className="flex gap-3 rounded-2xl border border-ink/8 bg-white/40 p-3 ring-1 ring-inset ring-white/30 dark:border-white/10 dark:bg-white/[0.04] dark:ring-white/5"
        >
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/12 font-body text-[0.78rem] font-semibold text-primary tabular-nums dark:bg-primary/20 dark:text-primary"
            aria-hidden
          >
            {s.n}
          </span>
          <div className="min-w-0">
            <p className="font-body text-[0.82rem] font-semibold text-ink dark:text-white">{s.label}</p>
            <p className="mt-0.5 font-body text-[0.7rem] leading-relaxed text-ink-muted dark:text-white/50">
              {s.detail}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
