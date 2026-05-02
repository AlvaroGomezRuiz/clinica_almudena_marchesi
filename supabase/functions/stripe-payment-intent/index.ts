// Edge Function: stripe-payment-intent
// -----------------------------------------------------------------------------
// Crea un PaymentIntent para el Payment Element embebido (no hosted checkout).
// Soporta dos kinds (igual que stripe-checkout):
//   * kind='cita' — pago de una cita suelta
//   * kind='bono' — compra de un bono
//
// Devuelve `client_secret` para que el cliente inicialice `stripe.elements()`
// con Payment Element + wallets (Apple Pay, Google Pay, Klarna, Bizum...).
//
// Security:
//   * Valida JWT del usuario (authenticated).
//   * Cita: `preparar_checkout_cita` (fila legacy) o `preparar_checkout_cita_slot` (pago primero).
//   * Bono: `preparar_checkout_bono`.
//   * Idempotency-Key → `pi-<kind>-<id>-<user_id>`.
// -----------------------------------------------------------------------------

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

import { buildCorsHeaders, handleOptions } from "../_shared/cors.ts";
import {
  createPaymentIntent,
  PORTAL_EXCLUDED_PAYMENT_METHOD_TYPES,
  StripeApiError,
} from "../_shared/stripe.ts";
import { captureEdgeError, wrapEdgeHandler } from "../_shared/sentry.ts";

const UUID_RE = /^[0-9a-f-]{36}$/i;

