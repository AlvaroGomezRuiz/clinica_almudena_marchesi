// Cliente Stripe minimalista (REST API directa, sin SDK).
// Evitamos el SDK oficial para minimizar cold-start y superficie de dependencias.

const STRIPE_API = "https://api.stripe.com/v1";

interface StripeError { error?: { message?: string; code?: string; type?: string } }

export class StripeApiError extends Error {
  public code: string | undefined;
  public status: number;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function apiKey(): string {
  const k = Deno.env.get("STRIPE_SECRET_KEY");
  if (!k) throw new StripeApiError(500, "STRIPE_SECRET_KEY no configurado");
  return k;
}

function encodeForm(obj: Record<string, unknown>, prefix = ""): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;
    const k = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      const allPrimitive = value.every(
        (v) =>
          v !== null &&
          v !== undefined &&
          (typeof v === "string" || typeof v === "number" || typeof v === "boolean"),
      );
      if (allPrimitive) {
        for (const v of value) {
          if (v === null || v === undefined) continue;
          parts.push(`${encodeURIComponent(`${k}[]`)}=${encodeURIComponent(String(v))}`);
        }
      } else {
        value.forEach((v, i) => {
          if (typeof v === "object" && v !== null) {
            parts.push(encodeForm(v as Record<string, unknown>, `${k}[${i}]`));
          } else if (v !== null && v !== undefined) {
            parts.push(`${encodeURIComponent(`${k}[${i}]`)}=${encodeURIComponent(String(v))}`);
          }
        });
      }
    } else if (typeof value === "object") {
      parts.push(encodeForm(value as Record<string, unknown>, k));
    } else {
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.filter(Boolean).join("&");
}

