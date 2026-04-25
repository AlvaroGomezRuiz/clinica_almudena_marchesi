/**
 * Resumen de UI para /portal/pagos/success cuando el flujo es Stripe Checkout
 * (query `session_id=…`). Misma forma que {@link StripeResumen} del PaymentIntent.
 */

import type { StripeResumen } from '@/lib/stripe/paymentIntentResumen';

type CheckoutSessionLike = {
  payment_status?: string;
  amount_total?: number | null;
  currency?: string;
  metadata?: Record<string, string | undefined> | null;
};

export function resumenFromCheckoutSessionJson(
  session: CheckoutSessionLike,
  userId: string
): StripeResumen | null {
  const ps = String(session.payment_status ?? '');
  if (ps !== 'paid' && ps !== 'processing') {
    return null;
  }

  const mid = (session.metadata ?? {}) as { user_id?: string; kind?: string };
  if (mid.user_id !== userId) return null;
  if (mid.kind !== 'cita' && mid.kind !== 'bono') return null;

  const amount =
    typeof session.amount_total === 'number' && !Number.isNaN(session.amount_total)
      ? session.amount_total
      : 0;
  const moneda = (session.currency ?? 'eur').toUpperCase();
  const descripcion = mid.kind === 'cita' ? 'Cita' : 'Bono';

  return {
    importeCentimos: amount,
    moneda,
    descripcion,
    kind: mid.kind,
    estadosStripe: ps === 'processing' ? 'processing' : 'succeeded',
  };
}
