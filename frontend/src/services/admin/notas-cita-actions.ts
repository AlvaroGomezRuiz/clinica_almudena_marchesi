'use server';

/**
 * Server Actions de notas de cita — perfil admin.
 *
 * Flujo:
 *   - guardarNotaCitaAdminAction → RPC `nota_cita_guardar_cifrada` (upsert
 *     por cita_id, cifra con AES-256 + guarda plaintext mirror hasta que
 *     la migración 0025_cifrado_drop_plaintext elimine la columna).
 *   - leerNotaCitaAdminAction → RPC `registro_clinico_descifrar` con
 *     justificacion='lectura_nota_admin' → una entrada en `admin_lookups`.
 *
 * Todas requieren rol admin (la RPC lo valida server-side, aquí repetimos
 * la defensa).
 */

import { revalidatePath } from 'next/cache';

import { captureClinicalError } from '@/lib/sentry';
import { createServerClient } from '@/lib/supabase/server';

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
    .select('role')
    .eq('id', user.id)
    .maybeSingle<{ role: 'admin' | 'paciente' }>();

  if (profile?.role !== 'admin') throw new Error('forbidden');
  return { supabase };
}

export async function guardarNotaCitaAdminAction(
  citaId: string,
  pacienteId: string,
  contenido: string
): Promise<ActionResult<{ id: string }>> {
  try {
    if (!citaId || !pacienteId) {
      return { ok: false, message: 'cita_o_paciente_requerido' };
    }
    const texto = contenido.trim().slice(0, 8000);
    if (texto.length === 0) {
      return { ok: false, message: 'contenido_vacio' };
    }

    const { supabase } = await requireAdmin();

    const { data, error } = await supabase.rpc('nota_cita_guardar_cifrada', {
      p_cita_id: citaId,
      p_paciente_id: pacienteId,
      p_contenido: texto,
    });

    if (error) {
      captureClinicalError(error, {
        area: 'admin-sensitive',
        operation: 'nota_cita_guardar_cifrada',
        patient_id: pacienteId,
        fingerprint: ['citas-notas', 'guardar-cifrada'],
      });
      return { ok: false, message: error.message };
    }

    revalidatePath(`/admin/pacientes/${pacienteId}`);
    return { ok: true, data: { id: String(data) } };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'error_desconocido';
    return { ok: false, message };
  }
}

export async function leerNotaCitaAdminAction(
  notaId: string,
  pacienteId: string
): Promise<ActionResult<{ plaintext: string | null }>> {
  try {
    if (!notaId || !pacienteId) {
      return { ok: false, message: 'nota_o_paciente_requerido' };
    }
    const { supabase } = await requireAdmin();

    // La migración 0023 declara el parámetro como `p_registro_id`; los
    // tipos generados traen `p_id`. Casteamos para usar el nombre real.
    const { data, error } = await (supabase.rpc as unknown as (
      fn: 'registro_clinico_descifrar',
      args: {
        p_tabla: string;
        p_registro_id: string;
        p_campo: string;
        p_paciente_id: string | null;
        p_justificacion: string | null;
      }
    ) => Promise<{ data: string | null; error: { message: string } | null }>)(
      'registro_clinico_descifrar',
      {
        p_tabla: 'citas_notas_paciente',
        p_registro_id: notaId,
        p_campo: 'contenido',
        p_paciente_id: pacienteId,
        p_justificacion: 'lectura_nota_admin',
      }
    );

    if (error) return { ok: false, message: error.message };
    return { ok: true, data: { plaintext: (data as string | null) ?? null } };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'error_desconocido';
    return { ok: false, message };
  }
}
