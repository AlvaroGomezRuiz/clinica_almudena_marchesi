// Edge Function: stripe-webhook
// -----------------------------------------------------------------------------
// Recibe eventos de Stripe (sin JWT porque Stripe no manda uno), verifica la
// firma HMAC-SHA256 con STRIPE_WEBHOOK_SECRET, y procesa los eventos soportados:
//   * checkout.session.completed                → confirma cita o crea bono
//   * checkout.session.async_payment_succeeded  → idem (SEPA, Klarna)
//   * payment_intent.succeeded                  → idem (Payment Element embebido)
//   * payment_intent.payment_failed             → marca pago fallido
//
// Idempotencia: pagos.stripe_event_id UNIQUE + tabla stripe_events.
// Toda la mutación va vía RPC SECURITY DEFINER procesar_pago_stripe.
// -----------------------------------------------------------------------------

// deno-lint-ignore-file no-explicit-any

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { verifyWebhookSignature } from "../_shared/stripe.ts";
import { captureEdgeError, captureEdgeMessage } from "../_shared/sentry.ts";

interface StripeEvent {
  id: string;
  type: string;
  api_version?: string;
  livemode?: boolean;
  data: { object: any };
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const FRONTEND_URL = Deno.env.get("FRONTEND_URL") ?? "https://amclinicapsicologia.es";

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!webhookSecret) return json({ error: "webhook_secret_not_configured" }, 500);

  // IMPORTANTE: leer el body como TEXTO RAW. La firma se calcula sobre el
  // payload byte-a-byte; cualquier reparseo lo invalidaría.
  const rawBody = await req.text();
  const sigHeader = req.headers.get("stripe-signature");

  const event = (await verifyWebhookSignature(rawBody, sigHeader, webhookSecret)) as
    | StripeEvent
    | null;

  if (!event) {
    captureEdgeMessage("stripe webhook invalid signature", {
      area: "stripe-webhook",
      fingerprint: ["stripe-webhook", "invalid-signature"],
    }, "warning");
    return json({ error: "invalid_signature" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // Audit del evento (upsert para idempotencia si Stripe reintenta)
  await admin
    .from("stripe_events")
    .upsert(
      {
        id: event.id,
        type: event.type,
        api_version: event.api_version ?? null,
        livemode: Boolean(event.livemode),
        payload: event as unknown as Record<string, unknown>,
      },
      { onConflict: "id" },
    );

  try {
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      await handleCheckoutCompleted(admin, event);
    } else if (event.type === "payment_intent.succeeded") {
      await handlePaymentIntentSucceeded(admin, event);
    } else if (event.type === "payment_intent.payment_failed") {
      await handlePaymentFailed(admin, event);
    }
    // Cualquier otro tipo queda logueado en stripe_events y devolvemos 200.

    await admin
      .from("stripe_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("id", event.id);

    return json({ ok: true, type: event.type }, 200);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await admin
      .from("stripe_events")
      .update({ processing_error: msg })
      .eq("id", event.id);

    // Sentry: crítico, alertar a Almudena. Un webhook que revienta = pago perdido.
    captureEdgeError(err, {
      area: "stripe-webhook",
      event_type: event.type,
      entity_id: event.id,
      fingerprint: ["stripe-webhook", event.type],
    });

    // Stripe reintentará si devolvemos 5xx (hasta 72h con backoff).
    return json({ error: "processing_error", detail: msg }, 500);
  }
});

async function handleCheckoutCompleted(
  admin: ReturnType<typeof createClient>,
  event: StripeEvent,
): Promise<void> {
  const session = event.data.object;
  if (session.payment_status !== "paid") {
    // async_payment_succeeded llega con paid; en otros casos ignoramos.
    return;
  }

  const metadata = (session.metadata ?? {}) as Record<string, string>;
  const kind = metadata.kind;
  const userId = metadata.user_id;

  if (!userId || (kind !== "cita" && kind !== "bono")) {
    throw new Error(`metadata inválido: kind=${kind} user_id=${userId}`);
  }

  // Obtener método de pago del PaymentIntent (las Sessions solo tienen payment_intent id)
  let metodo: string | null = null;
  const paymentIntentId: string | null = session.payment_intent ?? null;
  if (paymentIntentId) {
    const piRes = await fetch(
      `https://api.stripe.com/v1/payment_intents/${paymentIntentId}`,
      { headers: { Authorization: `Bearer ${Deno.env.get("STRIPE_SECRET_KEY")}` } },
    );
    if (piRes.ok) {
      const pi = await piRes.json();
      metodo = pi?.charges?.data?.[0]?.payment_method_details?.type ?? pi?.payment_method_types?.[0] ?? null;
    }
  }

  const { data, error } = await admin.rpc("procesar_pago_stripe", {
    p_stripe_event_id:       event.id,
    p_stripe_session_id:     session.id,
    p_stripe_payment_intent: paymentIntentId,
    p_stripe_customer_id:    session.customer ?? null,
    p_user_id:               userId,
    p_cita_id:               kind === "cita" ? (metadata.cita_id ?? null) : null,
    p_bono_config_id:        kind === "bono" ? (metadata.bono_config_id ?? null) : null,
    p_importe_centimos:      session.amount_total ?? 0,
    p_moneda:                (session.currency ?? "eur").toUpperCase(),
    p_metodo:                metodo,
    p_metadata:              metadata,
  });

  if (error) throw new Error(`procesar_pago_stripe: ${error.message}`);

  const result = (Array.isArray(data) ? data[0] : data) as {
    pago_id: string;
    cita_confirmada: boolean;
    bono_creado: boolean;
    bono_id: string | null;
    ya_procesado: boolean;
  } | null;

  if (!result || result.ya_procesado) return;

  // Disparar email de confirmación (fire-and-forget, no bloqueamos el webhook)
  if (kind === "cita" && result.cita_confirmada && metadata.cita_id) {
    await triggerBookingEmail(userId, metadata.cita_id);
  }
}

async function handlePaymentIntentSucceeded(
  admin: ReturnType<typeof createClient>,
  event: StripeEvent,
): Promise<void> {
  const pi = event.data.object;
  if (!pi || pi.status !== "succeeded") return;

  // Si el PI forma parte de un Checkout Session, ignoramos: lo procesa el
  // handler de checkout.session.completed (evitamos doble inserción).
  // Los PaymentIntents creados por Checkout incluyen invoice o metadata.session_id,
  // pero la señal más fiable es comprobar si la Session existe.
  const metadata = (pi.metadata ?? {}) as Record<string, string>;
  const kind = metadata.kind;
  const userId = metadata.user_id;

  if (!userId || (kind !== "cita" && kind !== "bono")) {
    // Sin metadata nuestra → no es un pago del portal, ignorar.
    return;
  }

  // Anti-doble-procesado: si ya existe un pago con este PI, salimos.
  const { data: existing } = await admin
    .from("pagos")
    .select("id")
    .eq("stripe_payment_intent", pi.id)
    .maybeSingle();
  if (existing) return;

  const metodo: string | null =
    pi.charges?.data?.[0]?.payment_method_details?.type ??
    pi.payment_method_types?.[0] ??
    null;

  const { data, error } = await admin.rpc("procesar_pago_stripe", {
    p_stripe_event_id:       event.id,
    p_stripe_session_id:     null,
    p_stripe_payment_intent: pi.id,
    p_stripe_customer_id:    pi.customer ?? null,
    p_user_id:               userId,
    p_cita_id:               kind === "cita" ? (metadata.cita_id ?? null) : null,
    p_bono_config_id:        kind === "bono" ? (metadata.bono_config_id ?? null) : null,
    p_importe_centimos:      pi.amount_received ?? pi.amount ?? 0,
    p_moneda:                (pi.currency ?? "eur").toUpperCase(),
    p_metodo:                metodo,
    p_metadata:              metadata,
  });

  if (error) throw new Error(`procesar_pago_stripe: ${error.message}`);

  const result = (Array.isArray(data) ? data[0] : data) as {
    pago_id: string;
    cita_confirmada: boolean;
    bono_creado: boolean;
    bono_id: string | null;
    ya_procesado: boolean;
  } | null;

  if (!result || result.ya_procesado) return;

  if (kind === "cita" && result.cita_confirmada && metadata.cita_id) {
    await triggerBookingEmail(userId, metadata.cita_id);
  }
}

async function handlePaymentFailed(
  admin: ReturnType<typeof createClient>,
  event: StripeEvent,
): Promise<void> {
  const pi = event.data.object;
  const piId: string | undefined = pi?.id;
  if (!piId) return;

  await admin
    .from("pagos")
    .update({ estado: "fallido", updated_at: new Date().toISOString() })
    .eq("stripe_payment_intent", piId);
}

async function triggerBookingEmail(userId: string, citaId: string): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data } = await admin
      .from("citas")
      .select(`inicio, servicio:servicios!inner(nombre, duracion_minutos)`)
      .eq("id", citaId)
      .maybeSingle();

    if (!data) return;

    const servicio = Array.isArray((data as any).servicio) ? (data as any).servicio[0] : (data as any).servicio;
    if (!servicio) return;

    await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        type: "booking_confirmed",
        to_user_id: userId,
        cita_id: citaId,
        data: {
          servicio: servicio.nombre,
          inicio: (data as any).inicio,
          duracion_min: servicio.duracion_minutos,
        },
      }),
    });
  } catch {
    // Mejor-esfuerzo. El pago ya quedó registrado.
  }
}
