'use server';

/**
 * Server Actions para la creación de citas desde el panel admin (Almudena).
 *
 * Flujo:
 *   1. verificarSaldoPacienteAction → devuelve saldo desglosado (sueltas + bonos).
 *   2. crearCitaAdminAction → crea cita confirmada (con bono) o pendiente_pago (sin bono).
 *   3. obtenerDisponibilidadAdminAction → wrapper de cuadrícula para el modal.
 */

import { revalidatePath } from 'next/cache';

import { createServerClient } from '@/lib/supabase/server';
import { fireEmail } from '@/lib/email/send';

const UUID_RE = /^[0-9a-f-]{36}$/i;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/;

async function requireAdmin() {
  const supabase = createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) throw new Error('not_authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle<{ id: string; role: 'admin' | 'paciente' }>();

  if (profile?.role !== 'admin') throw new Error('forbidden');

  return { supabase, adminId: user.id };
}

/* ─────────────────────────────────────────────────────────────────────── */
/* Verificar saldo de un paciente                                         */
/* ─────────────────────────────────────────────────────────────────────── */

export interface SaldoPaciente {
  readonly sesionesSueltas: number;
  readonly sesionesBonosGrandes: number;
  readonly total: number;
  readonly tieneSaldo: boolean;
}

export async function verificarSaldoPacienteAction(
  pacienteId: string,
  servicioId: string
): Promise<SaldoPaciente> {
  if (!UUID_RE.test(pacienteId) || !UUID_RE.test(servicioId)) {
    return { sesionesSueltas: 0, sesionesBonosGrandes: 0, total: 0, tieneSaldo: false };
  }

  const { supabase } = await requireAdmin();

  const { data: bonos } = await supabase
    .from('bonos_pacientes')
    .select('sesiones_totales, sesiones_consumidas')
    .eq('paciente_id', pacienteId)
    .eq('servicio_id', servicioId)
    .eq('estado', 'activo')
    .eq('activo', true);

  const rows = bonos ?? [];
  let sueltas = 0;
  let grandes = 0;

  for (const b of rows) {
    const disponibles = b.sesiones_totales - b.sesiones_consumidas;
    if (disponibles <= 0) continue;
    if (b.sesiones_totales === 1) {
      sueltas += disponibles;
    } else {
      grandes += disponibles;
    }
  }

  const total = sueltas + grandes;
  return { sesionesSueltas: sueltas, sesionesBonosGrandes: grandes, total, tieneSaldo: total > 0 };
}

/* ─────────────────────────────────────────────────────────────────────── */
/* Crear cita desde admin                                                 */
/* ─────────────────────────────────────────────────────────────────────── */

export type CrearCitaAdminResult =
  | { readonly ok: true; readonly citaId: string; readonly estado: string; readonly consumioBono: boolean }
  | { readonly ok: false; readonly message: string };

