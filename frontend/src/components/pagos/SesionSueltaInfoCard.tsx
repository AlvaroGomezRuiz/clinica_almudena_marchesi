import Link from 'next/link';

import { SurfaceCard } from '@/components/portal-shell/ui';

interface Props {
  readonly titulo: string;
  readonly descripcion: string;
  /** Precio en céntimos. */
  readonly precioCentimos: number;
  /** Preselección en el selector de reserva. */
  readonly servicioId?: string;
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
  servicioId,
}: Props): JSX.Element {
  const reservarHref =
    servicioId != null && servicioId.length > 0
      ? `/portal/citas/reservar?servicio=${encodeURIComponent(servicioId)}`
      : '/portal/citas/reservar';
  return (
    <SurfaceCard variant="glass" className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-0 flex-1 flex-col">
        <p className="shrink-0 font-body text-[0.62rem] uppercase tracking-[0.18em] text-ink-muted dark:text-white/65">
          Sesión suelta
        </p>
        <h3 className="mt-1 shrink-0 font-display text-[1.2rem] italic text-ink dark:text-white">
          {titulo}
        </h3>
        <p className="mt-2 shrink-0 font-body text-[0.85rem] leading-relaxed text-ink-soft dark:text-white/75">
          {descripcion}
        </p>
        <div className="min-h-[1rem] flex-1" aria-hidden="true" />
        <p className="mt-4 shrink-0 font-display text-[1.5rem] italic tabular-nums text-primary dark:text-primary-fixed-dim">
          {euro(precioCentimos)}
          <span className="ml-1 font-body text-[0.8rem] font-normal not-italic text-ink-muted dark:text-white/70">
            / sesión
          </span>
        </p>
      </div>
      <div className="mt-5 shrink-0">
        <Link
          href={reservarHref}
          className="group relative inline-flex w-full items-center justify-center rounded-full bg-white/75 px-5 py-2.5 font-display text-[0.84rem] font-medium tracking-tight text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_8px_22px_-10px_rgba(75,100,95,0.18)] ring-1 ring-inset ring-white/50 backdrop-blur-md transition-[transform,box-shadow,background-color] duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:bg-white active:scale-[0.97] dark:bg-white/[0.12] dark:text-white dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] dark:ring-white/20 dark:hover:bg-white/[0.18]"
        >
          <span className="whitespace-nowrap text-center">Reservar cita (pago al agendar)</span>
        </Link>
      </div>
    </SurfaceCard>
  );
}
