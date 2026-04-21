// ============================================================================
// Sentry — Configuración EDGE runtime (Next.js middleware + edge routes)
// ----------------------------------------------------------------------------
// El middleware ve TODAS las peticiones, incluso las de usuarios no autenticados
// que intentan entrar a /admin. No queremos enviar nada identificable.
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
  maxBreadcrumbs: 20,
  tracesSampleRate: 0.05,

  beforeSend(event) {
    if (event.request?.url) {
      try {
        const u = new URL(event.request.url);
        event.request.url = `${u.origin}${u.pathname}`;
      } catch {
        event.request.url = event.request.url.split("?")[0];
      }
    }

    if (event.request?.headers) {
      const h = event.request.headers as Record<string, string>;
      delete h["cookie"];
      delete h["authorization"];
      delete h["x-supabase-auth"];
      delete h["x-forwarded-for"];
      delete h["x-real-ip"];
    }

    if (event.request?.data) event.request.data = "[REDACTED]";
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
      delete event.user.username;
    }

    return event;
  },

  ignoreErrors: ["NEXT_REDIRECT", "NEXT_NOT_FOUND", /AbortError/],
});
