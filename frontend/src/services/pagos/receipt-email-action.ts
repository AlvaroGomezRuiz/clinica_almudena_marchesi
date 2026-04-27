'use server';

/**
 * Reenvío / primer envío del correo de recibo de bono + PDF (Edge `send-email`).
 * Útil si el webhook Stripe terminó antes de que existiera la fila `pagos` o falló Resend.
 */

import { getMetodoFacturacionPantalla } from '@/lib/admin/facturacion-metodo-display';
import { sendTransactionalEmail } from '@/lib/email/send';
import { createServerClient } from '@/lib/supabase/server';

const UUID_RE = /^[0-9a-f-]{36}$/i;

export type SolicitarReciboResult =
  | { readonly ok: true; readonly deduped?: boolean }
  | { readonly ok: false; readonly error: string };

export async function solicitarEmailReciboBonoAction(pagoId: string): Promise<SolicitarReciboResult> {
  if (!UUID_RE.test(pagoId)) {
    return { ok: false, error: 'identificador_inválido' };
  }

  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: 'no_session' };
  }

  const { data: paciente } = await supabase
    .from('pacientes')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle<{ id: string }>();
  if (!paciente) {
    return { ok: false, error: 'no_paciente' };
  }

  const { data: pago } = await supabase
    .from('pagos')
    .select('id, paciente_id, descripcion, importe_centimos, moneda, metodo, bono_id, stripe_payment_intent')
    .eq('id', pagoId)
    .maybeSingle<{
      id: string;
      paciente_id: string;
      descripcion: string | null;
      importe_centimos: number;
      moneda: string | null;
      metodo: string | null;
      bono_id: string | null;
      stripe_payment_intent: string | null;
    }>();

  if (!pago || pago.paciente_id !== paciente.id || !pago.bono_id) {
    return { ok: false, error: 'pago_no_encontrado' };
  }

  const { data: bp } = await supabase
    .from('bonos_pacientes')
    .select('sesiones_totales, fecha_expiracion')
    .eq('id', pago.bono_id)
    .maybeSingle<{ sesiones_totales: number; fecha_expiracion: string | null }>();

  if (!bp) {
    return { ok: false, error: 'bono_no_encontrado' };
  }

  const imp =
    ((pago.importe_centimos ?? 0) / 100).toFixed(2).replace('.', ',') +
    ' ' +
    String(pago.moneda ?? 'EUR');
  const validez = bp.fecha_expiracion
    ? new Date(String(bp.fecha_expiracion)).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Europe/Madrid',
      })
    : 'Usa las sesiones según el plazo indicado en el portal (sin cierre fijo)';

  const appUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    'https://ampsicologia.es';

  const metodo_label = getMetodoFacturacionPantalla({
    metodo: pago.metodo,
    stripePaymentIntent: pago.stripe_payment_intent,
  }).shortLabel;

  const res = await sendTransactionalEmail({
    type: 'bono_comprado',
    toUserId: user.id,
    pagoId: pago.id,
    data: {
      producto: pago.descripcion ?? `Bono (${bp.sesiones_totales} sesiones)`,
      sesiones: bp.sesiones_totales,
      importe_label: imp,
      metodo_label: metodo_label,
      validez_label: validez,
      app_url: appUrl,
    },
  });

  if (!res.ok && !res.deduped) {
    return { ok: false, error: res.error ?? 'send_failed' };
  }
  return { ok: true, deduped: res.deduped };
}
