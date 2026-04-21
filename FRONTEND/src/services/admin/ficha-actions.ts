'use server';

/**
 * Server Actions de la ficha clínica del paciente.
 *
 * Alcance:
 *   - revelarCampoSensibleAction: registra en `admin_lookups` y devuelve
 *     metadatos para que el frontend muestre el campo plaintext. La
 *     desencriptación real vive en una Edge Function / FastAPI (F5); mientras
 *     tanto devolvemos la marca de auditoría y un placeholder descriptivo.
 *   - actualizarTagsPacienteAction: mantiene el array `pacientes.tags`.
 *   - crearDiagnosticoAction / actualizarDiagnosticoAction / desactivarDiagnosticoAction.
 *   - crearMedicacionAction / desactivarMedicacionAction.
 *
 * Seguridad: todas las acciones verifican role=admin.
 */

import { revalidatePath } from 'next/cache';

import { createServerClient } from '@/lib/supabase/server';

type ActionResult<T = undefined> =
  | (T extends undefined ? { ok: true } : { ok: true; data: T })
  | { ok: false; message: string };

async function requireAdmin(): Promise<{
  supabase: ReturnType<typeof createServerClient>;
  adminId: string;
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
  return { supabase, adminId: user.id };
}

/**
 * Campos sensibles soportados por la ficha. Se validan contra esta whitelist
 * antes de cualquier RPC de desencriptación.
 */
export type CampoSensible =
  | 'dni_nie'
  | 'nombre_completo'
  | 'telefono'
  | 'email'
  | 'direccion'
  | 'contacto_emergencia'
  | 'alergias'
  | 'medicacion_base'
  | 'objetivos';

const CAMPOS_VALIDOS: readonly CampoSensible[] = [
  'dni_nie',
  'nombre_completo',
  'telefono',
  'email',
  'direccion',
  'contacto_emergencia',
  'alergias',
  'medicacion_base',
  'objetivos',
];

export interface RevelarCampoResult {
  readonly lookupId: string;
  readonly campo: CampoSensible;
  readonly placeholder: string;
  readonly timestamp: string;
}

/**
 * Audita el acceso y devuelve metadatos para que el cliente muestre el
 * valor "revelado". La desencriptación real viaja por una Edge Function
 * (F5) con la clave maestra en Vault + KMS.
 *
 * @throws Error si campo no está en whitelist, o el paciente no existe.
 */
