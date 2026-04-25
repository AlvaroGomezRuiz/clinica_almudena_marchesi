// Edge Function: invoice-pdf
// -----------------------------------------------------------------------------
// Genera factura PDF A4 (JWT usuario → RPC datos_factura).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

import { buildCorsHeaders, handleOptions } from "../_shared/cors.ts";
import {
  type FacturaData,
  readInvoiceEmisor,
  renderInvoicePdfBytes,
} from "../_shared/invoice-pdf-render.ts";
import { captureEdgeError } from "../_shared/sentry.ts";

const UUID_RE = /^[0-9a-f-]{36}$/i;

function json(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  const cors = buildCorsHeaders(req.headers.get("origin"));
  const opts = handleOptions(req);
  if (opts) return opts;

  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405, cors);
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader) return json({ error: "unauthorized" }, 401, cors);

  const emisor = readInvoiceEmisor();
  if (!emisor) {
    return json(
      {
        error: "emisor_no_configurado",
        detail:
          "Faltan FACTURA_EMISOR_NOMBRE / FACTURA_EMISOR_NIF / FACTURA_EMISOR_DIRECCION en la Edge Function.",
      },
      503,
      cors,
    );
  }

  let body: { pago_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400, cors);
  }

  const pagoId = body.pago_id ?? "";
  if (!UUID_RE.test(pagoId)) {
    return json({ error: "pago_id_invalido" }, 400, cors);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data, error } = await supabase.rpc("datos_factura", {
    p_pago_id: pagoId,
  });

  if (error) {
    const msg = error.message ?? "rpc_error";
    const code = msg.includes("forbidden")
      ? 403
      : msg.includes("pago_no_encontrado")
      ? 404
      : msg.includes("pago_no_completado")
      ? 409
      : 500;
    if (code >= 500) {
      captureEdgeError(error, {
        area: "invoice-pdf",
        event_type: "datos_factura_rpc",
        entity_id: pagoId,
        fingerprint: ["invoice-pdf", "rpc", msg],
      });
    }
    return json({ error: msg }, code, cors);
  }

  const fila = (Array.isArray(data) ? data[0] : data) as FacturaData | undefined;
  if (!fila) return json({ error: "sin_datos" }, 404, cors);

  try {
    const pdfBytes = await renderInvoicePdfBytes(fila, emisor);
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        ...cors,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="factura-${fila.numero_factura}.pdf"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    captureEdgeError(err, {
      area: "invoice-pdf",
      event_type: "render_pdf",
      entity_id: pagoId,
      fingerprint: ["invoice-pdf", "render"],
    });
    return json({ error: "render_failed", detail }, 500, cors);
  }
});
