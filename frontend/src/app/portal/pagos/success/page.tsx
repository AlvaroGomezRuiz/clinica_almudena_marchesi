import Link from 'next/link';

import {
  Button,
  PageHeader,
  SurfaceCard,
} from '@/components/portal-shell/ui';
import { createServerClient } from '@/lib/supabase/server';

export const metadata = { title: 'Pago realizado | Portal Paciente' };
export const dynamic = 'force-dynamic';

interface Props {
  readonly searchParams: Promise<{
    session_id?: string;
    /** Payment Element: Stripe añade ?payment_intent=… al return_url. */
    payment_intent?: string;
    redirect_status?: string;
  }>;
}

interface PagoSuccessRow {
  id: string;
  importe_centimos: number;
  moneda: string;
  metodo: string | null;
  cita_id: string | null;
  bono_id: string | null;
  fecha_pago: string;
}

function euro(c: number): string {
  return (c / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

export default async function PagoSuccessPage({ searchParams }: Props) {
  const sp = await searchParams;
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Stripe y el webhook pueden tardar 1-3s en procesar. Consultamos lo último.
  let pago: PagoSuccessRow | null = null;
  if (sp.session_id) {
    const { data } = await supabase
      .from('pagos')
      .select('id, importe_centimos, moneda, metodo, cita_id, bono_id, fecha_pago')
      .eq('stripe_session_id', sp.session_id)
      .maybeSingle<PagoSuccessRow>();
    pago = data ?? null;
  } else if (sp.payment_intent) {
    const { data } = await supabase
      .from('pagos')
      .select('id, importe_centimos, moneda, metodo, cita_id, bono_id, fecha_pago')
      .eq('stripe_payment_intent', sp.payment_intent)
      .maybeSingle<PagoSuccessRow>();
    pago = data ?? null;
  }

  return (
    <>
      <PageHeader
        eyebrow="Confirmación"
        title="Pago realizado correctamente"
        description={
          pago
            ? 'Hemos recibido tu pago y todo está confirmado. Te hemos enviado también un correo.'
            : 'Tu pago se está procesando. En unos segundos lo verás reflejado en tu cuenta.'
        }
      />

      <SurfaceCard variant="hero" bezel glow="sage">
        <div className="grid gap-4 md:grid-cols-[auto,1fr] md:items-center">
          <span
            aria-hidden="true"
            className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-sage/15 md:mx-0"
          >
            <span className="material-symbols-outlined text-[2rem] text-sage-dark">
              task_alt
            </span>
          </span>
          <div className="text-center md:text-left">
            {pago ? (
              <>
                <p className="font-body text-[0.72rem] uppercase tracking-[0.18em] text-ink-muted">
                  Importe cobrado
                </p>
                <p className="mt-1 font-display text-[2.4rem] italic text-ink tabular-nums tracking-[-0.01em]">
                  {euro(pago.importe_centimos)}
                </p>
                {pago.metodo ? (
                  <p className="mt-1 font-body text-[0.82rem] text-ink-soft">
                    Vía {pago.metodo}
                  </p>
                ) : null}
              </>
            ) : (
              <>
                <p className="font-display text-[1.35rem] italic text-ink">
                  Procesando…
                </p>
                <p className="mt-1 font-body text-[0.85rem] text-ink-soft">
                  Actualiza esta página en 5 segundos.
                </p>
              </>
            )}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3 justify-center md:justify-start">
          {pago?.cita_id ? (
            <Link href={`/portal/citas?reserva=ok&id=${pago.cita_id}`}>
              <Button variant="primary" icon="event_available">
                Ver mi cita
              </Button>
            </Link>
          ) : null}
          {pago?.bono_id ? (
            <Link href="/portal/pagos">
              <Button variant="primary" icon="card_membership">
                Ver mi bono
              </Button>
            </Link>
          ) : null}
          <Link href="/portal">
            <Button variant="surface" icon="home">
              Volver al inicio
            </Button>
          </Link>
        </div>
      </SurfaceCard>
    </>
  );
}