async function stripeRequest<T>(
  path: string,
  method: "GET" | "POST",
  body?: Record<string, unknown>,
  idempotencyKey?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey()}`,
  };
  if (method === "POST") {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  }
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }

  const res = await fetch(`${STRIPE_API}${path}`, {
    method,
    headers,
    body: body ? encodeForm(body) : undefined,
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as StripeError;
    throw new StripeApiError(
      res.status,
      err.error?.message ?? `stripe ${res.status}`,
      err.error?.code,
    );
  }

  return (await res.json()) as T;
}

// ---------------------------------------------------------------------------
// Checkout Sessions
// ---------------------------------------------------------------------------

export interface CheckoutLineItem {
  name: string;
  description?: string;
  amount_centimos: number;
  quantity?: number;
}

export interface CreateCheckoutInput {
  customer_email: string;
  success_url: string;
  cancel_url: string;
  client_reference_id?: string;
  metadata: Record<string, string>;
  line_items: CheckoutLineItem[];
  idempotency_key: string;
  /**
   * Si se omite o es true, Stripe elige automáticamente todos los métodos
   * habilitados en Dashboard (card + Apple/Google Pay + Klarna + Bizum...).
   * Si se pasa un array, se usa `payment_method_types` explícito.
   */
  payment_method_types?: string[];
  automatic_payment_methods?: boolean;
  /** Con `automatic_payment_methods`, excluye LPM no deseados (ver `PORTAL_EXCLUDED_*`). */
  excluded_payment_method_types?: readonly string[];
  locale?: string;
}

export interface CheckoutSession {
  id: string;
  url: string;
  payment_intent: string | null;
  customer: string | null;
  payment_status: string;
  amount_total: number;
  currency: string;
  metadata?: Record<string, string>;
}

export async function createCheckoutSession(
  input: CreateCheckoutInput,
): Promise<CheckoutSession> {
  const usarAuto =
    input.automatic_payment_methods ??
    (input.payment_method_types === undefined);

  const body: Record<string, unknown> = {
    mode: "payment",
    customer_email: input.customer_email,
    success_url: input.success_url,
    cancel_url: input.cancel_url,
    client_reference_id: input.client_reference_id,
    locale: input.locale ?? "es",
    metadata: input.metadata,
    line_items: input.line_items.map((it) => ({
      price_data: {
        currency: "eur",
        unit_amount: it.amount_centimos,
        product_data: {
          name: it.name,
          description: it.description ?? undefined,
        },
      },
      quantity: it.quantity ?? 1,
    })),
  };

  // Métodos de pago: auto (respeta Dashboard: Bizum, Link…) o lista explícita.
  if (usarAuto) {
    body["automatic_payment_methods[enabled]"] = "true";
    body["automatic_payment_methods[allow_redirects]"] = "always";
    if (input.excluded_payment_method_types && input.excluded_payment_method_types.length > 0) {
      body.excluded_payment_method_types = [...input.excluded_payment_method_types];
    }
  } else if (input.payment_method_types && input.payment_method_types.length > 0) {
    body.payment_method_types = input.payment_method_types;
  }

  // metadata también dentro del PaymentIntent (para que el webhook lo tenga
  // accesible tanto si escuchamos checkout.session.completed como
  // payment_intent.succeeded).
  for (const [k, v] of Object.entries(input.metadata)) {
    body[`payment_intent_data[metadata][${k}]`] = v;
  }

  return await stripeRequest<CheckoutSession>(
    "/checkout/sessions",
    "POST",
    body,
    input.idempotency_key,
  );
}

// ---------------------------------------------------------------------------
// PaymentIntents (para Payment Element embebido)
// ---------------------------------------------------------------------------

/**
 * Lista explícita (Checkout legacy / referencia). Para Payment Element el portal usa
 * `automatic_payment_methods` + {@link PORTAL_EXCLUDED_PAYMENT_METHOD_TYPES}: Stripe
 * aplica lo habilitado en Dashboard (incl. Bizum) y el Element filtra por país/importe.
 */
export const PORTAL_PAYMENT_METHOD_TYPES: readonly string[] = [
  "card",
  "bizum",
  "link",
  "sepa_debit",
  "klarna",
];

/**
 * LPM que no ofrecemos en portal (EUR); con `automatic_payment_methods` evitan aparecer
 * Bancontact, MB Way, iDEAL, etc. No incluir card, link, sepa_debit, klarna ni bizum.
 */
export const PORTAL_EXCLUDED_PAYMENT_METHOD_TYPES: readonly string[] = [
  "bancontact",
  "blik",
  "eps",
  "giropay",
  "ideal",
  "mb_way",
  "p24",
  "sofort",
];

export interface CreatePaymentIntentInput {
  amount_centimos: number;
  currency?: string;                    // 'eur' por defecto
  customer_email: string;
  description?: string;
  metadata: Record<string, string>;
  idempotency_key: string;
  /**
   * Si se omite o está vacío, se usan `automatic_payment_methods` (recomendado para
   * Bizum y demás LPM según Dashboard) + `excluded_payment_method_types` opcional.
   */
  payment_method_types?: readonly string[] | null;
  /**
   * Solo aplica con `automatic_payment_methods` activo (sin lista explícita de tipos).
   */
  excluded_payment_method_types?: readonly string[];
  /**
   * Solo aplica si `payment_method_types` está vacío. Por defecto `true` (comportamiento antiguo).
   */
  automatic_payment_methods?: boolean;
  /** Si se omite, se usa la moneda por defecto (EUR). */
  receipt_email?: string;
}

export interface PaymentIntent {
  id: string;
  client_secret: string;
  status: string;
  amount: number;
  currency: string;
  metadata?: Record<string, string>;
}

export async function createPaymentIntent(
  input: CreatePaymentIntentInput
): Promise<PaymentIntent> {
  const body: Record<string, unknown> = {
    amount: input.amount_centimos,
    currency: input.currency ?? "eur",
    receipt_email: input.receipt_email ?? input.customer_email,
    description: input.description,
    metadata: input.metadata,
  };

  if (input.payment_method_types != null && input.payment_method_types.length > 0) {
    body.payment_method_types = [...input.payment_method_types];
  } else {
    if (input.automatic_payment_methods === false) {
      throw new StripeApiError(
        500,
        "Indica payment_method_types o deja automatic_payment_methods activo",
      );
    }
    const useAuto = input.automatic_payment_methods !== false;
    if (useAuto) {
      body["automatic_payment_methods[enabled]"] = "true";
      body["automatic_payment_methods[allow_redirects]"] = "always";
      if (input.excluded_payment_method_types && input.excluded_payment_method_types.length > 0) {
        body.excluded_payment_method_types = [...input.excluded_payment_method_types];
      }
    }
  }

  /* Con automático, Link/Bizum/Klarna/etc. dependen de lo activado en Dashboard. */

  return await stripeRequest<PaymentIntent>(
    "/payment_intents",
    "POST",
    body,
    input.idempotency_key
  );
}

// ---------------------------------------------------------------------------
// Refunds
// ---------------------------------------------------------------------------

export interface CreateRefundInput {
  payment_intent: string;
  amount_centimos?: number;        // null = refund total
  reason?: "duplicate" | "fraudulent" | "requested_by_customer";
  idempotency_key: string;
  metadata?: Record<string, string>;
}

export interface StripeRefund {
  id: string;
  amount: number;
  currency: string;
  status: string;          // 'succeeded' | 'pending' | 'failed' | 'requires_action'
  payment_intent: string;
  reason?: string | null;
}

export async function createRefund(input: CreateRefundInput): Promise<StripeRefund> {
  const body: Record<string, unknown> = {
    payment_intent: input.payment_intent,
    reason: input.reason ?? "requested_by_customer",
  };
  if (typeof input.amount_centimos === "number" && input.amount_centimos > 0) {
    body.amount = input.amount_centimos;
  }
  if (input.metadata) {
    for (const [k, v] of Object.entries(input.metadata)) {
      body[`metadata[${k}]`] = v;
    }
  }
  return await stripeRequest<StripeRefund>("/refunds", "POST", body, input.idempotency_key);
}

// ---------------------------------------------------------------------------
// Webhook signature verification (Stripe spec)
// ---------------------------------------------------------------------------

interface ParsedSignatureHeader {
  timestamp: number;
  signatures: string[];
}

function parseSignatureHeader(header: string): ParsedSignatureHeader | null {
  const parts = header.split(",").map((s) => s.trim());
  let timestamp = 0;
  const signatures: string[] = [];
  for (const p of parts) {
    const [k, v] = p.split("=");
    if (!k || !v) continue;
    if (k === "t") timestamp = Number(v);
    else if (k === "v1") signatures.push(v);
  }
  if (!timestamp || signatures.length === 0) return null;
  return { timestamp, signatures };
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Verifica la firma del webhook según la especificación oficial de Stripe.
 * Tolerancia de 5 minutos para prevenir replay attacks.
 * @returns el evento parseado si es válido, o null si no lo es.
 */
export async function verifyWebhookSignature(
  rawBody: string,
  sigHeader: string | null,
  secret: string,
  toleranceSeconds = 300,
): Promise<unknown | null> {
  if (!sigHeader) return null;
  const parsed = parseSignatureHeader(sigHeader);
  if (!parsed) return null;

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parsed.timestamp) > toleranceSeconds) return null;

  const payload = `${parsed.timestamp}.${rawBody}`;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  const expectedHex = bytesToHex(new Uint8Array(signature));

  const match = parsed.signatures.some((s) => timingSafeEqual(s, expectedHex));
  if (!match) return null;

  try {
    return JSON.parse(rawBody);
  } catch {
    return null;
  }
}
