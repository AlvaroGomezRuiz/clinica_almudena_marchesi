/**
 * POST /api/mensajes/attach
 *
 * Sube un adjunto al bucket `chat-adjuntos` y lo registra en
 * public.mensajes_adjuntos vinculándolo a un nuevo mensaje (body puede ser
 * texto del usuario o un placeholder "[adjunto]").
 *
 * Path convención: `<conversacion_id>/<mensaje_id>/<filename>`.
 *
 * Restricciones:
 *   - Tipos permitidos: imágenes, pdf, audio (webm, ogg, mpeg, m4a).
 *   - Tamaño máx: 25 MB (coincide con límite del bucket).
 */

import { NextResponse, type NextRequest } from 'next/server';

import {
  detectFileKind,
  kindFromMime,
  type AllowedFileKind,
} from '@/lib/security/file-validation';
import { enforceRateLimit, getClientIp, rateLimitJsonResponse } from '@/lib/security/rate-limit';
import { createServerClient } from '@/lib/supabase/server';
import { sendMensajeAction } from '@/services/mensajes/actions';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function mimeBase(mime: string): string {
  return mime.split(';')[0]?.trim().toLowerCase() ?? '';
}

const ALLOWED_BASE = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
  'application/pdf',
  'audio/webm',
  'audio/ogg',
  'application/ogg',
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/x-m4a',
  'audio/aac',
]);
const ALLOWED_KINDS: readonly AllowedFileKind[] = [
  'png',
  'jpeg',
  'webp',
  'heic',
  'pdf',
  'webm',
  'ogg',
  'mpeg',
  'm4a',
];
const MAX_BYTES = 25 * 1024 * 1024;
const MAX_AUDIO_BYTES = 8 * 1024 * 1024;

function tipoFromMime(mime: string): 'archivo' | 'imagen' | 'audio' {
  if (mime.startsWith('image/')) return 'imagen';
  if (mime.startsWith('audio/') || mime === 'application/ogg') return 'audio';
  return 'archivo';
}

/**
 * Normaliza MIMEs que la API acepta pero el bucket de Supabase no tiene
 * en su `allowed_mime_types`. Ejemplo: audio/x-m4a → audio/mp4.
 */
function mimeForBucket(base: string): string {
  switch (base) {
    case 'audio/x-m4a':
    case 'audio/aac':
      return 'audio/mp4';
    case 'audio/mp3':
      return 'audio/mpeg';
    case 'application/ogg':
      return 'audio/ogg';
    default:
      return base;
  }
}

function sanitizeFilename(name: string): string {
  const clean = name.normalize('NFKD').replace(/[^\w.\- ]/g, '_').trim();
  return clean.slice(0, 120) || 'archivo';
}

export async function POST(req: NextRequest): Promise<Response> {
  const supabase = createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
  }

  /* Rate-limit: 20 uploads/minuto por usuario. Protege bucket de abuso y costos. */
  const rate = await enforceRateLimit({
    key: `attach:${user.id}`,
    max: 20,
    windowMs: 60_000,
  });
  if (!rate.ok) {
    return rateLimitJsonResponse(rate);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'form_invalido' }, { status: 400 });
  }

  const file = form.get('file');
  const conversacionId = String(form.get('conversation_id') ?? '');
  const bodyRaw = String(form.get('body') ?? '').trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file_requerido' }, { status: 400 });
  }
  if (!/^[0-9a-f-]{36}$/i.test(conversacionId)) {
    return NextResponse.json({ error: 'conversacion_invalida' }, { status: 400 });
  }
  const declaredBase = mimeBase(file.type);
  if (!ALLOWED_BASE.has(declaredBase)) {
    return NextResponse.json(
      { error: 'mime_no_soportado', mime: file.type },
      { status: 415 }
    );
  }
  const maxForKind =
    declaredBase.startsWith('audio/') || declaredBase === 'application/ogg'
      ? MAX_AUDIO_BYTES
      : MAX_BYTES;
  if (file.size > maxForKind) {
    return NextResponse.json({ error: 'file_demasiado_grande' }, { status: 413 });
  }

  /* Verificación magic-bytes: el Content-Type viene del cliente y es trivial
     de falsificar. Revisamos la firma real del archivo contra la lista blanca. */
  const declaredKind = kindFromMime(declaredBase);
  if (!declaredKind) {
    console.warn('[attach] MIME no soportado:', { raw: file.type, base: declaredBase, size: file.size });
    return NextResponse.json({ error: 'mime_no_soportado' }, { status: 415 });
  }
  const bytes = new Uint8Array(await file.arrayBuffer());

  // Diagnóstico temporal: loguear info del archivo subido
  const hexHead = Array.from(bytes.subarray(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' ');
  console.info('[attach]', {
    rawType: file.type,
    base: declaredBase,
    bucket: mimeForBucket(declaredBase),
    size: file.size,
    declaredKind,
    hexHead,
  });

  const detectedKind = detectFileKind(bytes, ALLOWED_KINDS);
  if (!detectedKind || detectedKind !== declaredKind) {
    console.warn('[attach] Signature mismatch:', { declaredKind, detectedKind, hexHead });
    return NextResponse.json(
      { error: 'file_signature_mismatch' },
      { status: 415 }
    );
  }

  const nombre = sanitizeFilename(file.name);
  const body = bodyRaw || `📎 ${nombre}`;

  // 1) Crear mensaje (RPC valida length/trim). Devuelve la fila.
  const msgRes = await sendMensajeAction(conversacionId, body);
  if (!msgRes.ok) {
    return NextResponse.json(
      { error: msgRes.message, code: msgRes.code },
      { status: msgRes.code === 'forbidden' ? 403 : 400 }
    );
  }
  const mensajeId = msgRes.mensaje.id;
  const storagePath = `${conversacionId}/${mensajeId}/${nombre}`;

  // 2) Subir binario al bucket (privado). El buffer ya fue leído arriba.
  // NOTA: usamos `mimeForBucket(declaredBase)` para normalizar MIMEs con
  // codec params y variantes no reconocidas por el bucket.
  const bucketMime = mimeForBucket(declaredBase);
  const { error: upErr } = await supabase.storage
    .from('chat-adjuntos')
    .upload(storagePath, bytes, {
      contentType: bucketMime,
      upsert: false,
      cacheControl: '3600',
    });

  if (upErr) {
    // rollback blanco: no podemos borrar el mensaje (RPC lo insertó), pero
    // dejamos un error claro para el cliente.
    return NextResponse.json(
      { error: `storage_failed: ${upErr.message}` },
      { status: 500 }
    );
  }

  // 3) Registrar adjunto en tabla
  const { data: adjunto, error: insErr } = await supabase
    .from('mensajes_adjuntos')
    .insert({
      mensaje_id: mensajeId,
      storage_path: storagePath,
      nombre,
      mime: declaredBase,
      size_bytes: file.size,
      tipo: tipoFromMime(declaredBase),
    } as never)
    .select('id')
    .single<{ id: string }>();

  if (insErr) {
    // best-effort cleanup del binario
    await supabase.storage.from('chat-adjuntos').remove([storagePath]);
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    mensaje_id: mensajeId,
    adjunto_id: adjunto.id,
    storage_path: storagePath,
  });
}
