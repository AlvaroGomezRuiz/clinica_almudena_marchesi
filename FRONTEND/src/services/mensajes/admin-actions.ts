'use server';

/**
 * Server Actions del chat que SOLO puede ejecutar el admin.
 *
 * - abrirConversacionConPaciente: devuelve (o crea) la conversación con
 *   un paciente dado. Idempotente: si ya existe una abierta, la reutiliza.
 */

import { revalidatePath } from 'next/cache';

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
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle<{ id: string; role: 'admin' | 'paciente' }>();

  if (profile?.role !== 'admin') throw new Error('forbidden');
  return { supabase };
}

interface ConversacionLite {
  readonly id: string;
  readonly paciente_id: string;
}

export async function abrirConversacionConPaciente(
  pacienteId: string
): Promise<ActionResult<{ conversacionId: string }>> {
  try {
    if (!/^[0-9a-f-]{36}$/i.test(pacienteId)) {
      return { ok: false, message: 'paciente_invalido' };
    }
    const { supabase } = await requireAdmin();

    // ¿Ya existe una conversación abierta con este paciente?
    const { data: existente } = await supabase
      .from('conversaciones')
      .select('id, paciente_id')
      .eq('paciente_id', pacienteId)
      .eq('estado', 'abierta')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const existenteTyped = existente as unknown as ConversacionLite | null;
    if (existenteTyped) {
      return { ok: true, data: { conversacionId: existenteTyped.id } };
    }

    // Creamos nueva (admin puede por RLS conv_admin_insert)
    const { data: creada, error } = await supabase
      .from('conversaciones')
      .insert({
        paciente_id: pacienteId,
        estado: 'abierta',
        unread_admin: 0,
        unread_paciente: 0,
      })
      .select('id, paciente_id')
      .maybeSingle();

    if (error) return { ok: false, message: error.message };
    const creadaTyped = creada as unknown as ConversacionLite | null;
    if (!creadaTyped) {
      return { ok: false, message: 'sin_respuesta' };
    }

    revalidatePath('/admin/mensajes');
    return { ok: true, data: { conversacionId: creadaTyped.id } };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'error_desconocido';
    return { ok: false, message };
  }
}
