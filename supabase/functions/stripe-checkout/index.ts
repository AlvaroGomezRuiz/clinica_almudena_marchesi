// Edge Function: stripe-checkout
// -----------------------------------------------------------------------------
// Crea una sesión Checkout de Stripe para dos casos:
//   1. Pago de cita suelta (sin bono activo)  → body { kind: "cita", cita_id }
//   2. Compra de bono                          → body { kind: "bono", bono_config_id }
//
// Security:
//   * Valida JWT del usuario (authenticated) para obtener user_id.
//   * Llama a RPC SECURITY DEFINER (preparar_checkout_*) que valida ownership.
//   * STRIPE_SECRET_KEY vive SOLO en env de esta función.
// -----------------------------------------------------------------------------

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { buildCorsHeaders, handleOptions } from "../_shared/cors.ts";
import { createCheckoutSession, StripeApiError } from "../_shared/stripe.ts";

const FRONTEND_URL = Deno.env.get("FRONTEND_URL") ?? "https://clinica-almudena.vercel.app";

interface CheckoutRequest {
  kind: "cita" | "bono";
  cita_id?: string;
  bono_config_id?: string;
}

interface CitaCtx {
  cita_id: string;
  inicio: string;
  servicio_nombre: string;
  importe_centimos: number;
  email: string;
  display_name: string | null;
}

interface BonoCtx {
  bono_config_id: string;
  nombre: string;
  descripcion: string | null;
  sesiones: number;
  importe_centimos: number;
  email: string;
  display_name: string | null;
}

function json(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

const UUID_RE = /^[0-9a-f-]{36}$/i;

Deno.serve(async (req) => {
  const cors = buildCorsHeaders(req.headers.get("origin"));
  const opts = handleOptions(req);
  if (opts) return opts;

  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, cors);

  const authHeader = req.headers.get("authorization");
  if (!authHeader) return json({ error: "unauthorized" }, 401, cors);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Cliente autenticado con el JWT del usuario (para getUser)
  const supabaseAuth = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data: { user }, error: authErr } = await supabaseAuth.auth.getUser();
  if (authErr || !user) return json({ error: "unauthorized" }, 401, cors);

  let payload: CheckoutRequest;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400, cors);
  }

  // Cliente con service_role para RPCs SECURITY DEFINER
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  try {
    if (payload.kind === "cita") {
      if (!payload.cita_id || !UUID_RE.test(payload.cita_id)) {
        return json({ error: "missing_cita_id" }, 400, cors);
      }

      const { data, error } = await admin.rpc("preparar_checkout_cita", {
        p_cita_id: payload.cita_id,
        p_user_id: user.id,
      });
      if (error) return json({ error: "rpc_failed", detail: error.message }, 500, cors);

      const ctx = (Array.isArray(data) ? data[0] : data) as CitaCtx | null;
      if (!ctx) return json({ error: "cita_not_found_or_not_owned" }, 404, cors);

      const session = await createCheckoutSession({
        customer_email: ctx.email,
        success_url: `${FRONTEND_URL}/portal/pagos/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${FRONTEND_URL}/portal/pagos/cancel?cita_id=${ctx.cita_id}`,
        client_reference_id: ctx.cita_id,
        metadata: {
          kind: "cita",
          cita_id: ctx.cita_id,
          user_id: user.id,
        },
        line_items: [{
          name: `Sesión — ${ctx.servicio_nombre}`,
          description: `Fecha: ${new Date(ctx.inicio).toLocaleString("es-ES", { dateStyle: "full", timeStyle: "short", timeZone: "Europe/Madrid" })}`,
          amount_centimos: ctx.importe_centimos,
          quantity: 1,
        }],
        automatic_payment_methods: true,
        locale: "es",
        idempotency_key: `cita-${ctx.cita_id}-${user.id}`,
      });

      return json({ url: session.url, session_id: session.id }, 200, cors);
    }

    if (payload.kind === "bono") {
      if (!payload.bono_config_id || !UUID_RE.test(payload.bono_config_id)) {
        return json({ error: "missing_bono_config_id" }, 400, cors);
      }

      const { data, error } = await admin.rpc("preparar_checkout_bono", {
        p_bono_config_id: payload.bono_config_id,
        p_user_id: user.id,
      });
      if (error) return json({ error: "rpc_failed", detail: error.message }, 500, cors);

      const ctx = (Array.isArray(data) ? data[0] : data) as BonoCtx | null;
      if (!ctx) return json({ error: "bono_not_found_or_not_owned" }, 404, cors);

      const idempotencyKey = `bono-${ctx.bono_config_id}-${user.id}-${Date.now()}`;

      const session = await createCheckoutSession({
        customer_email: ctx.email,
        success_url: `${FRONTEND_URL}/portal/pagos/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${FRONTEND_URL}/portal/pagos/cancel`,
        metadata: {
          kind: "bono",
          bono_config_id: ctx.bono_config_id,
          user_id: user.id,
        },
        line_items: [{
          name: ctx.nombre,
          description: ctx.descripcion ?? `${ctx.sesiones} sesiones`,
          amount_centimos: ctx.importe_centimos,
          quantity: 1,
        }],
        automatic_payment_methods: true,
        locale: "es",
        idempotency_key: idempotencyKey,
      });

      return json({ url: session.url, session_id: session.id }, 200, cors);
    }

    return json({ error: "unknown_kind" }, 400, cors);
  } catch (err) {
    if (err instanceof StripeApiError) {
      return json({ error: "stripe_error", detail: err.message, code: err.code }, 502, cors);
    }
    const msg = err instanceof Error ? err.message : String(err);
    return json({ error: "internal", detail: msg }, 500, cors);
  }
});
