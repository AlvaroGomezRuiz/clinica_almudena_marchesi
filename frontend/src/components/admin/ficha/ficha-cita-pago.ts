/**
 * Copy de pago / tarifa en ficha admin (vista e impresión).
 * La tarifa proviene del servicio en catálogo; el cobro real puede ser bono, Stripe o manual.
 */

import type { CitaEstado } from '@/lib/supabase/types';

function esCitaEstado(val: string): val is CitaEstado {
  return (
    val === 'bloqueo_temporal' ||
    val === 'confirmada' ||
    val === 'completada' ||
    val === 'cancelada' ||
    val === 'no_asistio' ||
    val === 'pendiente_pago'
  );
}

export function formatEurosDesdeCentimos(centimos: number): string {
  if (!Number.isFinite(centimos)) return '—';
  return (centimos / 100).toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
  });
}

/**
 * Línea corta para el timeline de ficha: estado + reglas de pago (referencia de tarifa).
 */
export function lineaTarifaCitaFicha(
  estado: string,
  precioCentimos: number
): string {
  const ref = formatEurosDesdeCentimos(precioCentimos);
  if (!esCitaEstado(estado)) {
    return `Tarifa catálogo: ${ref}. Revisa pago/portal.`;
  }
  const map: { readonly [K in CitaEstado]: string } = {
    bloqueo_temporal: `Reserva con pago pendiente (portal). Tarifa: ${ref}.`,
    confirmada: `Cita activa. Tarifa de referencia: ${ref} (cobro según pago, bono o criterio de consulta).`,
    completada: `Sesión realizada. Tarifa de referencia: ${ref}.`,
    cancelada: 'Cancelada. Cargos según ventana 48h y política de consulta.',
    no_asistio: 'No asistió. Sesión consumida según política de no reembolso.',
    pendiente_pago: `Pendiente de pago. Tarifa: ${ref}. Se enviará recordatorio al paciente.`,
  };
  return map[estado];
}
