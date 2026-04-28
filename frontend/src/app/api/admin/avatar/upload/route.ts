/**
 * POST /api/admin/avatar/upload
 *
 * Sube una imagen al bucket `avatares` y actualiza `profiles.avatar_url`.
 * Path: `<user_id>/avatar.<ext>` (overwrite=true para UX "reemplazar").
 * Público (bucket público) pero el nombre es predecible → sirve como URL estable.
 */

import { NextResponse, type NextRequest } from 'next/server';

import {
  detectFileKind,
  kindFromMime,
  type AllowedFileKind,
} from '@/lib/security/file-validation';
import { enforceRateLimit } from '@/lib/security/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerClient } from '@/lib/supabase/server';
import { getSupabaseEnv } from '@/lib/supabase/env';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp']);
const ALLOWED_KINDS: readonly AllowedFileKind[] = ['png', 'jpeg', 'webp'];
const MAX_BYTES = 2 * 1024 * 1024; // 2MB

export async function POST(req: NextRequest): Promise<Response> {
  const supabase = createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
  }

  /* Rate-limit: 10 cambios de avatar/hora. */
  const rate = await enforceRateLimit({
    key: `avatar:${user.id}`,
    max: 10,
    windowMs: 60 * 60_000,
  });
  if (!rate.ok) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'form_invalido' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file_requerido' }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: 'mime_no_soportado' }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'file_demasiado_grande' }, { status: 413 });
  }

  const declaredKind = kindFromMime(file.type);
  if (!declaredKind) {
    return NextResponse.json({ error: 'mime_no_soportado' }, { status: 415 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  /* Magic bytes check — el MIME del cliente es inseguro. */
  const detectedKind = detectFileKind(bytes, ALLOWED_KINDS);
  if (!detectedKind || detectedKind !== declaredKind) {
    return NextResponse.json(
      { error: 'file_signature_mismatch' },
      { status: 415 }
    );
  }

  const extByMime: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
  };
  const ext = extByMime[file.type] ?? 'png';
  const path = `${user.id}/avatar.${ext}`;

  /* Misma estrategia que /api/mensajes/attach: service_role evita RLS de
   * storage.objects y de profiles cuando el despliegue tiene la clave. */
  const db = createAdminClient() ?? supabase;

  const { error: uploadErr } = await db.storage.from('avatares').upload(path, bytes, {
    contentType: file.type,
    upsert: true,
    cacheControl: '60',
  });

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  // Construimos URL pública estable (bucket `avatares` es público)
  const { url: supaUrl } = getSupabaseEnv();
  const publicUrl = `${supaUrl}/storage/v1/object/public/avatares/${path}?v=${Date.now()}`;

  const { error: updErr } = await db
    .from('profiles')
    .update({
      avatar_url: publicUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, url: publicUrl });
}
