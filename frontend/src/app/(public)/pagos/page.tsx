import { redirect } from 'next/navigation';

/**
 * Redirect a `/citas/nueva` — el flujo público de reserva + pago vive
 * ahora allí (PaymentElement embebido con Supabase Edge Function
 * `stripe-payment-intent`). Antes esta ruta llamaba al backend FastAPI
 * deprecado (`services/payments/actions.ts`) vía Checkout hosted.
 *
 * Mantenemos la ruta para no romper bookmarks externos / SEO.
 */
export const dynamic = 'force-static';

export default function LegacyPagosRedirect(): never {
  redirect('/citas/nueva');
}
