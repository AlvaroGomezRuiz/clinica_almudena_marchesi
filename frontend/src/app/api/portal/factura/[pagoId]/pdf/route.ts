/**
 * GET /api/portal/factura/[pagoId]/pdf
 *
 * Genera (o recupera de cache) la factura PDF vinculada a un pago.
 * Delegamos la generación a la Edge Function `invoice-pdf` (F5 pendiente):
 *   - Si responde 200 con PDF → streaming directo al cliente.
 *   - Si la Edge Function no está desplegada aún → 503 con JSON claro.
 *
 * Ownership: RLS sobre public.pagos impide acceder a pagos ajenos; añadimos
 * verificación explícita antes de llamar a la Edge Function para fallar rápido.
 */

import { NextResponse, type NextRequest } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import { getSupabaseEnv } from '@/lib/supabase/env';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f-]{36}$/i;

interface Params {
  readonly params: Promise<{ readonly pagoId: string }>;
}

export async function GET(
  _req: NextRequest,
  { params }: Params
): Promise<Response> {
  const { pagoId } = await params;
  if (!UUID_RE.test(pagoId)) {
    return NextResponse.json({ error: 'id_invalido' }, { status: 400 });
  }

  const supabase = createServerClient();
  const {
    data: { session },
    error: sessErr,
  } = await supabase.auth.getSession();
  if (sessErr || !session?.access_token) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
  }

  // Defensa: RLS valida, pero fallamos rápido si el pago no existe para el user.
  const { data: pago } = await supabase
    .from('pagos')
    .select('id, estado')
    .eq('id', pagoId)
    .maybeSingle<{ id: string; estado: string }>();

  if (!pago) {
    return NextResponse.json({ error: 'no_encontrado' }, { status: 404 });
  }
  if (pago.estado !== 'completado') {
    return NextResponse.json(
      { error: 'factura_no_disponible', detail: `estado=${pago.estado}` },
      { status: 409 }
    );
  }

  const env = getSupabaseEnv();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);

  try {
    const edgeRes = await fetch(`${env.url}/functions/v1/invoice-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: env.anonKey,
      },
      body: JSON.stringify({ pago_id: pagoId }),
      signal: controller.signal,
      cache: 'no-store',
    });

    if (edgeRes.status === 404 || edgeRes.status === 405) {
      return NextResponse.json(
        {
          error: 'invoice_pdf_no_desplegada',
          detail:
            'La Edge Function invoice-pdf todavía no está desplegada. Contacta con Almudena para recibir la factura por email.',
        },
        { status: 503 }
      );
    }

    if (!edgeRes.ok) {
      const text = await edgeRes.text().catch(() => '');
      return NextResponse.json(
        { error: `edge_http_${edgeRes.status}`, detail: text.slice(0, 500) },
        { status: 502 }
      );
    }

    const contentType = edgeRes.headers.get('content-type') ?? 'application/pdf';
    const disposition =
      edgeRes.headers.get('content-disposition') ??
      `attachment; filename="factura-${pagoId.slice(0, 8)}.pdf"`;

    return new Response(edgeRes.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': disposition,
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'network_error';
    return NextResponse.json({ error: msg }, { status: 504 });
  } finally {
    clearTimeout(timer);
  }
}
