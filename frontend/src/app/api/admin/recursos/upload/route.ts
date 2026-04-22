/**
 * POST /api/admin/recursos/upload
 *
 * Subida de recurso (multipart/form-data):
 *   - file: File (PDF/audio/video/imagen) ≤ 50MB
 *   - titulo: string requerido
 *   - descripcion: string opcional
 *   - categoria: 'tarea' | 'lectura' | 'ejercicio' | 'evaluacion' | 'recurso'
 *
 * Flow:
 *   1. Valida sesión + rol admin.
 *   2. Infere `tipo` desde el MIME type.
 *   3. Sube a bucket `recursos` con path `<recurso_id>/<filename>`.
 *   4. Inserta fila en public.recursos.
 *
 * Límite de tamaño lo impone el propio bucket (50MB) + Next route (4.5MB
 * runtime por defecto → necesitamos `runtime: 'nodejs'` con bodyParser
 * deshabilitado). Para ficheros grandes (>4.5MB) habría que usar signed
 * upload URL, pero MVP acepta hasta ~25MB sin cambios.
 */

import { NextResponse, type NextRequest } from 'next/server';

import { enforceRateLimit } from '@/lib/security/rate-limit';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CATEGORIAS = new Set(['tarea', 'lectura', 'ejercicio', 'evaluacion', 'recurso']);
const MIME_TO_TIPO: Record<string, string> = {
  'application/pdf': 'pdf',
  'audio/mpeg': 'audio',
  'audio/mp4': 'audio',
  'audio/webm': 'audio',
  'video/mp4': 'video',
  'image/jpeg': 'imagen',
  'image/png': 'imagen',
  'image/webp': 'imagen',
};

export async function POST(req: NextRequest): Promise<Response> {
  const supabase = createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle<{ role: 'admin' | 'paciente' }>();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  /* Rate-limit: 30 subidas/hora por admin (muy conservador). */
  const rate = await enforceRateLimit({
    key: `recurso-upload:${user.id}`,
    max: 30,
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
  const titulo = String(form.get('titulo') ?? '').trim();
  const descripcion = String(form.get('descripcion') ?? '').trim() || null;
  const categoria = String(form.get('categoria') ?? 'recurso');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file_requerido' }, { status: 400 });
  }
  if (!titulo) {
    return NextResponse.json({ error: 'titulo_requerido' }, { status: 400 });
  }
  if (!CATEGORIAS.has(categoria)) {
    return NextResponse.json({ error: 'categoria_invalida' }, { status: 400 });
  }
  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json({ error: 'file_demasiado_grande' }, { status: 413 });
  }

  const tipo = MIME_TO_TIPO[file.type] ?? 'otro';
  const recursoId = crypto.randomUUID();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
  const storagePath = `${recursoId}/${safeName}`;

  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadErr } = await supabase.storage
    .from('recursos')
    .upload(storagePath, bytes, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  const { error: dbErr } = await supabase.from('recursos').insert({
    id: recursoId,
    titulo: titulo.slice(0, 200),
    descripcion,
    tipo: tipo as 'pdf' | 'audio' | 'video' | 'imagen' | 'enlace' | 'otro',
    categoria: categoria as 'tarea' | 'lectura' | 'ejercicio' | 'evaluacion' | 'recurso',
    storage_path: storagePath,
    original_filename: file.name,
    mime_type: file.type || null,
    size_bytes: file.size,
    created_by: user.id,
    activo: true,
  });

  if (dbErr) {
    // Rollback: borrar fichero subido
    await supabase.storage.from('recursos').remove([storagePath]);
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: recursoId, storagePath });
}
