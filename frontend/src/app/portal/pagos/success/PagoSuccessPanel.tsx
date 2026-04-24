'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { Button, SurfaceCard } from '@/components/portal-shell/ui';
import { createBrowserClient } from '@/lib/supabase/client';

export interface PagoSuccessRow {
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

interface Props {
  readonly initialPago: PagoSuccessRow | null;
  readonly sessionId: string | undefined;
  readonly paymentIntentId: string | undefined;
}

const POLL_MS = 1600;
const MAX_POLLS = 32;

/**
 * Muestra importe/CTA del pago y, si aún no hay fila (webhook en curso),
 * reintenta vía API Supabase en el cliente (RLS permite leer "pagos" del paciente).
 */
export default function PagoSuccessPanel({
  initialPago,
  sessionId,
  paymentIntentId,
}: Props): JSX.Element {
  const [pago, setPago] = useState<PagoSuccessRow | null>(initialPago);
  const [gaveUp, setGaveUp] = useState(false);

  const hasQueryKey = Boolean(sessionId) || Boolean(paymentIntentId);
  const canPoll = !pago && hasQueryKey && !gaveUp;

  const fetchPago = useCallback(async () => {
    if (!sessionId && !paymentIntentId) return;
    const supabase = createBrowserClient();
    let request = supabase
      .from('pagos')
      .select('id, importe_centimos, moneda, metodo, cita_id, bono_id, fecha_pago');
    if (sessionId) {
      request = request.eq('stripe_session_id', sessionId);
    } else {
      request = request.eq('stripe_payment_intent', paymentIntentId as string);
    }
    const { data, error } = await request.maybeSingle<PagoSuccessRow>();
    if (error) return;
    if (data) setPago(data);
  }, [sessionId, paymentIntentId]);

  useEffect(() => {
    if (!canPoll) return;
    void fetchPago();
    let n = 0;
    const t = setInterval(() => {
      n += 1;
      void fetchPago();
      if (n >= MAX_POLLS) {
        setGaveUp(true);
        clearInterval(t);
      }
    }, POLL_MS);
    return () => clearInterval(t);
  }, [canPoll, fetchPago]);

  return (
    <SurfaceCard variant="hero" bezel glow="sage">
      <div className="grid gap-4 md:grid-cols-[auto,1fr] md:items-center">
        <span
          aria-hidden="true"
          className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-sage/15 md:mx-0"
        >
          <span className="material-symbols-outlined text-[2rem] text-sage-dark">task_alt</span>
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
                <p className="mt-1 font-body text-[0.82rem] text-ink-soft">Vía {pago.metodo}</p>
              ) : null}
            </>
          ) : (
            <>
              <p className="font-display text-[1.35rem] italic text-ink">Procesando…</p>
              <p className="mt-1 font-body text-[0.85rem] text-ink-soft">
                {hasQueryKey
                  ? gaveUp
                    ? 'El pago puede tardar un minuto. Revisa en Bonos y pagos o actualiza la página.'
                    : 'Conectando con el registro de tu pago…'
                  : 'Entra a esta pantalla desde el enlace al finalizar el pago, o consulta el historial en Bonos y pagos.'}
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
  );
}
