'use server';

/**
 * Server Actions del chat (admin ↔ paciente).
 *
 * Las RPC se invocan vía `createServerClient().rpc()` para que el cliente SSR
 * refresque cookies y no dependa de un fetch manual con token desfasado.
 */

import { revalidatePath } from 'next/cache';

import { createServerClient } from '@/lib/supabase/server';

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

  const { data: rows, error } = await supabase.rpc('chat_enviar_mensaje', {
    p_conversacion_id: conversacionId,
    p_contenido: trimmed,
  });

  if (error) {
    const code =
      error.code === '42501' || /forbidden|not_authenticated/i.test(error.message)
        ? 'forbidden'
        : 'unknown';
    return { ok: false, code, message: error.message };
  }

  const row = rows?.[0];
  if (!row) return { ok: false, code: 'unknown', message: 'Sin respuesta del servidor.' };

  revalidatePath('/admin/mensajes');
  revalidatePath('/portal/mensajes');
  revalidatePath('/portal');

  return {
    ok: true,
    mensaje: {
      id: row.id,
      conversation_id: row.conversation_id,
      sender_user_id: row.sender_user_id,
      body: row.body,
      read_at: row.read_at,
      created_at: row.created_at,
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
  if (error || data == null) return null;
  return String(data);
}
