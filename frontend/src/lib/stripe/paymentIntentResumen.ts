/**
 * Mapea un PaymentIntent (API REST o @stripe/stripe-js) a resumen de UI
 * para /portal/pagos/success. Misma lógica en servidor (sk) y cliente (client_secret + pk).
 */

export type StripeResumen = {
  readonly importeCentimos: number;
  readonly moneda: string;
  readonly descripcion: string;
  readonly kind: 'cita' | 'bono';
  /** Éxito para UI: pago en Stripe (el registro clínico puede ser asíncrono). */
  readonly estadosStripe: string;
};

type PiLike = {
  status?: string;
  amount?: number;
  currency?: string;
  description?: string | null;
  metadata?: Record<string, string | undefined> | null;
};

export function resumenFromPaymentIntentJson(
  pi: PiLike,
  userId: string
): StripeResumen | null {
  const status = String(pi.status ?? '');
  if (
    status !== 'succeeded' &&
    status !== 'processing' &&
    status !== 'requires_capture'
  ) {
    return null;
  }

  const mid = pi.metadata;
  if (mid && Object.keys(mid).length > 0) {
    if (mid.user_id !== userId) return null;
    if (mid.kind !== 'cita' && mid.kind !== 'bono') return null;
  }

  const amount = typeof pi.amount === 'number' ? pi.amount : 0;
  const moneda = (pi.currency ?? 'eur').toUpperCase();
  const descripcion =
    pi.description && pi.description.length > 0
      ? pi.description
      : mid?.kind === 'cita'
        ? 'Cita'
        : 'Bono';

  return {
    importeCentimos: amount,
    moneda,
    descripcion,
    kind: (mid?.kind as 'cita' | 'bono') ?? 'bono',
    estadosStripe: status,
  };
}
