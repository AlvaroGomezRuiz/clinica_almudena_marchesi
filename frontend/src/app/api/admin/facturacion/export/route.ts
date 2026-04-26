/**
 * GET /api/admin/facturacion/export
 *
 * Exporta a CSV los pagos del rango solicitado (query `?from=YYYY-MM-DD&to=YYYY-MM-DD`).
 * Solo accesible para admin. Se usa desde el botón "Exportar CSV" de facturación.
 *
 * Columnas: fecha_pago, importe_eur, moneda, estado, paciente_display_name,
 *           cita_id, bono_id, stripe_payment_intent, stripe_session_id
 *
 * El contenido se escapa con comillas dobles según RFC 4180.
 *
 * Límite: 20 exportaciones / minuto / admin (`facturacion_csv:<user_id>`).
 */

import { NextResponse, type NextRequest } from 'next/server';

import { enforceRateLimit, rateLimitJsonResponse } from '@/lib/security/rate-limit';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface PagoRow {
  id: string;
  paciente_id: string;
  cita_id: string | null;
  bono_id: string | null;
  importe_centimos: number;
  moneda: string;
  estado: string;
  fecha_pago: string;
  stripe_payment_intent: string | null;
  stripe_session_id: string | null;
  metodo: string | null;
  excluir_de_facturacion: boolean;
}

/**
 * Escapa un valor para CSV RFC 4180 + protección CSV-injection (OWASP).
 *
 * Si el valor empieza por =, +, -, @, \t o \r, Excel lo trata como fórmula y
 * puede ejecutar expresiones (incluyendo `=cmd|...`, `=HYPERLINK(...)`) al abrir
 * el archivo. Prefijamos con apostrofe para forzar a que Excel lo lea como texto.
 */
function csvEscape(value: string): string {
  let safe = value;
  if (/^[=+\-@\t\r]/.test(safe)) {
    safe = `'${safe}`;
  }
  if (/[",\n\r]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export async function GET(req: NextRequest): Promise<Response> {
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
    key: `facturacion_csv:${user.id}`,
    max: 20,
    windowMs: 60_000,
  });
  if (!rate.ok) {
    return rateLimitJsonResponse(rate);
  }

  const sp = req.nextUrl.searchParams;
  const now = new Date();
  const fromStr = sp.get('from');
  const toStr = sp.get('to');
  const from = fromStr
    ? new Date(fromStr)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const to = toStr ? new Date(toStr) : now;

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return NextResponse.json({ error: 'fechas_invalidas' }, { status: 400 });
  }

  // Respeta el flag excluir_de_facturacion por defecto. Si ?incluir_regalos=1
  // se envían todos (útil para auditorías internas).
  const incluirRegalos = sp.get('incluir_regalos') === '1';

  let query = supabase
    .from('pagos')
    .select(
      'id, paciente_id, cita_id, bono_id, importe_centimos, moneda, estado, fecha_pago, stripe_payment_intent, stripe_session_id, metodo, excluir_de_facturacion'
    )
    .gte('fecha_pago', from.toISOString())
    .lte('fecha_pago', to.toISOString())
    .order('fecha_pago', { ascending: true })
    .limit(5000);

  if (!incluirRegalos) {
    query = query.eq('excluir_de_facturacion', false);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data as PagoRow[] | null) ?? [];

  const header = [
    'fecha_pago',
    'importe_eur',
    'moneda',
    'estado',
    'metodo',
    'excluir_facturacion',
    'paciente_id',
    'cita_id',
    'bono_id',
    'stripe_payment_intent',
    'stripe_session_id',
  ].join(',');

  const lines = rows.map((r) =>
    [
      r.fecha_pago,
      (r.importe_centimos / 100).toFixed(2),
      r.moneda,
      r.estado,
      r.metodo ?? 'stripe',
      r.excluir_de_facturacion ? 'si' : 'no',
      r.paciente_id,
      r.cita_id ?? '',
      r.bono_id ?? '',
      r.stripe_payment_intent ?? '',
      r.stripe_session_id ?? '',
    ]
      .map((v) => csvEscape(String(v)))
      .join(',')
  );

  const csv = [header, ...lines].join('\r\n');
  const fname = `facturacion_${from.toISOString().slice(0, 10)}_${to
    .toISOString()
    .slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fname}"`,
      'Cache-Control': 'no-store',
    },
  });
}
