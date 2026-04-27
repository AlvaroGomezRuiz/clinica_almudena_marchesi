// ============================================================================
// Sentry wrapper minimalista para Deno / Supabase Edge Functions
// ----------------------------------------------------------------------------
// El SDK oficial @sentry/deno aún no es estable en el runtime de Supabase.
// Usamos la API HTTP de Sentry (envelope endpoint) directamente:
//   POST https://<region>.ingest.<host>/api/<project>/envelope/?sentry_key=<key>
//
// Reglas privacy-first (idénticas al frontend):
//   - Sin PII por defecto.
//   - Sin request body.
//   - Fingerprint determinista para agrupar bien.
//   - Fire-and-forget: NUNCA bloqueamos la respuesta de la EF si Sentry falla.
// ============================================================================

interface SentryEvent {
  event_id: string;
  timestamp: number;
  platform: "javascript";
  level: "fatal" | "error" | "warning" | "info";
  environment: string;
  release?: string;
  server_name?: string;
  tags: Record<string, string>;
  extra?: Record<string, unknown>;
  exception?: {
    values: Array<{
      type: string;
      value: string;
      stacktrace?: { frames: Array<{ filename?: string; function?: string; lineno?: number }> };
    }>;
  };
  message?: { formatted: string };
  fingerprint?: string[];
}

interface DsnParts {
  host: string;
  projectId: string;
  publicKey: string;
  protocol: string;
}

function parseDsn(dsn: string): DsnParts | null {
  try {
    const u = new URL(dsn);
    const projectId = u.pathname.replace(/^\//, "");
    if (!projectId || !u.username) return null;
    return {
      host: u.host,
      projectId,
      publicKey: u.username,
      protocol: u.protocol.replace(":", ""),
    };
  } catch {
    return null;
  }
}

function uuid(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

function parseStack(stack: string | undefined): NonNullable<SentryEvent["exception"]>["values"][0]["stacktrace"] | undefined {
  if (!stack) return undefined;
  const frames = stack
    .split("\n")
    .slice(1)
    .map((line) => {
      const m = line.trim().match(/^at\s+(.+?)\s+\((.+?):(\d+):\d+\)/);
      if (m) return { function: m[1], filename: m[2], lineno: Number(m[3]) };
      const m2 = line.trim().match(/^at\s+(.+?):(\d+):\d+/);
      if (m2) return { filename: m2[1], lineno: Number(m2[2]) };
      return { function: line.trim() };
    })
    .reverse();
  return { frames };
}

export type EdgeArea =
  | "stripe-webhook"
  | "stripe-checkout"
  | "stripe-payment-intent"
  | "invoice-pdf"
  | "rgpd-request"
  | "send-email"
  | "cancel-cita"
  | "assign-recurso"
  | "resend-webhook"
  | "cron-recordatorios-24h";

export interface EdgeContext {
  area: EdgeArea;
  event_type?: string;
  entity_id?: string;
  user_id?: string;
  fingerprint?: string[];
}

async function sendEnvelope(event: SentryEvent, dsn: string): Promise<void> {
  const parts = parseDsn(dsn);
  if (!parts) return;

  const endpoint = `${parts.protocol}://${parts.host}/api/${parts.projectId}/envelope/?sentry_key=${parts.publicKey}&sentry_version=7`;

  const envelopeHeader = JSON.stringify({
    event_id: event.event_id,
    sent_at: new Date().toISOString(),
    dsn,
  });
  const itemHeader = JSON.stringify({ type: "event" });
  const body = `${envelopeHeader}\n${itemHeader}\n${JSON.stringify(event)}\n`;

  try {
    await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-sentry-envelope",
        "User-Agent": "almudena-edge/1.0",
      },
      body,
      // Deno fetch no tiene keepalive, pero el timeout implícito es bajo.
    });
  } catch {
    // Fire-and-forget: no bloqueamos la ejecución.
  }
}

function buildEvent(
  level: SentryEvent["level"],
  ctx: EdgeContext,
  err?: unknown,
  messageFallback?: string
): SentryEvent {
  const environment =
    Deno.env.get("SENTRY_ENVIRONMENT") ??
    (Deno.env.get("DENO_DEPLOYMENT_ID") ? "production" : "development");

  const ev: SentryEvent = {
    event_id: uuid(),
    timestamp: Math.floor(Date.now() / 1000),
    platform: "javascript",
    level,
    environment,
    release: Deno.env.get("DENO_DEPLOYMENT_ID") ?? undefined,
    server_name: `edge-${ctx.area}`,
    tags: {
      runtime: "deno",
      area: ctx.area,
      ...(ctx.event_type ? { event_type: ctx.event_type } : {}),
      ...(ctx.entity_id ? { entity_id: ctx.entity_id } : {}),
      ...(ctx.user_id ? { user_id: ctx.user_id } : {}),
    },
    fingerprint: ctx.fingerprint ?? ["{{ default }}", ctx.area],
  };

  if (err instanceof Error) {
    ev.exception = {
      values: [
        {
          type: err.name ?? "Error",
          value: err.message,
          stacktrace: parseStack(err.stack),
        },
      ],
    };
  } else if (err !== undefined) {
    ev.message = { formatted: String(err) };
  } else if (messageFallback) {
    ev.message = { formatted: messageFallback };
  }

  return ev;
}

/**
 * Captura una excepción en una Edge Function. Fire-and-forget.
 * Siempre sigue el flujo normal — nunca tirar por culpa de Sentry.
 */
export function captureEdgeError(err: unknown, ctx: EdgeContext): void {
  const dsn = Deno.env.get("SENTRY_DSN");
  if (!dsn) return;
  const ev = buildEvent("error", ctx, err);
  // No await → fire-and-forget.
  sendEnvelope(ev, dsn);
}

/**
 * Captura un mensaje informativo estructurado (audit trail secundario).
 */
export function captureEdgeMessage(
  message: string,
  ctx: EdgeContext,
  level: SentryEvent["level"] = "info"
): void {
  const dsn = Deno.env.get("SENTRY_DSN");
  if (!dsn) return;
  const ev = buildEvent(level, ctx, undefined, message);
  sendEnvelope(ev, dsn);
}

/**
 * Wrapper para handlers de Edge Functions. Captura cualquier excepción no
 * manejada y la reenvía a Sentry ANTES de rethrow, preservando el stack.
 *
 * @example
 *   Deno.serve(wrapEdgeHandler("stripe-webhook", async (req) => { ... }));
 */
export function wrapEdgeHandler(
  area: EdgeArea,
  handler: (req: Request) => Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    try {
      return await handler(req);
    } catch (err) {
      captureEdgeError(err, { area });
      throw err;
    }
  };
}
