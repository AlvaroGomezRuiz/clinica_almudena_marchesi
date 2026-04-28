import type { JSX } from 'react';

import {
  PORTAL_BIENVENIDA_PASO_CITA,
  PORTAL_BIENVENIDA_PASO_PAGO,
  PORTAL_BIENVENIDA_PASO_PORTAL,
  PORTAL_BIENVENIDA_PASO_TARIFAS,
} from '@/lib/portal/onboarding-copy';
import { cn } from '@/lib/utils';

const STEPS: readonly { readonly n: 1 | 2 | 3 | 4; readonly label: string; readonly detail: string }[] = [
  { n: 1, label: PORTAL_BIENVENIDA_PASO_TARIFAS, detail: 'Consulta tarifas en la web y aquí en Bonos y pagos.' },
  { n: 2, label: PORTAL_BIENVENIDA_PASO_PAGO, detail: 'Stripe: bonos o prepago al confirmar la cita.' },
  { n: 3, label: PORTAL_BIENVENIDA_PASO_CITA, detail: 'Elige servicio, día y hora en Citas → Reservar.' },
  { n: 4, label: PORTAL_BIENVENIDA_PASO_PORTAL, detail: 'Tras activar: Mensajes, Recursos y Ajustes al completo.' },
] as const;

interface PortalBienvenidaStepperProps {
  readonly className?: string;
}

/**
 * Línea de flujo (4 pasos) con cards: guía de pago/reserva, sin sustituir el gate del servidor.
 */
export default function PortalBienvenidaStepper({ className }: PortalBienvenidaStepperProps): JSX.Element {
  return (
    <section aria-labelledby="portal-flujo-pago-heading" className={cn('flex flex-col gap-5', className)}>
      <div>
        <h2
          id="portal-flujo-pago-heading"
          className="font-display text-[1rem] font-semibold tracking-tight text-ink dark:text-white"
        >
          Flujo para pagar y empezar
        </h2>
        <p className="mt-1 font-body text-[0.82rem] leading-relaxed text-ink-soft dark:text-white/65">
          Cuatro pasos en orden; puedes comprar bono primero o reservar y pagar al confirmar.
        </p>
      </div>

      {/* Desktop: línea horizontal + puntos */}
      <div className="relative hidden md:block">
        <div
          aria-hidden
          className="absolute left-[8%] right-[8%] top-[1.125rem] h-px bg-gradient-to-r from-ink/10 via-primary/35 to-ink/10 dark:from-white/10 dark:via-primary-fixed/40 dark:to-white/10"
        />
        <ol className="relative grid grid-cols-4 gap-3">
          {STEPS.map((s) => (
            <li key={s.n} className="flex flex-col items-center text-center">
              <span
                className="relative z-[1] flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/40 bg-canvas font-body text-[0.78rem] font-semibold text-primary shadow-sm ring-2 ring-primary/15 dark:border-white/15 dark:bg-[#1a1a18] dark:text-primary-fixed dark:ring-primary-fixed/25"
                aria-hidden
              >
                {s.n}
              </span>
              <div className="mt-4 w-full rounded-2xl border border-ink/8 bg-white/40 p-3 text-left ring-1 ring-inset ring-white/30 dark:border-white/10 dark:bg-white/[0.04] dark:ring-white/5">
                <p className="font-body text-[0.78rem] font-semibold text-ink dark:text-white">{s.label}</p>
                <p className="mt-1.5 font-body text-[0.68rem] leading-relaxed text-ink-muted dark:text-white/55">
                  {s.detail}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Móvil: lista vertical con conector */}
      <ol className="relative flex flex-col gap-0 md:hidden">
        <span
          aria-hidden
          className="absolute left-[1.125rem] top-3 bottom-3 w-px bg-gradient-to-b from-primary/30 via-primary/20 to-primary/30 dark:from-primary-fixed/35 dark:via-primary-fixed/20 dark:to-primary-fixed/35"
        />
        {STEPS.map((s) => (
          <li key={s.n} className="relative flex gap-3 pb-6 last:pb-0">
            <span
              className="relative z-[1] flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/40 bg-canvas font-body text-[0.78rem] font-semibold text-primary shadow-sm ring-2 ring-primary/15 dark:border-white/15 dark:bg-[#1a1a18] dark:text-primary-fixed dark:ring-primary-fixed/25"
              aria-hidden
            >
              {s.n}
            </span>
            <div className="min-w-0 flex-1 rounded-2xl border border-ink/8 bg-white/40 p-3 ring-1 ring-inset ring-white/30 dark:border-white/10 dark:bg-white/[0.04] dark:ring-white/5">
              <p className="font-body text-[0.82rem] font-semibold text-ink dark:text-white">{s.label}</p>
              <p className="mt-1 font-body text-[0.7rem] leading-relaxed text-ink-muted dark:text-white/55">
                {s.detail}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
