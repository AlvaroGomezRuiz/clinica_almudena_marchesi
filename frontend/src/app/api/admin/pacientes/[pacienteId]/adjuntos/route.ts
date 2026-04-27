/**
 * POST /api/admin/pacientes/[pacienteId]/adjuntos
 *
 * Sube un archivo al bucket privado `paciente-adjuntos` e inserta la fila en
 * `paciente_adjuntos`. Solo administradores (RLS + comprobación explícita).
 */

import { NextResponse, type NextRequest } from 'next/server';

import {
  PACIENTE_ADJUNTO_MAX_BYTES,
  sanitizePacienteAdjuntoNombre,
  validatePacienteAdjuntoBytes,
} from '@/lib/security/paciente-adjunto-validation';
import { enforceRateLimit, rateLimitJsonResponse } from '@/lib/security/rate-limit';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f-]{36}$/i;

interface RouteParams {
  readonly params: Promise<{ readonly pacienteId: string }>;
}

export async function POST(
  req: NextRequest,
  context: RouteParams
): Promise<Response> {
  const { pacienteId } = await context.params;
  if (!UUID_RE.test(pacienteId)) {
    return NextResponse.json({ error: 'paciente_invalido' }, { status: 400 });
  }

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

  const rate = await enforceRateLimit({
    key: `paciente_adjunto:${user.id}`,
    max: 30,
    windowMs: 60_000,
  });
  if (!rate.ok) {
    return rateLimitJsonResponse(rate);
  }

  const { data: pacRow, error: pacErr } = await supabase
    .from('pacientes')
    .select('id')
    .eq('id', pacienteId)
    .maybeSingle<{ id: string }>();

  if (pacErr || !pacRow) {
    return NextResponse.json({ error: 'paciente_no_encontrado' }, { status: 404 });
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

  if (file.size > PACIENTE_ADJUNTO_MAX_BYTES) {
    return NextResponse.json({ error: 'file_demasiado_grande' }, { status: 413 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const validated = validatePacienteAdjuntoBytes({
    declaredMime: file.type || 'application/octet-stream',
    bytes,
    sizeBytes: file.size,
  });

  if (!validated.ok) {
    return NextResponse.json({ error: validated.code }, { status: 415 });
  }

  const nombre = sanitizePacienteAdjuntoNombre(file.name);
  const storagePath = `${pacienteId}/${crypto.randomUUID()}-${nombre}`;

  const { error: upErr } = await supabase.storage
    .from('paciente-adjuntos')
    .upload(storagePath, bytes, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
      cacheControl: '3600',
    });

  if (upErr) {
    return NextResponse.json(
      { error: `storage_failed: ${upErr.message}` },
      { status: 500 }
    );
  }

  const { data: inserted, error: insErr } = await supabase
    .from('paciente_adjuntos')
    .insert({
      paciente_id: pacienteId,
      storage_path: storagePath,
      nombre,
      mime: file.type || null,
      size_bytes: file.size,
      subido_por: user.id,
    })
    .select('id')
    .single<{ id: string }>();

  if (insErr || !inserted) {
    await supabase.storage.from('paciente-adjuntos').remove([storagePath]);
    return NextResponse.json(
      { error: insErr?.message ?? 'insert_failed' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true as const,
    adjunto_id: inserted.id,
    storage_path: storagePath,
  });
}
