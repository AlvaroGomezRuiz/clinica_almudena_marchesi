// ============================================================================
// Next.js Instrumentation Hook
// ----------------------------------------------------------------------------
// Se carga automáticamente por Next.js 14+ al arrancar cada runtime (Node o
// Edge). Delegamos la init de Sentry a los archivos específicos por runtime.
//
// Ref: https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
// ============================================================================

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Captura automática de errores no manejados en server actions / RSC.
// Requerido por @sentry/nextjs 8+.
export { captureRequestError as onRequestError } from "@sentry/nextjs";
