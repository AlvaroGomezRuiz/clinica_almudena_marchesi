'use server';

/**
 * Creación manual de citas desde el panel admin (ficha paciente).
 * Inserta en `public.citas` con estado `confirmada` (sin pasarela de pago).
 */

import { revalidatePath } from 'next/cache';

import { captureClinicalError } from '@/lib/sentry';
import { createServerClient } from '@/lib/supabase/server';

const UUID_RE = /^[0-9a-f-]{36}$/i;

type ActionResult<T = undefined> =
  | (T extends undefined ? { ok: true } : { ok: true; data: T })
  | { ok: false; message: string };

async function requireAdmin(): Promise<{
  supabase: ReturnType<typeof createServerClient>;
}> {
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
  return { supabase };
}

export async function adminCrearCitaParaPacienteAction(input: {
  readonly pacienteId: string;
  readonly servicioId: string;
  /** ISO 8601 (UTC o con offset), p. ej. desde `Date.toISOString()` en el cliente. */
  readonly inicioIso: string;
  readonly notasAdmin: string | null;
}): Promise<ActionResult<{ citaId: string }>> {
  try {
    if (!UUID_RE.test(input.pacienteId)) {
      return { ok: false, message: 'Paciente no válido.' };
    }
    if (!UUID_RE.test(input.servicioId)) {
      return { ok: false, message: 'Servicio no válido.' };
    }

    const inicio = new Date(input.inicioIso);
    if (Number.isNaN(inicio.getTime())) {
      return { ok: false, message: 'Fecha u hora no válida.' };
    }

    const { supabase } = await requireAdmin();

    const { data: pacRow, error: pacErr } = await supabase
      .from('pacientes')
      .select('id')
      .eq('id', input.pacienteId)
      .maybeSingle<{ id: string }>();

    if (pacErr || !pacRow) {
      return { ok: false, message: 'No se encontró el paciente.' };
    }

    const { data: srv, error: srvErr } = await supabase
      .from('servicios')
      .select('id, duracion_minutos')
      .eq('id', input.servicioId)
      .eq('activo', true)
      .maybeSingle<{ id: string; duracion_minutos: number }>();

    if (srvErr || !srv) {
      return { ok: false, message: 'Servicio no disponible.' };
    }

    const dur = Math.max(15, Math.min(240, Number(srv.duracion_minutos) || 50));
    const fin = new Date(inicio.getTime() + dur * 60 * 1000);

    const notas =
      input.notasAdmin && input.notasAdmin.trim().length > 0
        ? input.notasAdmin.trim().slice(0, 2000)
        : null;

    const { data: inserted, error: insErr } = await supabase
      .from('citas')
      .insert({
        paciente_id: input.pacienteId,
        servicio_id: input.servicioId,
        inicio: inicio.toISOString(),
        fin: fin.toISOString(),
        estado: 'confirmada',
        notas_admin: notas,
        activo: true,
      })
      .select('id')
      .maybeSingle<{ id: string }>();

    if (insErr) {
      const msg = insErr.message ?? '';
      if (/exclusion|overlap|23P01|solape/i.test(msg)) {
        return {
          ok: false,
          message:
            'Ese horario choca con otra cita o bloqueo. Elige otra hora o revisa la agenda.',
        };
      }
      captureClinicalError(insErr, {
        area: 'admin-sensitive',
        operation: 'insert_cita_manual',
        patient_id: input.pacienteId,
        fingerprint: ['citas', 'admin-manual'],
      });
      return { ok: false, message: msg || 'No se pudo crear la cita.' };
    }

    if (!inserted?.id) {
      return { ok: false, message: 'Respuesta vacía al crear la cita.' };
    }

    revalidatePath(`/admin/pacientes/${input.pacienteId}`);
    revalidatePath('/admin/agenda');
    return { ok: true, data: { citaId: inserted.id } };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'error_desconocido';
    return { ok: false, message };
  }
}