export async function crearCitaAdminAction(
  pacienteId: string,
  servicioId: string,
  slotInicio: string
): Promise<CrearCitaAdminResult> {
  if (!UUID_RE.test(pacienteId) || !UUID_RE.test(servicioId)) {
    return { ok: false, message: 'Datos inválidos.' };
  }
  if (!ISO_RE.test(slotInicio)) {
    return { ok: false, message: 'Horario inválido.' };
  }

  try {
    const { supabase } = await requireAdmin();

    // Verificar saldo del paciente
    const saldo = await verificarSaldoPacienteAction(pacienteId, servicioId);

    // Obtener duración del servicio
    const { data: servicio } = await supabase
      .from('servicios')
      .select('duracion_minutos, nombre')
      .eq('id', servicioId)
      .eq('activo', true)
      .maybeSingle();

    if (!servicio) {
      return { ok: false, message: 'Servicio no encontrado o inactivo.' };
    }

    const slotDate = new Date(slotInicio);
    const slotFin = new Date(slotDate.getTime() + servicio.duracion_minutos * 60 * 1000);

    if (saldo.tieneSaldo) {
      // Tiene saldo → consumir sesión (priorizando sueltas) y crear cita confirmada
      // Buscar el bono a consumir (prioridad: sueltas primero)
      const { data: bono } = await supabase
        .from('bonos_pacientes')
        .select('id, sesiones_totales, sesiones_consumidas')
        .eq('paciente_id', pacienteId)
        .eq('servicio_id', servicioId)
        .eq('estado', 'activo')
        .eq('activo', true)
        .order('sesiones_totales', { ascending: true })
        .order('fecha_compra', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!bono) {
        return { ok: false, message: 'No se encontró bono disponible.' };
      }

      // Insertar cita confirmada
      const { data: citaRow, error: citaErr } = await supabase
        .from('citas')
        .insert({
          paciente_id: pacienteId,
          servicio_id: servicioId,
          inicio: slotInicio,
          fin: slotFin.toISOString(),
          estado: 'confirmada',
        })
        .select('id')
        .maybeSingle();

      if (citaErr) {
        if (citaErr.code === '23P01') {
          return { ok: false, message: 'Ese hueco ya está ocupado.' };
        }
        return { ok: false, message: citaErr.message };
      }

      if (!citaRow) {
        return { ok: false, message: 'Error creando la cita.' };
      }

      // Consumir sesión del bono
      const newConsumed = bono.sesiones_consumidas + 1;
      await supabase
        .from('bonos_pacientes')
        .update({
          sesiones_consumidas: newConsumed,
          estado: newConsumed >= bono.sesiones_totales ? 'agotado' : 'activo',
        })
        .eq('id', bono.id);

      // Email de confirmación al paciente
      const { data: pacienteData } = await supabase
        .from('pacientes')
        .select('user_id')
        .eq('id', pacienteId)
        .maybeSingle();

      if (pacienteData?.user_id) {
        void fireEmail({
          type: 'booking_confirmed',
          toUserId: pacienteData.user_id,
          citaId: citaRow.id,
          data: {
            servicio: servicio.nombre,
            inicio: slotInicio,
            duracion_min: servicio.duracion_minutos,
          },
        });
      }

      revalidatePath('/admin/agenda');
      revalidatePath('/admin/pacientes');

      return { ok: true, citaId: citaRow.id, estado: 'confirmada', consumioBono: true };
    } else {
      // Sin saldo → crear cita pendiente_pago
      const { data: citaRow, error: citaErr } = await supabase
        .from('citas')
        .insert({
          paciente_id: pacienteId,
          servicio_id: servicioId,
          inicio: slotInicio,
          fin: slotFin.toISOString(),
          estado: 'pendiente_pago',
        })
        .select('id')
        .maybeSingle();

      if (citaErr) {
        if (citaErr.code === '23P01') {
          return { ok: false, message: 'Ese hueco ya está ocupado.' };
        }
        return { ok: false, message: citaErr.message };
      }

      if (!citaRow) {
        return { ok: false, message: 'Error creando la cita.' };
      }

      // Email al paciente: "Tu cita está pendiente de pago"
      const { data: pacienteData } = await supabase
        .from('pacientes')
        .select('user_id')
        .eq('id', pacienteId)
        .maybeSingle();

      if (pacienteData?.user_id) {
        void fireEmail({
          type: 'cita_pendiente_pago',
          toUserId: pacienteData.user_id,
          citaId: citaRow.id,
          data: {
            servicio: servicio.nombre,
            inicio: slotInicio,
            duracion_min: servicio.duracion_minutos,
          },
        });
      }

      revalidatePath('/admin/agenda');
      revalidatePath('/admin/pacientes');

      return { ok: true, citaId: citaRow.id, estado: 'pendiente_pago', consumioBono: false };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido.';
    return { ok: false, message };
  }
}

/* ─────────────────────────────────────────────────────────────────────── */
/* Disponibilidad para el modal admin                                     */
/* ─────────────────────────────────────────────────────────────────────── */

export interface SlotAdmin {
  readonly slot_inicio: string;
  readonly slot_fin: string;
  readonly permite_reserva: boolean;
}

export async function obtenerDisponibilidadAdminAction(
  fechaISO: string,
  servicioId: string
): Promise<readonly SlotAdmin[]> {
  if (!UUID_RE.test(servicioId)) return [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaISO)) return [];

  const { supabase } = await requireAdmin();

  const { data, error } = await supabase.rpc('obtener_cuadricula_reserva', {
    p_fecha: fechaISO,
    p_servicio_id: servicioId,
  });

  if (error || !data) return [];

  return (data as Array<{ slot_inicio: string; slot_fin: string; permite_reserva: boolean }>).map(
    (r) => ({
      slot_inicio: String(r.slot_inicio),
      slot_fin: String(r.slot_fin),
      permite_reserva: Boolean(r.permite_reserva),
    })
  );
}
