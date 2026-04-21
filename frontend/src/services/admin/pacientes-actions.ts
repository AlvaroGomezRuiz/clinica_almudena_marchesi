'use server';

/**
 * Server Actions de gestión de pacientes (admin).
 *
 * F5 CIFRADO: todas las escrituras usan RPCs `paciente_*_cifrada/o` de la
 * migración 0023_cifrado_rpcs_crud, que cifran AES-256 + generan blind
 * indexes HMAC-SHA256 en la misma transacción.
 *
 * Alcance:
 *   - altaManualPacienteAction: crea paciente desde /admin/pacientes/alta.
 *   - actualizarPacienteSensiblesAction: edita PII cifrada (solo campos
 *     sensibles; tags/color usan actualizarTagsPacienteAction).
 *   - buscarPacientePorCampoAction: lookup por email/dni/telefono usando
 *     el blind index (sin exponer plaintext).
 */

import { revalidatePath } from 'next/cache';

import { captureClinicalError } from '@/lib/sentry';
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

// ─── Alta manual ───────────────────────────────────────────────────────────
export interface AltaPacienteInput {
  readonly nombreCompleto: string;
  readonly dniNie: string;
  readonly telefono: string | null;
  readonly email: string | null;
  readonly fechaNacimiento: string | null;
  readonly direccion: string | null;
  readonly contactoEmergenciaNombre: string | null;
  readonly contactoEmergenciaTelefono: string | null;
  readonly motivoConsultaInicial: string | null;
  readonly experienciaTerapia: string | null;
  readonly consentimientoRgpd: boolean;
  readonly tags: readonly string[];
}

export async function altaManualPacienteAction(
  input: AltaPacienteInput
): Promise<ActionResult<{ id: string }>> {
  try {
    if (!input.consentimientoRgpd) {
      return { ok: false, message: 'consentimiento_rgpd_obligatorio' };
    }
    if (!input.nombreCompleto.trim()) {
      return { ok: false, message: 'nombre_requerido' };
    }
    if (!input.dniNie.trim()) {
      return { ok: false, message: 'dni_nie_requerido' };
    }

    const { supabase } = await requireAdmin();

    const { data: nuevoId, error } = await supabase.rpc(
      'paciente_alta_cifrada',
      {
        p_nombre_completo: input.nombreCompleto.trim().slice(0, 200),
        p_dni_nie: input.dniNie.trim().toUpperCase().slice(0, 12),
        p_telefono: input.telefono?.trim().slice(0, 40) ?? null,
        p_email: input.email?.trim().toLowerCase().slice(0, 200) ?? null,
        p_fecha_nacimiento: input.fechaNacimiento ?? null,
        p_fecha_alta: new Date().toISOString().slice(0, 10),
        p_direccion: input.direccion?.slice(0, 300) ?? null,
        p_contacto_emergencia_nombre:
          input.contactoEmergenciaNombre?.slice(0, 200) ?? null,
        p_contacto_emergencia_telefono:
          input.contactoEmergenciaTelefono?.slice(0, 40) ?? null,
        p_alergias: null,
        p_medicacion_base: null,
        p_objetivos: null,
        p_motivo_consulta_inicial:
          input.motivoConsultaInicial?.slice(0, 2000) ?? null,
        p_experiencia_terapia: input.experienciaTerapia?.slice(0, 500) ?? null,
        p_consentimiento_rgpd: true,
        p_tags: Array.from(new Set(input.tags.map((t) => t.trim()))).slice(0, 20),
        p_color_etiqueta: null,
      }
    );

    if (error) {
      captureClinicalError(error, {
        area: 'admin-sensitive',
        operation: 'paciente_alta_cifrada',
        fingerprint: ['pacientes', 'alta-cifrada'],
      });
      return { ok: false, message: error.message };
    }

    revalidatePath('/admin/pacientes');
    return { ok: true, data: { id: String(nuevoId) } };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'error_desconocido';
    return { ok: false, message };
  }
}

// ─── Edición de campos sensibles ───────────────────────────────────────────
export type CampoEditable =
  | 'nombre_completo'
  | 'dni_nie'
  | 'telefono'
  | 'email'
  | 'direccion'
  | 'contacto_emergencia_nombre'
  | 'contacto_emergencia_telefono'
  | 'alergias'
  | 'medicacion_base'
  | 'objetivos'
  | 'motivo_consulta_inicial'
  | 'motivo_consulta'
  | 'experiencia_terapia'
  | 'fecha_nacimiento'
  | 'color_etiqueta';

const CAMPOS_EDITABLES: readonly CampoEditable[] = [
  'nombre_completo',
  'dni_nie',
  'telefono',
  'email',
  'direccion',
  'contacto_emergencia_nombre',
  'contacto_emergencia_telefono',
  'alergias',
  'medicacion_base',
  'objetivos',
  'motivo_consulta_inicial',
  'motivo_consulta',
  'experiencia_terapia',
  'fecha_nacimiento',
  'color_etiqueta',
];

export async function actualizarPacienteSensiblesAction(
  pacienteId: string,
  cambios: Readonly<Record<string, string | null>>
): Promise<ActionResult> {
  try {
    if (!pacienteId) return { ok: false, message: 'paciente_requerido' };

    const filtrados: Record<string, string | null> = {};
    for (const [k, v] of Object.entries(cambios)) {
      if ((CAMPOS_EDITABLES as readonly string[]).includes(k)) {
        filtrados[k] = v === null || v === '' ? null : String(v).slice(0, 2000);
      }
    }
    if (Object.keys(filtrados).length === 0) {
      return { ok: false, message: 'ningun_cambio_valido' };
    }

    const { supabase } = await requireAdmin();

    const { error } = await supabase.rpc('paciente_actualizar_cifrado', {
      p_id: pacienteId,
      p_cambios: filtrados,
    });

    if (error) {
      captureClinicalError(error, {
        area: 'admin-sensitive',
        operation: 'paciente_actualizar_cifrado',
        patient_id: pacienteId,
        fingerprint: ['pacientes', 'actualizar-cifrado'],
      });
      return { ok: false, message: error.message };
    }

    revalidatePath(`/admin/pacientes/${pacienteId}`);
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'error_desconocido';
    return { ok: false, message };
  }
}

// ─── Búsqueda por blind index ──────────────────────────────────────────────
export async function buscarPacientePorCampoAction(
  campo: 'email' | 'dni_nie' | 'telefono',
  valor: string
): Promise<ActionResult<{ id: string | null }>> {
  try {
    if (!valor || valor.trim().length === 0) {
      return { ok: true, data: { id: null } };
    }
    const { supabase } = await requireAdmin();

    const { data: id, error } = await supabase.rpc(
      'paciente_buscar_por_campo',
      {
        p_campo: campo,
        p_valor: valor.trim(),
      }
    );

    if (error) return { ok: false, message: error.message };
    return { ok: true, data: { id: (id as string | null) ?? null } };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'error_desconocido';
    return { ok: false, message };
  }
}
