/**
 * Texto y palabras clave para metadata (SEO/GEO) alineados con el checkout Stripe
 * del portal: tarjeta (incl. Apple Pay / Google Pay) → Bizum → Link → SEPA → Klarna.
 */
export const CLINIC_STRIPE_PAYMENT_ORDER_LABEL_ES: string =
  'tarjeta (incl. Apple Pay y Google Pay), Bizum, Stripe Link, domiciliación SEPA y Klarna';

const STRIPE_PAYMENT_SEO = [
  'pago online consulta psicología Madrid',
  'pagar sesión psicología Bizum',
  'pago tarjeta psicólogo Madrid',
  'Stripe Link pago terapia',
  'domiciliación SEPA psicología',
  'Klarna psicología Madrid',
  'Apple Pay Google Pay reserva cita',
] as const;

/** Lista mutable para `Metadata.keywords` de Next.js. */
export function clinicStripePaymentKeywordsList(): string[] {
  return [...STRIPE_PAYMENT_SEO];
}
