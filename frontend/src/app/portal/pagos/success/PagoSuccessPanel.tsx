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

/** Resumen desde API Stripe (servidor) si aún no hay fila en `pagos` (webhook retrasado). */
export type StripeResumen = {
  readonly importeCentimos: number;
  readonly moneda: string;
  readonly descripcion: string;
  readonly kind: 'cita' | 'bono';
  readonly estadosStripe: string;
};

function euro(c: number, currency = 'EUR'): string {
  return (c / 100).toLocaleString('es-ES', {
    style: 'currency',
    currency: currency.length === 3 ? currency : 'EUR',
  });
}

interface Props {
  readonly initialPago: PagoSuccessRow | null;
  /** Si el webhook aún no insertó en `pagos`, el servidor rellena desde Stripe (misma sk). */
  readonly initialStripeResumen: StripeResumen | null;
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
  initialStripeResumen,
  sessionId,
  paymentIntentId,
}: Props): JSX.Element {
  const [pago, setPago] = useState<PagoSuccessRow | null>(initialPago);
  const [gaveUp, setGaveUp] = useState(false);

  const hasQueryKey = Boolean(sessionId) || Boolean(paymentIntentId);
  const canPoll = !pago && hasQueryKey && !gaveUp;
  const stripeResumen = initialStripeResumen;
  const showConfirmado =
    Boolean(pago) ||
    Boolean(
      stripeResumen &&
        (stripeResumen.estadosStripe === 'succeeded' ||
          stripeResumen.estadosStripe === 'processing' ||
          stripeResumen.estadosStripe === 'requires_capture')
    );

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

  const importeCents = pago
    ? pago.importe_centimos
    : stripeResumen
      ? stripeResumen.importeCentimos
      : 0;
  const monedaU = pago ? pago.moneda : stripeResumen ? stripeResumen.moneda : 'eur';

  return (
    <SurfaceCard variant="hero" bezel glow="sage">
      {pago
        ? null
        : stripeResumen && !gaveUp
          ? (
        <p
          className="mb-4 rounded-xl border border-amber-200/50 bg-amber-50/80 px-3 py-2 font-body text-[0.78rem] text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-200/90"
          role="status"
        >
          Pago aceptado. La clínica lo registra cuando el webhook (Stripe → Supabase)
          responde bien. Si la URL del webhook en el panel de Stripe no termina en
          <code className="rounded bg-white/20 px-1">stripe-webhook</code> (carpeta
          entera, sin cortar), las entregas fallan: corrígela y repite el pago o reenvía
          el evento desde el panel.
        </p>
            )
          : null}
      {!pago && !stripeResumen && hasQueryKey && !gaveUp 
        ? process.env.NODE_ENV === 'development' ? (
        <p className="mb-4 rounded-xl border border-line bg-white/40 px-3 py-2 font-body text-[0.75rem] text-ink-soft dark:border-white/10 dark:bg-white/5">
          (Dev) Define <code>STRIPE_SECRET_KEY</code> en <code>.env.local</code> (mismo
          <code>sk_</code> que en Supabase) para ver importe mientras se depura el webhook.
        </p>
          ) : null
        : null}

      <div className="grid gap-4 md:grid-cols-[auto,1fr] md:items-center">
        <span
          aria-hidden="true"
          className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-sage/15 md:mx-0"
        >
          <span className="material-symbols-outlined text-[2rem] text-sage-dark">task_alt</span>
        </span>
        <div className="text-center md:text-left">
          {showConfirmado ? (
            <>
              <p className="font-body text-[0.72rem] uppercase tracking-[0.18em] text-ink-muted">
                {pago
                  ? 'Pago confirmado e registrado'
                  : 'Pago confirmado (banco)'}
              </p>
              <p className="mt-1 font-display text-[2.4rem] italic text-ink tabular-nums tracking-[-0.01em]">
                {euro(importeCents, monedaU)}
              </p>
              {stripeResumen && !pago ? (
                <p className="mt-1 font-body text-[0.88rem] text-ink-soft">
                  {stripeResumen.descripcion} · {stripeResumen.kind === 'cita' ? 'Cita' : 'Bono de sesiones'}
                </p>
              ) : null}
              {pago?.metodo ? (
                <p className="mt-1 font-body text-[0.82rem] text-ink-soft">Vía {pago.metodo}</p>
              ) : null}
            </>
          ) : (
            <>
              <p className="font-display text-[1.35rem] italic text-ink">Procesando…</p>
              <p className="mt-1 font-body text-[0.85rem] text-ink-soft">
                {hasQueryKey
                  ? gaveUp
                    ? 'No hemos localizado aún el registro. Revisa en Bonos y pagos o contacta. Si usas pago con tarjeta, comprueba en Stripe el webhook a Supabase (URL entera).'
                    : 'Conectando con el registro de tu pago en la clínica…'
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
        {pago ? (
          <a href={`/api/portal/factura/${pago.id}/pdf`} target="_blank" rel="noopener noreferrer">
            <Button variant="surface" icon="description">
              Ver factura (PDF)
            </Button>
          </a>
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
