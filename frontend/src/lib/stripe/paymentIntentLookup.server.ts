/**
 * Lee un PaymentIntent en el servidor (igual clave sk que en Supabase Edge) para
 * rellenar /portal/pagos/success aunque el webhook tarde o falle. Solo devuelve
 * datos si metadata.user_id coincide con el paciente.
 */

export type StripePagoResumen = {
  readonly importeCentimos: number;
  readonly moneda: string;
  readonly descripcion: string;
  readonly kind: 'cita' | 'bono';
  /** Éxito para UI: pago en Stripe (el registro clínico puede ser asíncrono). */
  readonly estadosStripe: string;
};

export async function fetchPaymentIntentResumenForUser(
  paymentIntentId: string,
  userId: string
): Promise<StripePagoResumen | null> {
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

  const status = String(pi.status ?? '');
  if (status !== 'succeeded' && status !== 'processing' && status !== 'requires_capture') {
    return null;
  }

  const mid = (pi.metadata ?? {}) as { user_id?: string; kind?: string };
  if (mid.user_id !== userId) return null;
  if (mid.kind !== 'cita' && mid.kind !== 'bono') return null;

  const amount = typeof pi.amount === 'number' ? pi.amount : 0;
  const moneda = (pi.currency ?? 'eur').toUpperCase();
  const descripcion = (pi.description && pi.description.length > 0) ? pi.description
    : mid.kind === 'cita' ? 'Cita' : 'Bono';

  return {
    importeCentimos: amount,
    moneda,
    descripcion,
    kind: mid.kind,
    estadosStripe: status,
  };
}
