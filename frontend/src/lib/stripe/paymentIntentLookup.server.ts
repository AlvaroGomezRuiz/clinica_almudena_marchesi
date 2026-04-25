/**
 * Lee un PaymentIntent en el servidor (igual clave sk que en Supabase Edge) para
 * rellenar /portal/pagos/success aunque el webhook tarde o falle. Solo devuelve
 * datos si metadata.user_id coincide con el paciente.
 */

import {
  resumenFromPaymentIntentJson,
  type StripeResumen,
} from '@/lib/stripe/paymentIntentResumen';

export type { StripeResumen as StripePagoResumen };

export async function fetchPaymentIntentResumenForUser(
  paymentIntentId: string,
  userId: string
): Promise<StripeResumen | null> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;

  const u = new URL(
    `https://api.stripe.com/v1/payment_intents/${encodeURIComponent(paymentIntentId)}`
  );

  const res = await fetch(u, {
    headers: { Authorization: `Bearer ${key}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;

  const pi = (await res.json()) as {
    id?: string;
    status?: string;
    amount?: number;
    currency?: string;
    description?: string | null;
    metadata?: Record<string, string | undefined>;
  };

  return resumenFromPaymentIntentJson(pi, userId);
}
