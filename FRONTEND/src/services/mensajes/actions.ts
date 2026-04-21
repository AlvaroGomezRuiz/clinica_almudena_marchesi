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

interface SendOk {
  readonly ok: true;
  readonly mensaje: {
    readonly id: string;
    readonly conversation_id: string;
    readonly sender_user_id: string;
    readonly body_ciphertext: string;
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
  const { data, error } = await supabase.rpc('chat_enviar_mensaje', {
    p_conversacion_id: conversacionId,
    p_contenido: trimmed,
  });

  if (error) {
    const code: ActionError['code'] =
      error.code === '42501' ? 'forbidden' : 'unknown';
    return { ok: false, code, message: error.message };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { ok: false, code: 'unknown', message: 'Sin respuesta del servidor.' };

  return {
    ok: true,
    mensaje: {
      id: String(row.id),
      conversation_id: String(row.conversation_id),
      sender_user_id: String(row.sender_user_id),
      body_ciphertext: String(row.body_ciphertext),
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
  await supabase.rpc('chat_marcar_leidos', { p_conversacion_id: conversacionId });

  revalidatePath('/admin/mensajes');
  revalidatePath('/portal/mensajes');
}

// ---------------------------------------------------------------------------
// Obtener o crear la conversación del paciente actual
// ---------------------------------------------------------------------------
export async function getMiConversacionId(): Promise<string | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase.rpc('chat_mi_conversacion');
  if (error || !data) return null;
  return String(data);
}
