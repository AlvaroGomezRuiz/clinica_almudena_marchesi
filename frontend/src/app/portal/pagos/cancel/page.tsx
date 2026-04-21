import Link from 'next/link';

import {
  Button,
  PageHeader,
  SurfaceCard,
} from '@/components/portal-shell/ui';

export const metadata = { title: 'Pago cancelado | Portal Paciente' };
export const dynamic = 'force-dynamic';

interface Props {
  readonly searchParams: Promise<{ cita_id?: string }>;
}

export default async function PagoCancelPage({ searchParams }: Props) {
  const sp = await searchParams;
  const citaPendiente = Boolean(sp.cita_id);

  return (
    <>
      <PageHeader
        eyebrow="Pago cancelado"
        title="No se ha completado el pago"
        description={
          citaPendiente
            ? 'Tu hueco sigue reservado durante 15 minutos. Puedes reintentar el pago o elegir otra hora.'
            : 'No se ha cobrado nada. Puedes volver al listado cuando quieras.'
        }
      />

      <SurfaceCard>
        <div className="flex items-start gap-4">
          <span
            aria-hidden="true"
            className="mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-full bg-warm/15"
          >
            <span className="material-symbols-outlined text-[1.3rem] text-warm">
              info
            </span>
          </span>
          <div>
            <h2 className="font-display text-[1.2rem] italic text-ink">
              Sin cargo realizado
            </h2>
            <p className="mt-1 font-body text-[0.9rem] text-ink-soft">
              Stripe ha cancelado la operación antes de procesar la tarjeta. Si fue un error,
              reintenta desde el botón de abajo.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/portal/citas/reservar">
            <Button variant="primary" icon="event">
              Elegir otra hora
            </Button>
          </Link>
          <Link href="/portal/pagos">
            <Button variant="surface" icon="credit_card">
              Bonos y pagos
            </Button>
          </Link>
        </div>
      </SurfaceCard>
    </>
  );
}
