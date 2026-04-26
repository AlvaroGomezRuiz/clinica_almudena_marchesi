/**
 * Etiquetas y tono visual para `citas.estado` en la agenda admin.
 * Contrato: mismos literales que `CitaEstado` en `lib/supabase/types`.
 */
import type { CitaEstado } from '@/lib/supabase/types';

export type CitaEstadoAgendaChipTone = 'neutral' | 'positive' | 'warning' | 'critical' | 'info';

const ETIQUETA: { readonly [K in CitaEstado]: string } = {
  bloqueo_temporal: 'Pago pendiente',
  confirmada: 'Confirmada',
  completada: 'Completada',
  cancelada: 'Cancelada',
  no_asistio: 'No asistió',
};

const CHIP: { readonly [K in CitaEstado]: CitaEstadoAgendaChipTone } = {
  bloqueo_temporal: 'info',
  confirmada: 'positive',
  completada: 'neutral',
  cancelada: 'warning',
  no_asistio: 'critical',
};

function esCitaEstado(valor: string): valor is CitaEstado {
  return (
    valor === 'bloqueo_temporal' ||
    valor === 'confirmada' ||
    valor === 'completada' ||
    valor === 'cancelada' ||
    valor === 'no_asistio'
  );
}

/** Texto legible en español para el estado (agenda, sheet, eventos). */
export function labelCitaEstadoAgenda(estado: string): string {
  if (esCitaEstado(estado)) {
    return ETIQUETA[estado];
  }
  return estado;
}

/** Tono del `Chip` según el estado. */
export function chipToneCitaEstadoAgenda(estado: string): CitaEstadoAgendaChipTone {
  if (esCitaEstado(estado)) {
    return CHIP[estado];
  }
  return 'neutral';
}

const BORDE_L: { readonly [K in CitaEstado]: string } = {
  bloqueo_temporal: 'border-l-[#456377]/80',
  confirmada: 'border-l-primary',
  completada: 'border-l-ink/25 dark:border-l-white/30',
  cancelada: 'border-l-[#c89b5a]/90',
  no_asistio: 'border-l-[#b2675e]/90',
};

/** Clase `border-l-*` (2px) para tarjetas de cita en la rejilla. */
export function bordeLateralCitaAgenda(estado: string): string {
  if (esCitaEstado(estado)) {
    return BORDE_L[estado];
  }
  return 'border-l-ink/15 dark:border-l-white/20';
}

/** Puntos en vista mes (mismo criterio de color que el chip de estado). */
export function puntoCalendarioCitaEstado(estado: string): string {
  const t = chipToneCitaEstadoAgenda(estado);
  if (t === 'positive') return 'bg-primary dark:bg-primary-fixed-dim';
  if (t === 'info') return 'bg-[#456377] dark:bg-sky-300/85';
  if (t === 'warning') return 'bg-[#c89b5a]';
  if (t === 'critical') return 'bg-[#b2675e] dark:bg-red-300/80';
  return 'bg-ink/45 dark:bg-white/45';
}
