'use server';

/**
 * Server Actions para reserva de citas vía RPC Supabase.
 *
 * Mapa de errores PostgreSQL a códigos UX:
 *   * 23P01 (exclusion_violation) / custom 'slot_ocupado' → conflict
 *   * 23514 (check_violation)      / custom 'slot_en_pasado' → invalid
 *   * 42501 (insufficient_privilege) → forbidden
 *   * 02000 (no_data_found)        → not_found
 */

import { isMadridInstantWithinClinicBookingWindow } from '@/lib/clinic/madrid-booking-window';
import { createServerClient } from '@/lib/supabase/server';
import { getSupabaseEnv } from '@/lib/supabase/env';
import { fireEmail } from '@/lib/email/send';

export interface Slot {
  readonly slot_inicio: string; // ISO timestamptz
  readonly slot_fin: string;
}

/** Hueco en la rejilla diaria (libre u ocupado visualmente). */
export interface SlotCuadricula extends Slot {
  readonly permite_reserva: boolean;
}

export type ReservaResult =
  | { readonly ok: true; readonly citaId: string; readonly confirmada: boolean; readonly consumioBono: boolean }
  | { readonly ok: false; readonly code: ReservaErrorCode; readonly message: string };

type ReservaErrorCode =
  | 'no_paciente'
  | 'servicio_invalido'
  | 'slot_invalido'
  | 'slot_ocupado'
  | 'fuera_horario'
  | 'unknown';

const UUID_RE = /^[0-9a-f-]{36}$/i;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/;

// ---------------------------------------------------------------------------
// Listar slots disponibles de un servicio en una fecha
// (RPC: solo oculta citas confirmada/completada; bloqueo_temporal no quita el hueco.)
// ---------------------------------------------------------------------------
export async function getDisponibilidadAction(
  fechaISO: string,
  servicioId: string
): Promise<readonly Slot[]> {
  if (!UUID_RE.test(servicioId)) return [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaISO)) return [];

  const supabase = createServerClient();
  const data = await rpcPost<Slot[]>(
    supabase,
    'obtener_disponibilidad',
    { p_fecha: fechaISO, p_servicio_id: servicioId }
  );
  return data ?? [];
}

/**
 * Rejilla completa del día: incluye huecos ocupados (`permite_reserva: false`)
 * para mostrarlos deshabilitados en UI sin ocultarlos.
 */
export async function getCuadriculaReservaAction(
  fechaISO: string,
  servicioId: string
): Promise<readonly SlotCuadricula[]> {
  if (!UUID_RE.test(servicioId)) return [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaISO)) return [];

  const supabase = createServerClient();
  const data = await rpcPost<
    Array<{ slot_inicio: string; slot_fin: string; permite_reserva: boolean }>
  >(supabase, 'obtener_cuadricula_reserva', { p_fecha: fechaISO, p_servicio_id: servicioId });
  const rows = data ?? [];
  return rows.map((r) => ({
    slot_inicio: String(r.slot_inicio),
    slot_fin: String(r.slot_fin),
    permite_reserva: Boolean(r.permite_reserva),
  }));
}

// ---------------------------------------------------------------------------
// Reservar cita (bono → confirmada; sin bono → bloqueo_temporal 15 min)
// ---------------------------------------------------------------------------
export async function reservarCitaAction(
  servicioId: string,
  slotInicio: string
): Promise<ReservaResult> {
  if (!UUID_RE.test(servicioId)) {
    return { ok: false, code: 'servicio_invalido', message: 'Servicio inválido.' };
  }
  if (!ISO_RE.test(slotInicio)) {
    return { ok: false, code: 'slot_invalido', message: 'Horario inválido.' };
  }

  const slotDate = new Date(slotInicio);
  if (Number.isNaN(slotDate.getTime())) {
    return { ok: false, code: 'slot_invalido', message: 'Horario inválido.' };
  }
  if (!isMadridInstantWithinClinicBookingWindow(slotDate)) {
    return {
      ok: false,
      code: 'fuera_horario',
      message: 'Elige una hora entre las 09:00 y las 21:59 (horario de la consulta, Madrid).',
    };
  }

  const supabase = createServerClient();
  let data: unknown;
  try {
    data = await rpcPost(
      supabase,
      'reservar_cita',
      { p_servicio_id: servicioId, p_slot_inicio: slotInicio }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (/slot_ocupado|exclusion_violation|23P01/i.test(msg)) {
      return {
        ok: false,
        code: 'slot_ocupado',
        message:
          'Ese hueco acaba de ocuparse (reserva en curso o cita ya confirmada). Actualiza la lista o elige otra hora.',
      };
    }
    if (/slot_fuera_plantilla|dia_bloqueado_por_plantilla/i.test(msg)) {
      return {
        ok: false,
        code: 'fuera_horario',
        message:
          'Ese horario no está disponible según la plantilla de agenda activa. Elige otro día u otra franja.',
      };
    }
    return { ok: false, code: 'unknown', message: msg };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return { ok: false, code: 'unknown', message: 'Respuesta vacía del servidor.' };
  }

  const citaId = String(row.cita_id);
  const confirmada = row.estado === 'confirmada';

  // Fire-and-forget email de confirmación solo si la cita queda CONFIRMADA
  // (bono consumido). Para bloqueo_temporal esperamos al webhook de Stripe.
  if (confirmada) {
    void dispatchBookingConfirmedEmail(supabase, citaId);
  }

  return {
    ok: true,
    citaId,
    confirmada,
    consumioBono: Boolean(row.consumio_bono),
  };
}

async function rpcPost<T>(
  supabase: ReturnType<typeof createServerClient>,
  fn: string,
  args: Record<string, unknown>
): Promise<T> {
  const { url, anonKey } = getSupabaseEnv();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.access_token) {
    throw new Error('No hay sesión válida para ejecutar la RPC.');
  }

  const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`RPC ${fn} falló (${res.status}): ${detail}`);
  }

  return (await res.json()) as T;
}

