// Edge Function: cancel-cita
// -----------------------------------------------------------------------------
// Orquesta la cancelación de una cita:
//   1. Valida JWT del usuario autenticado.
//   2. Llama RPC `cancelar_cita` (SECURITY DEFINER) con auth.uid() automática.
//   3. Dispara email `booking_cancelled` (fire-and-forget).
//
// POLÍTICA MAYO 2026: No se realizan reembolsos Stripe automáticos.
// Si la cita se pagó con bono → se restaura la sesión al bono.
// Si la cita se pagó con sesión suelta → se crea mini-bono de 1 sesión.
//
// El cliente puede invocar esta Fn tanto desde portal paciente como desde admin.
// La diferenciación (override ventana 48h, cancelar citas de terceros) la decide la RPC
// en base al rol del usuario autenticado.
// -----------------------------------------------------------------------------

// deno-lint-ignore-file no-explicit-any

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { buildCorsHeaders, handleOptions } from "../_shared/cors.ts";

interface CancelRequest {
  cita_id: string;
  motivo?: string;
  force?: boolean;  // admin puede forzar cancelación fuera de ventana 48h
}

interface CancelRpcRow {
  ok: boolean;
  needs_stripe_refund: boolean;
  stripe_payment_intent: string | null;
  refund_amount_centimos: number | null;
  pago_id: string | null;
  bono_restaurado: boolean;
  email_inicio: string | null;
  email_servicio: string | null;
  email_to_user_id: string | null;
  email_display_name: string | null;
}

function json(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  const cors = buildCorsHeaders(req.headers.get("origin"));
  const pre = handleOptions(req);
  if (pre) return pre;

  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, cors);

  const authHeader = req.headers.get("authorization");
  if (!authHeader) return json({ error: "unauthorized" }, 401, cors);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey     = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Cliente con JWT del caller
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  let body: CancelRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400, cors);
  }
  if (!body?.cita_id) return json({ error: "missing_cita_id" }, 400, cors);

  // 1. Ejecutar RPC (transaccional en Postgres)
  const { data: rpcRows, error: rpcErr } = await userClient.rpc("cancelar_cita", {
    p_cita_id: body.cita_id,
    p_motivo:  body.motivo ?? null,
    p_force:   Boolean(body.force),
  });

  if (rpcErr) {
    const code = (rpcErr as any).code ?? "";
    const http = code === "42501" ? 403
               : code === "28000" ? 401
               : code === "P0002" ? 404
               : code === "P0004" ? 409
               : 500;
    return json({ error: "rpc_failed", code, detail: rpcErr.message }, http, cors);
  }

  const row = (Array.isArray(rpcRows) ? rpcRows[0] : rpcRows) as CancelRpcRow | null;
  if (!row?.ok) return json({ error: "cancel_failed" }, 500, cors);

  // 2. Email fire-and-forget (no hay refund Stripe — política mayo 2026)
  if (row.email_to_user_id && row.email_inicio && row.email_servicio) {
    await fireEmail(supabaseUrl, serviceKey, {
      type: "booking_cancelled",
      to_user_id: row.email_to_user_id,
      cita_id: body.cita_id,
      data: {
        servicio: row.email_servicio,
        inicio:   row.email_inicio,
      },
    }).catch(() => { /* best-effort */ });
  }

  return json({
    ok: true,
    bono_restaurado: row.bono_restaurado,
  }, 200, cors);
});

async function fireEmail(
  supabaseUrl: string,
  serviceKey: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await fetch(`${supabaseUrl}/functions/v1/send-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify(payload),
  });
}
