'use server';

/**
 * Server Actions del panel admin (Almudena-only).
 *
 * Alcance:
 *   - actualizarNotaGlobalAction: persiste la "nota rápida" de facturación
 *     (public.facturacion_nota singleton, row id=1) con autosave.
 *   - listarPacientesQuickAction: pequeño lookup {id, display_name, email}
 *     usado por el FAB "Nuevo mensaje" / "Nueva cita".
 *
 * Todas las actions verifican sesión + role='admin' antes de cualquier
 * escritura (defense-in-depth: RLS ya lo exige, pero fallamos pronto).
 */

import { revalidatePath } from 'next/cache';

import { createServerClient } from '@/lib/supabase/server';

interface QuickPaciente {
  readonly id: string;
  readonly display_name: string;
  readonly email: string;
}

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

  if (error || !user) {
    throw new Error('not_authenticated');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle<{ id: string; role: 'admin' | 'paciente' }>();

  if (profileError || profile?.role !== 'admin') {
    throw new Error('forbidden');
  }

  return { supabase, adminId: user.id };
}

/**
 * Persiste la nota rápida global (singleton facturacion_nota).
 * Usa update directo por PK=1. Se llama con debounce desde el cliente.
 */
export async function actualizarNotaGlobalAction(
  nota: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const trimmed = nota.slice(0, 4000); // límite razonable
    const { supabase, adminId } = await requireAdmin();

    const { error } = await supabase
      .from('facturacion_nota')
      .update({
        nota: trimmed,
        updated_by: adminId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);

    if (error) {
      return { ok: false, message: error.message };
    }

    revalidatePath('/admin');
    revalidatePath('/admin/facturacion');
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'error_desconocido';
    return { ok: false, message };
  }
}

/**
 * Lookup rápido de pacientes activos para el FAB.
 * Límite 50 resultados. Búsqueda ilike sobre display_name y email del profile.
 *
 * IMPORTANTE: devuelve `pacientes.id` (NO `profiles.id`). Este id es el que
 * exige la FK de `conversaciones.paciente_id → pacientes.id`. Confundirlos
 * provoca el error "conversaciones_paciente_id_fkey" que se veía al abrir
 * conversación desde /admin/mensajes (bug reportado 22-abr-2026).
 */
export async function listarPacientesQuickAction(
  query: string
): Promise<readonly QuickPaciente[]> {
  const { supabase } = await requireAdmin();

  const q = query.trim();
  const filter = q.length > 0 ? `%${q.replace(/[%_\\]/g, '\\$&')}%` : '%';

  // Query: `pacientes` con inner join a `profiles` para filtrar por nombre/email
  // y obtener sólo pacientes reales (no sólo perfiles con role='paciente' que
  // puedan no tener ficha clínica).
  const { data, error } = await supabase
    .from('pacientes')
    .select('id, profiles!inner(id, display_name, email, role)')
    .eq('profiles.role', 'paciente')
    .or(
      `display_name.ilike.${filter},email.ilike.${filter}`,
      { foreignTable: 'profiles' }
    )
    .order('display_name', { ascending: true, foreignTable: 'profiles' })
    .limit(50);

  if (error || !data) return [];

  return data
    .filter((row) => row.profiles)
    .map((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      return {
        id: row.id,
        display_name: profile.display_name ?? profile.email.split('@')[0],
        email: profile.email,
      };
    });
}

/* ─────────────────────────────────────────────────────────────────────── */
/* Catálogo de servicios + Asignación manual de bono                       */
/* ─────────────────────────────────────────────────────────────────────── */

export interface ServicioCatalogo {
  readonly id: string;
  readonly nombre: string;
  readonly duracion_minutos: number;
  readonly precio_centimos: number;
}

/**
 * Devuelve el catálogo de servicios activos para el selector del modal
 * de asignación manual. Cacheado 60s por petición (ISR dinámico).
 */
export async function listarServiciosCatalogoAction(): Promise<
  readonly ServicioCatalogo[]
> {
  const { supabase } = await requireAdmin();

  const { data, error } = await supabase
    .from('servicios')
    .select('id, nombre, duracion_minutos, precio_centimos')
    .eq('activo', true)
    .order('precio_centimos', { ascending: true });

  if (error || !data) return [];
  return data as readonly ServicioCatalogo[];
}

export type MetodoPagoManual = 'tarjeta' | 'transferencia' | 'regalo' | 'klarna';

export interface AsignarBonoManualInput {
  readonly paciente_id: string;
  readonly servicio_id: string;
  readonly sesiones: number;
  readonly metodo: MetodoPagoManual;
  readonly importe_centimos: number;
  readonly validez_dias: number;
  readonly notas?: string;
  readonly excluir_facturacion?: boolean;
}

export type AsignarBonoManualResult =
  | { ok: true; bono_id: string; pago_id: string }
  | { ok: false; message: string };

/**
 * Invoca el RPC `bono_asignar_manual` (migration 0040). Crea bono +
 * pago + entrada de auditoría en una transacción.
 *
 * Validaciones de entrada (client-side + redundantes server-side):
 *   - paciente_id, servicio_id: uuid no vacíos
 *   - sesiones: 1..50
 *   - importe_centimos: >= 0 (si 0 o método regalo → auto-excluir facturación)
 *   - validez_dias: 1..730 (2 años máx) o null
 */
export async function asignarBonoManualAction(
  input: AsignarBonoManualInput
): Promise<AsignarBonoManualResult> {
  try {
    const { supabase } = await requireAdmin();

    if (!input.paciente_id || !input.servicio_id) {
      return { ok: false, message: 'paciente y servicio son obligatorios' };
    }
    if (!Number.isInteger(input.sesiones) || input.sesiones < 1 || input.sesiones > 50) {
      return { ok: false, message: 'sesiones fuera de rango (1-50)' };
    }
    if (!Number.isInteger(input.importe_centimos) || input.importe_centimos < 0) {
      return { ok: false, message: 'importe inválido' };
    }
    if (!['tarjeta', 'transferencia', 'regalo', 'klarna'].includes(input.metodo)) {
      return { ok: false, message: 'método de pago inválido' };
    }
    if (!Number.isInteger(input.validez_dias) || input.validez_dias < 1 || input.validez_dias > 730) {
      return { ok: false, message: 'validez inválida (1-730 días)' };
    }

    const { data, error } = await supabase.rpc('bono_asignar_manual', {
      p_paciente_id: input.paciente_id,
      p_servicio_id: input.servicio_id,
      p_sesiones: input.sesiones,
      p_metodo: input.metodo,
      p_importe_centimos: input.importe_centimos,
      p_validez_dias: input.validez_dias,
      p_notas: input.notas ?? null,
      p_excluir_facturacion: input.excluir_facturacion ?? false,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.bono_id || !row?.pago_id) {
      return { ok: false, message: 'respuesta inválida del servidor' };
    }

    revalidatePath('/admin/facturacion');
    revalidatePath('/admin/pacientes');
    revalidatePath(`/admin/pacientes/${input.paciente_id}`);

    return { ok: true, bono_id: row.bono_id as string, pago_id: row.pago_id as string };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'error_desconocido';
    return { ok: false, message };
  }
}
