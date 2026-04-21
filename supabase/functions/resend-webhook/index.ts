// Edge Function: resend-webhook
// -----------------------------------------------------------------------------
// Recibe eventos de Resend (bounces, complaints, delivered, opened, clicked).
// Firma Svix (svix-id, svix-timestamp, svix-signature) con HMAC-SHA256 sobre
// `${svix-id}.${svix-timestamp}.${body}` validada contra RESEND_WEBHOOK_SECRET.
//
// Flujo:
//   1. Verificar firma Svix.
//   2. Upsert en email_webhook_events (idempotente por svix-id).
//   3. Si event_type ∈ {bounced, complained} → RPC aplicar_email_webhook.
//
// Docs: https://resend.com/docs/dashboard/webhooks/introduction
// -----------------------------------------------------------------------------

// deno-lint-ignore-file no-explicit-any

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

interface SvixHeaders {
  id: string;
  timestamp: string;
  signature: string;
}

interface ResendEvent {
  type: string;                      // 'email.bounced', 'email.delivered', ...
  created_at: string;
  data: {
    email_id?: string;               // provider id → emails_log.provider_id
    to?: string[];
    from?: string;
    subject?: string;
    bounce?: { type?: string; message?: string };
    complaint?: { type?: string; message?: string };
    [k: string]: unknown;
  };
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function parseSvixHeaders(req: Request): SvixHeaders | null {
  const id = req.headers.get("svix-id");
  const timestamp = req.headers.get("svix-timestamp");
  const signature = req.headers.get("svix-signature");
  if (!id || !timestamp || !signature) return null;
  return { id, timestamp, signature };
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function base64Decode(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacSha256(secretBytes: Uint8Array, payload: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return new Uint8Array(sig);
}

/**
 * Verifica firma Svix. Resend sigue la spec estándar Svix:
 *   signing_secret = "whsec_XXXXX" (prefijo whsec_ seguido de base64)
 *   payload_to_sign = `${svix-id}.${svix-timestamp}.${body}`
 *   signature_header formato: "v1,<base64>  v1,<base64>  ..." (espacios)
 *
 * Tolerancia timestamp: 5 minutos para prevenir replay.
 */
async function verifySvix(
  body: string,
  headers: SvixHeaders,
  secret: string,
): Promise<boolean> {
  const rawSecret = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;
  let secretBytes: Uint8Array;
  try {
    secretBytes = base64Decode(rawSecret);
  } catch {
    return false;
  }

  const ts = Number(headers.timestamp);
  if (!Number.isFinite(ts)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > 300) return false;

  const toSign = `${headers.id}.${headers.timestamp}.${body}`;
  const expected = await hmacSha256(secretBytes, toSign);

  // Cabecera puede venir con varias firmas separadas por espacios
  const parts = headers.signature.split(" ").filter(Boolean);
  for (const part of parts) {
    const [scheme, sigB64] = part.split(",");
    if (scheme !== "v1" || !sigB64) continue;
    try {
      const candidate = base64Decode(sigB64);
      if (timingSafeEqual(candidate, expected)) return true;
    } catch {
      // sigue probando
    }
  }
  return false;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const secret = Deno.env.get("RESEND_WEBHOOK_SECRET");
  if (!secret) return json({ error: "webhook_secret_not_configured" }, 500);

  const svix = parseSvixHeaders(req);
  if (!svix) return json({ error: "missing_svix_headers" }, 400);

  const rawBody = await req.text();
  const valid = await verifySvix(rawBody, svix, secret);
  if (!valid) return json({ error: "invalid_signature" }, 401);

  let event: ResendEvent;
  try {
    event = JSON.parse(rawBody) as ResendEvent;
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const providerMessageId = event.data?.email_id ?? null;

  // Upsert idempotente por svix-id
  const { error: upsertErr } = await admin
    .from("email_webhook_events")
    .upsert(
      {
        provider: "resend",
        provider_event_id: svix.id,
        event_type: event.type,
        provider_message_id: providerMessageId,
        payload: event as unknown as Record<string, unknown>,
      },
      { onConflict: "provider_event_id" },
    );

  if (upsertErr) {
    return json({ error: "log_insert_failed", detail: upsertErr.message }, 500);
  }

  // Auto opt-out tras hard bounce o complaint
  let action: string | null = null;
  if (
    (event.type === "email.bounced" || event.type === "email.complained") &&
    providerMessageId
  ) {
    const { data: rpcRes, error: rpcErr } = await admin.rpc("aplicar_email_webhook", {
      p_event_type: event.type,
      p_provider_msg_id: providerMessageId,
    });
    if (rpcErr) {
      // No rompemos — queda registrado para forense
      return json({ ok: true, event: event.type, opt_out_error: rpcErr.message }, 200);
    }
    const row = Array.isArray(rpcRes) ? rpcRes[0] : rpcRes;
    action = (row as any)?.action_taken ?? null;
  }

  await admin
    .from("email_webhook_events")
    .update({ processed_at: new Date().toISOString() })
    .eq("provider_event_id", svix.id);

  return json({ ok: true, event: event.type, action }, 200);
});
