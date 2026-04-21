// ============================================================================
// Ruta oculta de verificación de Sentry
// ----------------------------------------------------------------------------
// GET /sentry-check
//   - En development: devuelve 200 con estado.
//   - En production: dispara una excepción controlada para verificar que
//     Sentry recibe eventos en el entorno desplegado.
//
// USO: curl https://tu-dominio/sentry-check?token=<SENTRY_CHECK_TOKEN>
// Sin el token correcto responde 404 para no exponer la ruta a crawlers.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { captureClinicalError } from "@/lib/sentry";

export const dynamic = "force-dynamic";

class SentryHealthcheckError extends Error {
  constructor() {
    super("Sentry healthcheck — intentional error");
    this.name = "SentryHealthcheckError";
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = req.nextUrl.searchParams.get("token");
  const expected = process.env.SENTRY_CHECK_TOKEN;

  if (!expected || token !== expected) {
    return new NextResponse("Not Found", { status: 404 });
  }

  try {
    throw new SentryHealthcheckError();
  } catch (err) {
    captureClinicalError(err, {
      area: "edge-function",
      operation: "healthcheck",
      fingerprint: ["sentry-healthcheck"],
    });
  }

  return NextResponse.json({
    status: "ok",
    message: "Sentry event dispatched. Check dashboard in ~30s.",
    dsn_configured: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
    environment: process.env.VERCEL_ENV ?? process.env.NEXT_PUBLIC_APP_ENV ?? "unknown",
  });
}
