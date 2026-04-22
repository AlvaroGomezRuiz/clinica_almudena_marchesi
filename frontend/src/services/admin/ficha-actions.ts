'use server';

/**
 * Server Actions de la ficha clínica del paciente.
 *
 * F5 CIFRADO: consumen RPCs admin-only SECURITY DEFINER que cifran en
 * escritura y desencriptan bajo demanda usando la master key del vault.
 *
 * Alcance:
 *   - revelarCampoSensibleAction: llama a `paciente_revelar_campo` que
 *     desencripta el campo + registra en `admin_lookups` (RGPD art. 30).
 *   - actualizarTagsPacienteAction: mantiene el array `pacientes.tags`.
 *   - crearDiagnosticoAction / desactivarDiagnosticoAction → RPC cifrada.
 *   - crearMedicacionAction / desactivarMedicacionAction → RPC cifrada.
 *
 * Seguridad: todas las acciones verifican role=admin (defense-in-depth
 * sobre el check ya presente en cada RPC SECURITY DEFINER).
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
  | 'contacto_emergencia_nombre'
  | 'contacto_emergencia_telefono'
  | 'alergias'
  | 'medicacion_base'
  | 'objetivos'
  | 'motivo_consulta'
  | 'motivo_consulta_inicial'
  | 'preferencias_clinicas';

const CAMPOS_VALIDOS: readonly CampoSensible[] = [
  'dni_nie',
  'nombre_completo',
  'telefono',
  'email',
  'direccion',
  'contacto_emergencia_nombre',
  'contacto_emergencia_telefono',
  'alergias',
  'medicacion_base',
  'objetivos',
  'motivo_consulta',
  'motivo_consulta_inicial',
  'preferencias_clinicas',
];

export interface RevelarCampoResult {
  readonly campo: CampoSensible;
  readonly plaintext: string | null;
  readonly timestamp: string;
}

/**
 * Ficha sensible del paciente descifrada en una sola llamada (RPC
 * `paciente_ficha_sensibles_bulk`, migración 0027). Registra UNA entrada
 * `acceso_ficha_completa` en admin_lookups (RGPD art. 30).
 *
 * Devuelve plaintext de TODOS los campos cifrados. Campos vacíos vienen
 * como null. Seguridad garantizada por el check is_admin() de la RPC.
 */
export interface FichaSensiblesBulk {
  readonly nombre_completo: string | null;
  readonly dni_nie: string | null;
  readonly telefono: string | null;
  readonly email: string | null;
  readonly direccion: string | null;
  readonly contacto_emergencia_nombre: string | null;
  readonly contacto_emergencia_telefono: string | null;
  readonly alergias: string | null;
  readonly medicacion_base: string | null;
  readonly objetivos: string | null;
  readonly motivo_consulta: string | null;
  readonly motivo_consulta_inicial: string | null;
  readonly preferencias_clinicas: string | null;
}

export async function fichaSensiblesBulkAction(
  pacienteId: string,
  justificacion: string | null = null
): Promise<ActionResult<FichaSensiblesBulk>> {
  try {
    if (!pacienteId) return { ok: false, message: 'paciente_requerido' };
    const { supabase } = await requireAdmin();
    const { data, error } = await (supabase.rpc as unknown as (
      fn: 'paciente_ficha_sensibles_bulk',
      args: { p_id: string; p_justificacion: string | null }
    ) => Promise<{ data: FichaSensiblesBulk | null; error: { message: string } | null }>)(
      'paciente_ficha_sensibles_bulk',
      {
        p_id: pacienteId,
        p_justificacion: justificacion?.slice(0, 240) ?? null,
      }
    );
    if (error) return { ok: false, message: error.message };
    return { ok: true, data: data ?? emptyBulk() };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'error_desconocido';
    return { ok: false, message };
  }
}

function emptyBulk(): FichaSensiblesBulk {
  return {
    nombre_completo: null,
    dni_nie: null,
    telefono: null,
    email: null,
    direccion: null,
    contacto_emergencia_nombre: null,
    contacto_emergencia_telefono: null,
    alergias: null,
    medicacion_base: null,
    objetivos: null,
    motivo_consulta: null,
    motivo_consulta_inicial: null,
    preferencias_clinicas: null,
  };
}

/**
 * Desencripta un campo sensible y registra el acceso en admin_lookups.
 * Delegado completamente a la RPC `paciente_revelar_campo`, que:
 *   1. Verifica rol admin (código 42501 si no).
 *   2. Lee el ciphertext de la columna apropiada.
 *   3. Llama a `registrar_consulta_sensible` (RGPD art. 30).
 *   4. Devuelve plaintext desencriptado.
 *
 * @throws Error si campo no está en whitelist o el paciente no existe.
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

    const { data: plaintext, error } = await supabase.rpc(
      'paciente_revelar_campo',
      {
        p_id: pacienteId,
        p_campo: campo,
        p_justificacion: motivo?.slice(0, 240) ?? null,
      }
    );

    if (error) return { ok: false, message: error.message };

    return {
      ok: true,
      data: {
        campo,
        plaintext: (plaintext as string | null) ?? null,
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

    const { supabase } = await requireAdmin();

    // RPC cifrada (0023_cifrado_rpcs_crud): inserta con ciphertext + plaintext mirror.
    const { error } = await supabase.rpc('diagnostico_crear_cifrado', {
      p_paciente_id: input.pacienteId,
      p_titulo: input.titulo.slice(0, 200),
      p_cie_code: input.cieCode?.slice(0, 20) ?? null,
      p_descripcion: input.descripcion?.slice(0, 1000) ?? null,
      p_notas: null,
      p_severidad: input.severidad,
      p_estado: 'activo',
      p_fecha_inicio:
        input.fechaInicio ?? new Date().toISOString().slice(0, 10),
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

    const { supabase } = await requireAdmin();

    // RPC cifrada (0023_cifrado_rpcs_crud): notas cifradas + nombre plaintext.
    const { error } = await supabase.rpc('medicacion_crear_cifrada', {
      p_paciente_id: input.pacienteId,
      p_nombre: input.nombre.slice(0, 200),
      p_dosis: input.dosis?.slice(0, 100) ?? null,
      p_frecuencia: input.frecuencia?.slice(0, 100) ?? null,
      p_via: input.via?.slice(0, 40) ?? null,
      p_prescrita_por: input.prescritaPor?.slice(0, 120) ?? null,
      p_notas: input.notas?.slice(0, 1000) ?? null,
      p_fecha_inicio:
        input.fechaInicio ?? new Date().toISOString().slice(0, 10),
      p_fecha_fin: null,
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
