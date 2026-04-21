import { createServerClient } from '@/lib/supabase/server';
import type { ChatAdjunto, ChatMensaje } from '@/components/chat/ChatPanel';

interface MensajeBase {
  readonly id: string;
  readonly conversation_id: string;
  readonly sender_user_id: string;
  readonly body_ciphertext: string;
  readonly read_at: string | null;
  readonly created_at: string;
}

interface AdjuntoRow {
  readonly id: string;
  readonly mensaje_id: string;
  readonly nombre: string;
  readonly mime: string | null;
  readonly size_bytes: number | null;
  readonly tipo: 'archivo' | 'imagen' | 'audio' | 'video';
  readonly storage_path: string;
}

const SIGNED_TTL_SECONDS = 60 * 60; // 1h

/**
 * Dada una lista de mensajes, carga los adjuntos y firma las URLs del bucket
 * privado `chat-adjuntos`. Devuelve ChatMensaje[] listos para pasar a ChatPanel.
 */
export async function enrichMensajesWithAdjuntos(
  mensajes: readonly MensajeBase[]
): Promise<ChatMensaje[]> {
  if (mensajes.length === 0) return [];

  const supabase = createServerClient();
  const ids = mensajes.map((m) => m.id);

  const { data: adjRows } = await supabase
    .from('mensajes_adjuntos')
    .select('id, mensaje_id, nombre, mime, size_bytes, tipo, storage_path')
    .in('mensaje_id', ids);

  const rows = (adjRows ?? []) as readonly AdjuntoRow[];
  if (rows.length === 0) {
    return mensajes.map((m) => ({ ...m }));
  }

  // Firmar en lote (createSignedUrls acepta paths[])
  const paths = rows.map((r) => r.storage_path);
  const { data: signed } = await supabase.storage
    .from('chat-adjuntos')
    .createSignedUrls(paths, SIGNED_TTL_SECONDS);

  const urlByPath = new Map<string, string>();
  for (const s of signed ?? []) {
    if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl);
  }

  const byMensaje = new Map<string, ChatAdjunto[]>();
  for (const r of rows) {
    const arr = byMensaje.get(r.mensaje_id) ?? [];
    arr.push({
      id: r.id,
      nombre: r.nombre,
      mime: r.mime,
      size_bytes: r.size_bytes,
      tipo: r.tipo,
      signed_url: urlByPath.get(r.storage_path) ?? null,
    });
    byMensaje.set(r.mensaje_id, arr);
  }

  return mensajes.map((m) => ({
    ...m,
    adjuntos: byMensaje.get(m.id),
  }));
}
