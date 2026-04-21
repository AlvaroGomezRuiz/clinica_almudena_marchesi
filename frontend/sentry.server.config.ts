// ============================================================================
// Sentry — Configuración SERVER (Node runtime: API Routes, Server Actions, RSC)
// ----------------------------------------------------------------------------
// Aquí pasa lo más sensible: bodies de POST con notas clínicas, respuestas de
// Supabase con filas cifradas/descifradas, metadatos de webhooks, etc.
// Por eso el beforeSend aquí es todavía más estricto que en client.
// ============================================================================

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
const enabled = Boolean(dsn) && process.env.NEXT_PUBLIC_APP_ENV !== "development";

Sentry.init({
  dsn,
  enabled,

  environment:
    process.env.NEXT_PUBLIC_APP_ENV ?? process.env.VERCEL_ENV ?? "development",
  release:
    process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.NEXT_PUBLIC_COMMIT_SHA ?? undefined,

  sendDefaultPii: false,
  attachStacktrace: true,
  maxBreadcrumbs: 30,
  tracesSampleRate: 0.1,

  // Bloquear profiling en server — no queremos ver stack traces con PII.
  profilesSampleRate: 0,

  beforeSend(event) {
    // Quitar query strings de la URL
    if (event.request?.url) {
      try {
        const u = new URL(event.request.url);
        event.request.url = `${u.origin}${u.pathname}`;
      } catch {
        event.request.url = event.request.url.split("?")[0];
      }
    }

    // Headers
    if (event.request?.headers) {
      const h = event.request.headers as Record<string, string>;
      delete h["cookie"];
      delete h["authorization"];
      delete h["x-supabase-auth"];
      delete h["x-forwarded-for"];
      delete h["x-real-ip"];
      delete h["stripe-signature"];
      delete h["svix-signature"];
    }

    // Body — TODO redacted en server. Si hace falta contexto, usar tags manuales.
    if (event.request?.data) {
      event.request.data = "[REDACTED]";
    }
    if (event.request?.query_string) {
      event.request.query_string = "[REDACTED]";
    }

    // Usuario — solo id opaco
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
      delete event.user.username;
    }

    // Breadcrumbs
    if (event.breadcrumbs) {
      for (const bc of event.breadcrumbs) {
        if (bc.data && typeof bc.data === "object") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const d = bc.data as any;
          if (typeof d.url === "string") d.url = d.url.split("?")[0];
          delete d.request_body;
          delete d.response_body;
          delete d.body;
        }
      }
    }

    return event;
  },

  beforeSendTransaction(transaction) {
    // Anonimizar URLs de transacciones de performance
    if (transaction.request?.url) {
      try {
        const u = new URL(transaction.request.url);
        transaction.request.url = `${u.origin}${u.pathname}`;
      } catch {
        /* ignore */
      }
    }
    return transaction;
  },

  ignoreErrors: [
    "NEXT_REDIRECT",
    "NEXT_NOT_FOUND",
    /AbortError/,
  ],
});