interface PaymentIntentRequest {
  kind: "cita" | "bono" | "activar_bono";
  /** Pago de cita ya existente (legacy bloqueo_temporal / checkout antiguo). */
  cita_id?: string;
  /** Pago antes de crear la cita: validado en BBDD, metadata en Stripe. */
  servicio_id?: string;
  slot_inicio?: string;
  bono_config_id?: string;
  bono_paciente_id?: string;
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

interface ActivarBonoCtx {
  bono_paciente_id: string;
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

Deno.serve(wrapEdgeHandler("stripe-payment-intent", async (req) => {
  const cors = buildCorsHeaders(req.headers.get("origin"));
  const opts = handleOptions(req);
  if (opts) return opts;

  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, cors);

  const authHeader = req.headers.get("authorization");
  if (!authHeader) return json({ error: "unauthorized" }, 401, cors);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabaseAuth = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const {
    data: { user },
    error: authErr,
  } = await supabaseAuth.auth.getUser();
  if (authErr || !user) return json({ error: "unauthorized" }, 401, cors);

  let payload: PaymentIntentRequest;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400, cors);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  try {
    if (payload.kind === "cita") {
      const hasSlot =
        Boolean(payload.servicio_id && UUID_RE.test(payload.servicio_id)) &&
        typeof payload.slot_inicio === "string" &&
        payload.slot_inicio.length > 0;
      const hasLegacyCita =
        Boolean(payload.cita_id && UUID_RE.test(payload.cita_id));

      if (hasSlot === hasLegacyCita) {
        return json(
          { error: "invalid_cita_payload", detail: "Envía cita_id XOR (servicio_id + slot_inicio)" },
          400,
          cors,
        );
      }

      if (hasLegacyCita) {
        const { data, error } = await admin.rpc("preparar_checkout_cita", {
          p_cita_id: payload.cita_id as string,
          p_user_id: user.id,
        });
        if (error) return json({ error: "rpc_failed", detail: error.message }, 500, cors);

        const ctx = (Array.isArray(data) ? data[0] : data) as CitaCtx | null;
        if (!ctx) return json({ error: "cita_not_found_or_not_owned" }, 404, cors);

        const pi = await createPaymentIntent({
          amount_centimos: ctx.importe_centimos,
          customer_email: ctx.email,
          description: `Sesión — ${ctx.servicio_nombre} — ${new Date(ctx.inicio).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Madrid" })}`,
          metadata: {
            kind: "cita",
            cita_id: ctx.cita_id,
            user_id: user.id,
          },
          excluded_payment_method_types: PORTAL_EXCLUDED_PAYMENT_METHOD_TYPES,
          idempotency_key: `pi-cita-${ctx.cita_id}-${user.id}`,
        });

        return json(
          {
            client_secret: pi.client_secret,
            payment_intent_id: pi.id,
            amount: pi.amount,
            currency: pi.currency,
          },
          200,
          cors,
        );
      }

      const { data, error } = await admin.rpc("preparar_checkout_cita_slot", {
        p_servicio_id: payload.servicio_id as string,
        p_slot_inicio: payload.slot_inicio as string,
        p_user_id: user.id,
      });
      if (error) return json({ error: "rpc_failed", detail: error.message }, 500, cors);

      const slotCtx = (Array.isArray(data) ? data[0] : data) as {
        inicio: string;
        servicio_nombre: string;
        importe_centimos: number;
        email: string;
        display_name: string | null;
      } | null;
      if (!slotCtx) {
        return json({ error: "slot_not_available_or_invalid" }, 404, cors);
      }

      const sid = payload.servicio_id as string;
      const slotIso = payload.slot_inicio as string;
      const pi = await createPaymentIntent({
        amount_centimos: slotCtx.importe_centimos,
        customer_email: slotCtx.email,
        description: `Sesión — ${slotCtx.servicio_nombre} — ${new Date(slotCtx.inicio).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Madrid" })}`,
        metadata: {
          kind: "cita",
          user_id: user.id,
          servicio_id: sid,
          slot_inicio: slotIso,
        },
        excluded_payment_method_types: PORTAL_EXCLUDED_PAYMENT_METHOD_TYPES,
        idempotency_key: `pi-cita-slot-${user.id}-${sid}-${slotIso}`,
      });

      return json(
        {
          client_secret: pi.client_secret,
          payment_intent_id: pi.id,
          amount: pi.amount,
          currency: pi.currency,
        },
        200,
        cors,
      );
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

      const pi = await createPaymentIntent({
        amount_centimos: ctx.importe_centimos,
        customer_email: ctx.email,
        description: `${ctx.nombre} — ${ctx.sesiones} sesiones`,
        metadata: {
          kind: "bono",
          bono_config_id: ctx.bono_config_id,
          user_id: user.id,
        },
        excluded_payment_method_types: PORTAL_EXCLUDED_PAYMENT_METHOD_TYPES,
        idempotency_key: `pi-bono-${ctx.bono_config_id}-${user.id}-${Date.now()}`,
      });

      return json(
        {
          client_secret: pi.client_secret,
          payment_intent_id: pi.id,
          amount: pi.amount,
          currency: pi.currency,
        },
        200,
        cors
      );
    }

    if (payload.kind === "activar_bono") {
      if (!payload.bono_paciente_id || !UUID_RE.test(payload.bono_paciente_id)) {
        return json({ error: "missing_bono_paciente_id" }, 400, cors);
      }

      const { data, error } = await admin.rpc("preparar_checkout_activar_bono", {
        p_bono_paciente_id: payload.bono_paciente_id,
        p_user_id: user.id,
      });
      if (error) return json({ error: "rpc_failed", detail: error.message }, 500, cors);

      const ctx = (Array.isArray(data) ? data[0] : data) as ActivarBonoCtx | null;
      if (!ctx) return json({ error: "bono_not_found_or_not_owned" }, 404, cors);

      const pi = await createPaymentIntent({
        amount_centimos: ctx.importe_centimos,
        customer_email: ctx.email,
        description: `${ctx.nombre} — ${ctx.sesiones} sesiones`,
        metadata: {
          kind: "activar_bono",
          bono_paciente_id: ctx.bono_paciente_id,
          user_id: user.id,
        },
        excluded_payment_method_types: PORTAL_EXCLUDED_PAYMENT_METHOD_TYPES,
        idempotency_key: `pi-activar-bono-${ctx.bono_paciente_id}-${user.id}-${Date.now()}`,
      });

      return json(
        {
          client_secret: pi.client_secret,
          payment_intent_id: pi.id,
          amount: pi.amount,
          currency: pi.currency,
        },
        200,
        cors
      );
    }

    return json({ error: "unknown_kind" }, 400, cors);
  } catch (err) {
    captureEdgeError(err, {
      area: "stripe-payment-intent",
      event_type: payload.kind,
      user_id: user.id,
      entity_id:
        payload.kind === "cita" ? payload.cita_id ?? "" : payload.kind === "bono" ? payload.bono_config_id ?? "" : payload.bono_paciente_id ?? "",
      fingerprint: ["stripe-payment-intent", payload.kind ?? "unknown"],
    });
    if (err instanceof StripeApiError) {
      return json(
        { error: "stripe_error", detail: err.message, code: err.code },
        502,
        cors
      );
    }
    const msg = err instanceof Error ? err.message : String(err);
    return json({ error: "internal", detail: msg }, 500, cors);
  }
}));
