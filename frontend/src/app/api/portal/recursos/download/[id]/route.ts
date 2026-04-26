/**
 * GET /api/portal/recursos/download/[id]
 *
 * Genera una URL firmada (1h) para que el paciente descargue el binario del
 * recurso. RLS ya bloquea el acceso si el paciente no tiene asignación activa
 * ni el recurso es público.
 *
 * Redirige 302 a la URL firmada para no exponerla en la respuesta JSON.
 */

import { NextResponse, type NextRequest } from 'next/server';

import { enforceRateLimit, rateLimitJsonResponse } from '@/lib/security/rate-limit';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface Params {
  readonly params: Promise<{ readonly id: string }>;
}

const UUID_RE = /^[0-9a-f-]{36}$/i;

export async function GET(req: NextRequest, { params }: Params): Promise<Response> {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'id_invalido' }, { status: 400 });
  }

  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
  }

  const rate = await enforceRateLimit({
    key: `portal_recurso_dl:${user.id}`,
    max: 120,
    windowMs: 60_000,
  });
  if (!rate.ok) {
    return rateLimitJsonResponse(rate);
  }

  const { data: rec, error } = await supabase
    .from('recursos')
    .select('id, storage_path, external_url, titulo')
    .eq('id', id)
    .maybeSingle<{
      id: string;
      storage_path: string | null;
      external_url: string | null;
      titulo: string;
    }>();

  if (error || !rec) {
    return NextResponse.json({ error: 'no_encontrado' }, { status: 404 });
  }

  if (rec.external_url) {
    return NextResponse.redirect(rec.external_url, { status: 302 });
  }
  if (!rec.storage_path) {
    return NextResponse.json({ error: 'sin_binario' }, { status: 404 });
  }

  const { data: signed, error: sErr } = await supabase.storage
    .from('recursos')
    .createSignedUrl(rec.storage_path, 3600);

  if (sErr || !signed?.signedUrl) {
    return NextResponse.json(
      { error: sErr?.message ?? 'sin_url' },
      { status: 500 }
    );
  }

  return NextResponse.redirect(signed.signedUrl, { status: 302 });
}