export async function revelarCampoSensibleAction(
  pacienteId: string,
  campo: CampoSensible,
  motivo: string | null = null
): Promise<ActionResult<RevelarCampoResult>> {
  try {
    if (!CAMPOS_VALIDOS.includes(campo)) {
      return { ok: false, message: 'campo_no_permitido' };
    }
    if (!pacienteId) {
      return { ok: false, message: 'paciente_requerido' };
    }

    const { supabase } = await requireAdmin();

    // Registrar consulta sensible (RPC definida en migración 0012)
    const { data: lookupId, error } = await supabase.rpc(
      'registrar_consulta_sensible',
      {
        p_paciente_id: pacienteId,
        p_campo: campo,
        p_motivo: motivo?.slice(0, 240) ?? null,
      }
    );

    if (error) return { ok: false, message: error.message };

    return {
      ok: true,
      data: {
        lookupId: (lookupId as string | null) ?? '',
        campo,
        // Placeholder: la desencriptación real vive en F5. Mientras tanto,
        // dejamos un hint consistente que indica "campo disponible, pendiente
        // pipeline de decrypt" para no bloquear el UX.
        placeholder: '•••• (decrypt pendiente F5)',
        timestamp: new Date().toISOString(),
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'error_desconocido';
    return { ok: false, message };
  }
}

// ─── Tags ───────────────────────────────────────────────────────────────────
export async function actualizarTagsPacienteAction(
  pacienteId: string,
  tags: readonly string[]
): Promise<ActionResult> {
  try {
    const clean = Array.from(
      new Set(
        tags
          .map((t) => t.trim().slice(0, 32))
          .filter((t) => t.length > 0)
      )
    ).slice(0, 20);

    const { supabase } = await requireAdmin();

    const { error } = await supabase
      .from('pacientes')
      .update({ tags: clean, updated_at: new Date().toISOString() })
      .eq('id', pacienteId);

    if (error) return { ok: false, message: error.message };

    revalidatePath(`/admin/pacientes/${pacienteId}`);
    revalidatePath('/admin/pacientes');
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'error_desconocido';
    return { ok: false, message };
  }
}

// ─── Diagnósticos ───────────────────────────────────────────────────────────
interface CrearDiagnosticoInput {
  readonly pacienteId: string;
  readonly cieCode: string | null;
  readonly titulo: string;
  readonly descripcion: string | null;
  readonly severidad: 'leve' | 'moderado' | 'severo' | null;
  readonly fechaInicio: string | null;
}

export async function crearDiagnosticoAction(
  input: CrearDiagnosticoInput
): Promise<ActionResult> {
  try {
    if (!input.titulo.trim()) {
      return { ok: false, message: 'titulo_requerido' };
    }

    const { supabase, adminId } = await requireAdmin();

    const { error } = await supabase.from('paciente_diagnosticos').insert({
      paciente_id: input.pacienteId,
      cie_code: input.cieCode?.slice(0, 20) ?? null,
      titulo: input.titulo.slice(0, 200),
      descripcion: input.descripcion?.slice(0, 1000) ?? null,
      severidad: input.severidad,
      estado: 'activo',
      fecha_inicio: input.fechaInicio ?? new Date().toISOString().slice(0, 10),
      created_by: adminId,
      activo: true,
    });

    if (error) return { ok: false, message: error.message };

    revalidatePath(`/admin/pacientes/${input.pacienteId}`);
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'error_desconocido';
    return { ok: false, message };
  }
}

export async function desactivarDiagnosticoAction(
  diagnosticoId: string,
  pacienteId: string
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase
      .from('paciente_diagnosticos')
      .update({ activo: false })
      .eq('id', diagnosticoId);

    if (error) return { ok: false, message: error.message };

    revalidatePath(`/admin/pacientes/${pacienteId}`);
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'error_desconocido';
    return { ok: false, message };
  }
}

// ─── Medicación ─────────────────────────────────────────────────────────────
interface CrearMedicacionInput {
  readonly pacienteId: string;
  readonly nombre: string;
  readonly dosis: string | null;
  readonly frecuencia: string | null;
  readonly via: string | null;
  readonly prescritaPor: string | null;
  readonly fechaInicio: string | null;
  readonly notas: string | null;
}

export async function crearMedicacionAction(
  input: CrearMedicacionInput
): Promise<ActionResult> {
  try {
    if (!input.nombre.trim()) {
      return { ok: false, message: 'nombre_requerido' };
    }

    const { supabase, adminId } = await requireAdmin();

    const { error } = await supabase.from('paciente_medicacion').insert({
      paciente_id: input.pacienteId,
      nombre: input.nombre.slice(0, 200),
      dosis: input.dosis?.slice(0, 100) ?? null,
      frecuencia: input.frecuencia?.slice(0, 100) ?? null,
      via: input.via?.slice(0, 40) ?? null,
      prescrita_por: input.prescritaPor?.slice(0, 120) ?? null,
      fecha_inicio: input.fechaInicio ?? new Date().toISOString().slice(0, 10),
      notas: input.notas?.slice(0, 1000) ?? null,
      created_by: adminId,
      activo: true,
    });

    if (error) return { ok: false, message: error.message };

    revalidatePath(`/admin/pacientes/${input.pacienteId}`);
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'error_desconocido';
    return { ok: false, message };
  }
}

export async function desactivarMedicacionAction(
  medicacionId: string,
  pacienteId: string
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase
      .from('paciente_medicacion')
      .update({ activo: false })
      .eq('id', medicacionId);

    if (error) return { ok: false, message: error.message };

    revalidatePath(`/admin/pacientes/${pacienteId}`);
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'error_desconocido';
    return { ok: false, message };
  }
}
