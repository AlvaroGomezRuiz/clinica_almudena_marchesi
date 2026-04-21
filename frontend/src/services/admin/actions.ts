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
 */
export async function listarPacientesQuickAction(
  query: string
): Promise<readonly QuickPaciente[]> {
  const { supabase } = await requireAdmin();

  const q = query.trim();
  const filter = q.length > 0 ? `%${q.replace(/[%_\\]/g, '\\$&')}%` : '%';

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, email')
    .eq('role', 'paciente')
    .or(`display_name.ilike.${filter},email.ilike.${filter}`)
    .order('display_name', { ascending: true })
    .limit(50);

  if (error || !data) return [];

  return data.map((p) => ({
    id: p.id,
    display_name: p.display_name ?? p.email.split('@')[0],
    email: p.email,
  }));
}
