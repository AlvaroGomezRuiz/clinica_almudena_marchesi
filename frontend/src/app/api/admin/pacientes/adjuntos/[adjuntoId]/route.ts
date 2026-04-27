/**
 * GET /api/admin/pacientes/adjuntos/[adjuntoId]
 *
 * Redirige a URL firmada (bucket `paciente-adjuntos`). Solo admin.
 */

import { NextResponse, type NextRequest } from 'next/server';

import { enforceRateLimit, rateLimitJsonResponse } from '@/lib/security/rate-limit';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f-]{36}$/i;

interface Params {
  readonly params: Promise<{ readonly adjuntoId: string }>;
}

export async function GET(_req: NextRequest, { params }: Params): Promise<Response> {
  const { adjuntoId } = await params;
  if (!UUID_RE.test(adjuntoId)) {
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
    key: `paciente_adjunto_dl:${user.id}`,
    max: 120,
    windowMs: 60_000,
  });
  if (!rate.ok) {
    return rateLimitJsonResponse(rate);
  }

  const { data: row, error } = await supabase
    .from('paciente_adjuntos')
    .select('id, storage_path')
    .eq('id', adjuntoId)
    .maybeSingle<{ id: string; storage_path: string }>();

  if (error || !row?.storage_path) {
    return NextResponse.json({ error: 'no_encontrado' }, { status: 404 });
  }

  const { data: signed, error: sErr } = await supabase.storage
    .from('paciente-adjuntos')
    .createSignedUrl(row.storage_path, 3600);

  if (sErr || !signed?.signedUrl) {
    return NextResponse.json(
      { error: sErr?.message ?? 'sin_url' },
      { status: 500 }
    );
  }

  return NextResponse.redirect(signed.signedUrl, { status: 302 });
}
