export const CLINIC_SESSION_DURATION_MIN = 50;

// Coste visible en UI:
// - Entorno no-producción (Test/Dev): 55€
// - Producción: "— €"
export const CLINIC_SESSION_PRICE_LABEL =
  process.env.NODE_ENV === 'production' ? '— €' : '55€';

export const CLINIC_ADDRESS_LINE1 =
  'Calle de Meléndez Valdés número 22, piso 1D';
export const CLINIC_ADDRESS_LINE2 = 'Madrid';

export const CLINIC_ADDRESS = `${CLINIC_ADDRESS_LINE1}, ${CLINIC_ADDRESS_LINE2}`;

export const CLINIC_PAYMENT_METHODS = [
  'Efectivo',
  'Transferencia',
  'Stripe',
] as const;

export const CLINIC_GOOGLE_MAPS_QUERY = 'Calle de Meléndez Valdés 22, Madrid';

export function getClinicGoogleMapsHref(): string {
  return `https://maps.google.com/?q=${encodeURIComponent(CLINIC_GOOGLE_MAPS_QUERY)}`;
}
