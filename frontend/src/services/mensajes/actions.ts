'use server';

/**
 * Server Actions del chat (admin ↔ paciente).
 *
 * Todo pasa por RPCs definidas en la migración 0006_chat.sql:
 *   * chat_mi_conversacion()          → devuelve/crea la conversación del paciente
 *   * chat_enviar_mensaje(id, texto)  → inserta mensaje + actualiza unread
 *   * chat_marcar_leidos(id)          → resetea unread del invocador
 *
 * Validación defensiva en servidor (length, trim) además del check SQL.
 */

import { revalidatePath } from 'next/cache';

import { createServerClient } from '@/lib/supabase/server';
import { getSupabaseEnv } from '@/lib/supabase/env';

interface SendOk {
  readonly ok: true;
  readonly mensaje: {
    readonly id: string;
    readonly conversation_id: string;
    readonly sender_user_id: string;
    readonly body: string;
    readonly read_at: string | null;
    readonly created_at: string;
  };
}

interface ActionError {
  readonly ok: false;
  readonly code: 'empty' | 'too_long' | 'forbidden' | 'unknown';
  readonly message: string;
}

type ActionResult = SendOk | ActionError;

const MAX_LENGTH = 4000;

// ---------------------------------------------------------------------------
// Enviar mensaje
// ---------------------------------------------------------------------------
export async function sendMensajeAction(
  conversacionId: string,
  contenido: string
): Promise<ActionResult> {
  const trimmed = contenido.trim();
  if (!trimmed) return { ok: false, code: 'empty', message: 'El mensaje está vacío.' };
  if (trimmed.length > MAX_LENGTH) {
    return { ok: false, code: 'too_long', message: `Máximo ${MAX_LENGTH} caracteres.` };
  }
  if (!/^[0-9a-f-]{36}$/i.test(conversacionId)) {
    return { ok: false, code: 'forbidden', message: 'Conversación inválida.' };
  }

  const supabase = createServerClient();
  let data: unknown;
  try {
    data = await rpcPost(supabase, 'chat_enviar_mensaje', {
      p_conversacion_id: conversacionId,
      p_contenido: trimmed,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { ok: false, code: 'unknown', message: msg };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { ok: false, code: 'unknown', message: 'Sin respuesta del servidor.' };

  return {
    ok: true,
    mensaje: {
      id: String(row.id),
      conversation_id: String(row.conversation_id),
      sender_user_id: String(row.sender_user_id),
      body: String(row.body),
      read_at: row.read_at ? String(row.read_at) : null,
      created_at: String(row.created_at),
    },
  };
}

// ---------------------------------------------------------------------------
// Marcar mensajes como leídos (reset unread del usuario actual)
// ---------------------------------------------------------------------------
export async function marcarLeidosAction(conversacionId: string): Promise<void> {
  if (!/^[0-9a-f-]{36}$/i.test(conversacionId)) return;

  const supabase = createServerClient();
  await rpcPost(supabase, 'chat_marcar_leidos', { p_conversacion_id: conversacionId });

  revalidatePath('/admin/mensajes');
  revalidatePath('/portal/mensajes');
}

// ---------------------------------------------------------------------------
// Obtener o crear la conversación del paciente actual
// ---------------------------------------------------------------------------
export async function getMiConversacionId(): Promise<string | null> {
  const supabase = createServerClient();
  try {
    const data = await rpcPost(supabase, 'chat_mi_conversacion', {});
    if (!data) return null;
    return String(data);
  } catch {
    return null;
  }
}

async function rpcPost<T>(
  supabase: ReturnType<typeof createServerClient>,
  fn: string,
  args: Record<string, unknown>
): Promise<T> {
  const { url, anonKey } = getSupabaseEnv();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.access_token) {
    throw new Error('No hay sesión válida para ejecutar la RPC.');
  }

  const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`RPC ${fn} falló (${res.status}): ${detail}`);
  }

  return (await res.json()) as T;
}
