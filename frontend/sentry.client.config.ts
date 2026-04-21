// ============================================================================
// Sentry — Configuración BROWSER (Next.js client runtime)
// ----------------------------------------------------------------------------
// IMPORTANTE: este proyecto maneja datos sanitarios (RGPD Art. 9 - categoría
// especial). Sentry por defecto envía IP, cookies, user-agent, URLs con query
// strings y bodies de requests. TODO eso puede contener PII o datos de salud.
//
// Reglas estrictas aplicadas aquí:
//   - send_default_pii = false  → nunca IP, user-agent, cookies.
//   - beforeSend        → scrubbing agresivo (URLs, headers, bodies, user).
//   - replays           → desactivados hasta auditoría específica.
//   - traces rate       → 10% (suficiente para perf, no spam).
//   - profiling         → desactivado (datos demasiado finos).
// ============================================================================

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const enabled = Boolean(dsn) && process.env.NEXT_PUBLIC_APP_ENV !== "development";

Sentry.init({
  dsn,
  enabled,

  environment:
    process.env.NEXT_PUBLIC_APP_ENV ?? process.env.VERCEL_ENV ?? "development",
  release: process.env.NEXT_PUBLIC_COMMIT_SHA ?? undefined,

  // ── PRIVACIDAD ──
  sendDefaultPii: false,
  attachStacktrace: true,
  maxBreadcrumbs: 30,

  // ── SAMPLING ──
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  // ── SCRUBBING ──
  beforeSend(event, hint) {
    // 1. Eliminar query strings enteros de la URL del request
    if (event.request?.url) {
      try {
        const u = new URL(event.request.url);
        event.request.url = `${u.origin}${u.pathname}`;
      } catch {
        event.request.url = event.request.url.split("?")[0];
      }
    }

    // 2. Limpiar headers sensibles
    if (event.request?.headers) {
      const h = event.request.headers as Record<string, string>;
      delete h["cookie"];
      delete h["authorization"];
      delete h["x-supabase-auth"];
      delete h["x-forwarded-for"];
      delete h["x-real-ip"];
    }

    // 3. Nunca enviar body (puede contener diagnósticos, notas clínicas…)
    if (event.request?.data) {
      event.request.data = "[REDACTED]";
    }

    // 4. Eliminar identidad del usuario — solo dejamos id opaco (uuid)
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
      delete event.user.username;
    }

    // 5. Limpiar breadcrumbs con datos potencialmente sensibles
    if (event.breadcrumbs) {
      for (const bc of event.breadcrumbs) {
        if (bc.category === "fetch" || bc.category === "xhr") {
          if (bc.data && typeof bc.data === "object") {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const d = bc.data as any;
            if (typeof d.url === "string") d.url = d.url.split("?")[0];
            delete d.request_body;
            delete d.response_body;
          }
        }
      }
    }

    // 6. Filtrar errores de extensiones de navegador (no son nuestros)
    const originalException = hint?.originalException;
    if (originalException instanceof Error) {
      const stack = originalException.stack ?? "";
      if (
        stack.includes("chrome-extension://") ||
        stack.includes("moz-extension://") ||
        stack.includes("safari-extension://")
      ) {
        return null;
      }
    }

    return event;
  },

  // ── RUIDO CONOCIDO ──
  ignoreErrors: [
    "ResizeObserver loop completed with undelivered notifications",
    "ResizeObserver loop limit exceeded",
    "Non-Error promise rejection captured",
    "ChunkLoadError",
    /Failed to fetch/,
    /NetworkError/,
    /Load failed/,
    // Abortos de navegación de Next.js Router (falsos positivos)
    "NEXT_REDIRECT",
    "NEXT_NOT_FOUND",
  ],

  denyUrls: [
    /extensions\//i,
    /^chrome:\/\//i,
    /^chrome-extension:\/\//i,
    /^moz-extension:\/\//i,
    /^safari-extension:\/\//i,
  ],
});
