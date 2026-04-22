import Link from 'next/link';

import { SurfaceCard } from '@/components/portal-shell/ui';

interface Props {
  readonly titulo: string;
  readonly descripcion: string;
  /** Precio en céntimos. */
  readonly precioCentimos: number;
}

function euro(c: number): string {
  return (c / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

/**
 * Muestra precio de sesión suelta. El pago se asocia a la cita al reservar
 * (flujo `preparar_checkout_cita` / Payment Element con `cita_id`).
 */
export default function SesionSueltaInfoCard({
  titulo,
  descripcion,
  precioCentimos,
}: Props): JSX.Element {
  return (
    <SurfaceCard variant="glass" className="h-full">
      <p className="font-body text-[0.62rem] uppercase tracking-[0.18em] text-ink-muted dark:text-white/50">
        Sesión suelta
      </p>
      <h3 className="mt-1 font-display text-[1.2rem] italic text-ink dark:text-white">
        {titulo}
      </h3>
      <p className="mt-2 font-body text-[0.85rem] leading-relaxed text-ink-soft dark:text-white/65">
        {descripcion}
      </p>
      <p className="mt-4 font-display text-[1.5rem] italic tabular-nums text-primary">
        {euro(precioCentimos)}
        <span className="ml-1 font-body text-[0.8rem] font-normal not-italic text-ink-muted dark:text-white/50">
          / sesión
        </span>
      </p>
      <div className="mt-5">
        <Link
          href="/portal/citas/reservar"
          className="group relative inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-white/75 pl-5 pr-1.5 py-1.5 font-display text-[0.84rem] font-medium tracking-tight text-ink ring-1 ring-inset ring-white/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_8px_22px_-10px_rgba(75,100,95,0.18)] transition-[transform,box-shadow,background-color] duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:bg-white active:scale-[0.97] backdrop-blur-md dark:bg-white/[0.06] dark:text-white dark:ring-white/10 dark:hover:bg-white/[0.1]"
        >
          <span className="whitespace-nowrap">Reservar cita (pago al agendar)</span>
          <span
            className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary group-hover:bg-primary/15 dark:bg-primary/30 dark:text-white dark:group-hover:bg-primary/40"
            aria-hidden="true"
          >
            <span className="material-symbols-outlined text-[1.1rem]">event_available</span>
          </span>
        </Link>
      </div>
    </SurfaceCard>
  );
}
