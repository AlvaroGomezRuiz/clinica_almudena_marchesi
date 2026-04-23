'use server';

/**
 * Server Actions para gestión de recursos desde admin.
 * - asignarRecursoAction: invoca Edge Fn `assign-recurso` con JWT del admin.
 * - listarPacientesParaAsignarAction: devuelve pacientes activos con nombre
 *   derivado de profiles.display_name (fallback: últimos 8 chars del bidx).
 */

import { createServerClient } from '@/lib/supabase/server';
import { getSupabaseEnv } from '@/lib/supabase/env';

const UUID_RE = /^[0-9a-f-]{36}$/i;

export type AsignarRecursoResult =
  | { readonly ok: true; readonly yaExistia: boolean }
  | { readonly ok: false; readonly code: string; readonly message: string };

export async function asignarRecursoAction(
  recursoId: string,
  pacienteId: string
): Promise<AsignarRecursoResult> {
  if (!UUID_RE.test(recursoId) || !UUID_RE.test(pacienteId)) {
    return { ok: false, code: 'invalid_input', message: 'Identificadores inválidos.' };
  }

  const supabase = createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { ok: false, code: 'unauthorized', message: 'Sesión expirada.' };
  }

  const { url: supabaseUrl, anonKey } = getSupabaseEnv();

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/assign-recurso`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: anonKey,
      },
      body: JSON.stringify({ recurso_id: recursoId, paciente_id: pacienteId }),
    });

    const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (!res.ok) {
      const code =
        res.status === 403 ? 'forbidden'
          : res.status === 404 ? 'not_found'
          : res.status === 401 ? 'unauthorized'
          : 'unknown';
      const msg =
        code === 'forbidden'
          ? 'Solo admin puede asignar recursos.'
          : code === 'not_found'
            ? 'Recurso o paciente no encontrado.'
            : typeof raw.detail === 'string' ? raw.detail : 'Error al asignar.';
      return { ok: false, code, message: msg };
    }

    return { ok: true, yaExistia: Boolean(raw.ya_existia) };
  } catch (err) {
    return {
      ok: false,
      code: 'network',
      message: err instanceof Error ? err.message : 'Error de red.',
    };
  }
}

export interface PacienteOption {
  readonly id: string;
  readonly label: string;
  readonly fechaAlta: string;
}

export async function listarPacientesParaAsignarAction(): Promise<readonly PacienteOption[]> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('pacientes')
    .select(
      `id,
       nombre_completo_bidx,
       fecha_alta,
       user_id,
       profile:profiles!pacientes_user_id_fkey (display_name, email)`
    )
    .eq('activo', true)
    .order('fecha_alta', { ascending: false })
    .limit(200);

  if (error || !data) return [];

  interface Row {
    id: string;
    nombre_completo_bidx: string;
    fecha_alta: string;
    user_id: string | null;
    profile: { display_name: string | null; email: string } | { display_name: string | null; email: string }[] | null;
  }

  const rows = data as unknown as Row[];

  return rows.map((r) => {
    const profile = Array.isArray(r.profile) ? r.profile[0] ?? null : r.profile;
    const label =
      profile?.display_name?.trim() ||
      profile?.email ||
      `Paciente #${r.nombre_completo_bidx.slice(0, 8).toUpperCase()}`;
    return {
      id: r.id,
      label,
      fechaAlta: r.fecha_alta,
    };
  });
}
