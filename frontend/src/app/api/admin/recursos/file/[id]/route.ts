/**
 * GET /api/admin/recursos/file/[id]
 *
 * Solo admin: redirige a URL firmada del bucket `recursos` (misma semántica
 * que el download portal). Sirve para <img src>, iframes y enlaces internos.
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

export async function GET(_req: NextRequest, { params }: Params): Promise<Response> {
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle<{ role: 'admin' | 'paciente' }>();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const rate = await enforceRateLimit({
    key: `admin_recurso_file:${user.id}`,
    max: 180,
    windowMs: 60_000,
  });
  if (!rate.ok) {
    return rateLimitJsonResponse(rate);
  }

  const { data: rec, error } = await supabase
    .from('recursos')
    .select('id, storage_path, external_url')
    .eq('id', id)
    .eq('activo', true)
    .maybeSingle<{
      id: string;
      storage_path: string | null;
      external_url: string | null;
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
