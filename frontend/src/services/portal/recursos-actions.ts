'use server';

/**
 * Server actions del portal paciente para la biblioteca de recursos.
 *
 * Alcance:
 *   - marcarRecursoCompletadoAction: fija `completed_at = now()` o lo limpia,
 *     según el estado actual. RLS de Supabase ya garantiza que el paciente
 *     sólo puede actualizar SUS asignaciones (paciente_id = current_paciente_id()).
 */

import { revalidatePath } from 'next/cache';

import { createServerClient } from '@/lib/supabase/server';

type ActionResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly message: string };

/**
 * Toggle del estado "completado" para una asignación concreta.
 * - `completed = true`  → fija completed_at = now()
 * - `completed = false` → completed_at = null
 */
export async function marcarRecursoCompletadoAction(
  asignacionId: string,
  completed: boolean
): Promise<ActionResult> {
  try {
    if (!asignacionId) return { ok: false, message: 'id_requerido' };

    const supabase = createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: 'not_authenticated' };

    const { error } = await supabase
      .from('recurso_asignaciones')
      .update({
        completed_at: completed ? new Date().toISOString() : null,
      })
      .eq('id', asignacionId);

    if (error) return { ok: false, message: error.message };

    revalidatePath('/portal/recursos');
    revalidatePath('/portal');
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'error_desconocido';
    return { ok: false, message };
  }
}
