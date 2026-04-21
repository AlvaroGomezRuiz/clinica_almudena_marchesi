'use server';

/**
 * Server Actions de agenda admin.
 *
 * Alcance:
 *   - crearBloqueoAction:            inserta un bloqueo puntual (horas o día completo).
 *   - aplicarPlantillaAction:        aplica una plantilla de horario a un rango.
 *   - cancelarAplicacionPlantilla:   revierte una aplicación (no destruye la plantilla).
 *   - eliminarBloqueoAction:         soft-delete (activo=false) o hard-delete si no tiene histórico.
 *
 * Todas las acciones verifican sesión + role='admin' (defense-in-depth sobre RLS).
 */

import { revalidatePath } from 'next/cache';

import { createServerClient } from '@/lib/supabase/server';

type ActionResult<T = undefined> =
  | (T extends undefined ? { ok: true } : { ok: true; data: T })
  | { ok: false; message: string };

interface AdminGuard {
  readonly supabase: ReturnType<typeof createServerClient>;
  readonly adminId: string;
}

async function requireAdmin(): Promise<AdminGuard> {
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

interface CrearBloqueoInput {
  readonly inicioISO: string;
  readonly finISO: string;
  readonly motivo: string | null;
  readonly diaCompleto: boolean;
}

export async function crearBloqueoAction(
  input: CrearBloqueoInput
): Promise<ActionResult> {
  try {
    if (!input.inicioISO || !input.finISO) {
      return { ok: false, message: 'fechas_invalidas' };
    }
    if (new Date(input.finISO) <= new Date(input.inicioISO)) {
      return { ok: false, message: 'rango_invalido' };
    }

    const { supabase, adminId } = await requireAdmin();

    const { error } = await supabase.from('agenda_bloqueos').insert({
      inicio: input.inicioISO,
      fin: input.finISO,
      motivo: input.motivo?.slice(0, 240) ?? null,
      dia_completo: input.diaCompleto,
      creado_por: adminId,
      activo: true,
    });

    if (error) return { ok: false, message: error.message };

    revalidatePath('/admin/agenda');
    revalidatePath('/admin');
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'error_desconocido';
    return { ok: false, message };
  }
}

export async function eliminarBloqueoAction(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase
      .from('agenda_bloqueos')
      .update({ activo: false })
      .eq('id', id);

    if (error) return { ok: false, message: error.message };

    revalidatePath('/admin/agenda');
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'error_desconocido';
    return { ok: false, message };
  }
}

interface AplicarPlantillaInput {
  readonly plantillaId: string;
  readonly fechaInicio: string; // 'yyyy-MM-dd'
  readonly fechaFin: string;    // 'yyyy-MM-dd'
  readonly observaciones: string | null;
}

export async function aplicarPlantillaAction(
  input: AplicarPlantillaInput
): Promise<ActionResult<{ aplicacionId: string }>> {
  try {
    if (!input.plantillaId || !input.fechaInicio || !input.fechaFin) {
      return { ok: false, message: 'parametros_incompletos' };
    }
    if (input.fechaFin < input.fechaInicio) {
      return { ok: false, message: 'rango_invalido' };
    }

    const { supabase, adminId } = await requireAdmin();

    // Adminid se conserva para auditoría futura vía trigger; la tabla APA
    // aún no tiene `creado_por` en su esquema base 0014.
    void adminId;

    const { data, error } = await supabase
      .from('agenda_plantilla_aplicaciones')
      .insert({
        plantilla_id: input.plantillaId,
        fecha_desde: input.fechaInicio,
        fecha_hasta: input.fechaFin,
        nota: input.observaciones?.slice(0, 240) ?? null,
      })
      .select('id')
      .single<{ id: string }>();

    if (error || !data) {
      return { ok: false, message: error?.message ?? 'no_creado' };
    }

    revalidatePath('/admin/agenda');
    return { ok: true, data: { aplicacionId: data.id } };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'error_desconocido';
    return { ok: false, message };
  }
}

export async function cancelarAplicacionPlantillaAction(
  id: string
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase
      .from('agenda_plantilla_aplicaciones')
      .update({ activo: false })
      .eq('id', id);

    if (error) return { ok: false, message: error.message };

    revalidatePath('/admin/agenda');
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'error_desconocido';
    return { ok: false, message };
  }
}