// ---------------------------------------------------------------------------
// Lookup mínimo para enriquecer el email (servicio, inicio, duración, user).
// Se ejecuta en paralelo al retorno de la Server Action; cualquier fallo es
// silencioso (email es mejor-esfuerzo).
// ---------------------------------------------------------------------------
interface CitaEmailContext {
  readonly inicio: string;
  readonly duracion_minutos: number;
  readonly servicio_nombre: string;
  readonly user_id: string;
}

async function dispatchBookingConfirmedEmail(
  supabase: ReturnType<typeof createServerClient>,
  citaId: string
): Promise<void> {
  const { data } = await supabase
    .from('citas')
    .select(
      `inicio,
       servicio:servicios!inner (nombre, duracion_minutos),
       paciente:pacientes!inner (user_id)`
    )
    .eq('id', citaId)
    .maybeSingle();

  if (!data) return;

  // Supabase infers relaciones como objeto o array según cardinalidad; normalizamos.
  // Usamos `unknown` como puente porque nuestra `Database` no declara Relationships
  // (los tipos se generan a mano; pendiente migrar a `supabase gen types`).
  const raw = data as unknown as {
    inicio: string;
    servicio:
      | { nombre: string; duracion_minutos: number }
      | Array<{ nombre: string; duracion_minutos: number }>
      | null;
    paciente:
      | { user_id: string | null }
      | Array<{ user_id: string | null }>
      | null;
  };
  const servicio = Array.isArray(raw.servicio)
    ? (raw.servicio[0] ?? null)
    : raw.servicio;
  const paciente = Array.isArray(raw.paciente)
    ? (raw.paciente[0] ?? null)
    : raw.paciente;

  if (!servicio || !paciente?.user_id) return;

  const ctx: CitaEmailContext = {
    inicio: raw.inicio,
    duracion_minutos: servicio.duracion_minutos,
    servicio_nombre: servicio.nombre,
    user_id: paciente.user_id,
  };

  const { data: pagoRow } = await supabase
    .from('pagos')
    .select('id')
    .eq('cita_id', citaId)
    .eq('estado', 'completado')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  await fireEmail({
    type: 'booking_confirmed',
    toUserId: ctx.user_id,
    citaId,
    pagoId: pagoRow?.id,
    data: {
      servicio: ctx.servicio_nombre,
      inicio: ctx.inicio,
      duracion_min: ctx.duracion_minutos,
    },
  });
}

// ---------------------------------------------------------------------------
// Cancelación de cita
// Invoca la Edge Function `cancel-cita` que orquesta RPC + Stripe refund + email.
// ---------------------------------------------------------------------------
export type CancelarCitaResult =
  | {
      readonly ok: true;
      readonly bonoRestaurado: boolean;
      readonly refund: { readonly id: string; readonly status: string } | null;
      readonly refundError: string | null;
    }
  | { readonly ok: false; readonly code: CancelarErrorCode; readonly message: string };

type CancelarErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'already_cancelled'
  | 'network'
  | 'unknown';

export async function cancelarCitaAction(
  citaId: string,
  motivo?: string,
  force = false
): Promise<CancelarCitaResult> {
  if (!UUID_RE.test(citaId)) {
    return { ok: false, code: 'not_found', message: 'Cita inválida.' };
  }

  const supabase = createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { ok: false, code: 'unauthorized', message: 'Sesión expirada. Vuelve a iniciar sesión.' };
  }

  const { url: supabaseUrl, anonKey } = getSupabaseEnv();

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/cancel-cita`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: anonKey,
      },
      body: JSON.stringify({
        cita_id: citaId,
        motivo: motivo?.trim().slice(0, 500) || null,
        force,
      }),
    });

    const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (!res.ok) {
      const code: CancelarErrorCode =
        res.status === 403 ? 'forbidden'
          : res.status === 401 ? 'unauthorized'
          : res.status === 404 ? 'not_found'
          : res.status === 409 ? 'already_cancelled'
          : 'unknown';
      const detail =
        typeof raw.detail === 'string'
          ? raw.detail
          : typeof raw.message === 'string'
            ? raw.message
            : '';
      const friendly =
        code === 'forbidden'
          ? detail.includes('cancelacion_fuera_politica') || detail.includes('48 horas')
            ? 'La cancelación online requiere al menos 48 horas de antelación. Para casos urgentes, escribe a la consulta.'
            : 'No puedes cancelar esta cita.'
          : code === 'already_cancelled'
            ? 'Esta cita ya estaba cancelada.'
            : code === 'not_found'
              ? 'No encontramos esa cita.'
              : detail || 'No se pudo cancelar. Intenta más tarde.';
      return { ok: false, code, message: friendly };
    }

    return {
      ok: true,
      bonoRestaurado: Boolean(raw.bono_restaurado),
      refund:
        raw.refund && typeof raw.refund === 'object'
          ? (raw.refund as { id: string; status: string })
          : null,
      refundError: typeof raw.refund_error === 'string' ? raw.refund_error : null,
    };
  } catch (err) {
    return {
      ok: false,
      code: 'network',
      message: err instanceof Error ? err.message : 'Error de red cancelando la cita.',
    };
  }
}
