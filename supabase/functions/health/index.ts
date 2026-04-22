// Edge Function: health
// -----------------------------------------------------------------------------
// Health-check completo del stack Supabase:
//   · DB   → SELECT 1 (latencia simple).
//   · RPC  → public.app_encryption_ready() (verifica vault + función encrypt).
//   · Vault→ presencia de `app_encryption_key` (implícita en la RPC).
//
// Uso:
//   · Monitor externo (UptimeRobot / healthchecks.io): HTTP GET/POST a esta Fn.
//   · Script CI pre-promote: fallar si status != 200.
//
// Seguridad:
//   · Sin auth pública — devuelve metadatos mínimos, sin PII ni ciphertext.
//   · `app_encryption_ready()` está grant-ed a `authenticated, service_role`;
//     aquí usamos el SERVICE_ROLE_KEY server-side del proyecto (jamás expuesto
//     al cliente), así que es seguro.
//
// Respuesta:
//   {
//     ok: boolean,
//     status: "healthy" | "degraded" | "down",
//     checks: {
//       database: { ok, latency_ms, error? },
//       encryption_ready: { ok, error? }
//     },
//     ts: ISO8601
//   }
// -----------------------------------------------------------------------------

// deno-lint-ignore-file no-explicit-any

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { buildCorsHeaders, handleOptions } from "../_shared/cors.ts";

interface CheckResult {
  ok: boolean;
  latency_ms?: number;
  error?: string;
}

interface HealthResponse {
  ok: boolean;
  status: "healthy" | "degraded" | "down";
  checks: {
    database: CheckResult;
    encryption_ready: CheckResult;
  };
  ts: string;
}

function json(body: HealthResponse, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

async function checkDatabase(
  client: ReturnType<typeof createClient>
): Promise<CheckResult> {
  const started = performance.now();
  try {
    // Query trivial sobre pg_catalog, no toca ninguna tabla de usuario.
    const { error } = await client
      .from("horario_plantillas")
      .select("id", { head: true, count: "exact" })
      .limit(1);
    if (error) return { ok: false, error: error.message };
    return { ok: true, latency_ms: Math.round(performance.now() - started) };
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e) };
  }
}

async function checkEncryptionReady(
  client: ReturnType<typeof createClient>
): Promise<CheckResult> {
  try {
    const { data, error } = await client.rpc("app_encryption_ready");
    if (error) return { ok: false, error: error.message };
    if (data !== true) {
      return { ok: false, error: "vault_key_missing_or_empty" };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e) };
  }
}

Deno.serve(async (req) => {
  const cors = buildCorsHeaders(req.headers.get("origin"));
  const optionsResponse = handleOptions(req);
  if (optionsResponse) return optionsResponse;

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !serviceRoleKey) {
    return json(
      {
        ok: false,
        status: "down",
        checks: {
          database: { ok: false, error: "env_missing" },
          encryption_ready: { ok: false, error: "env_missing" },
        },
        ts: new Date().toISOString(),
      },
      503,
      cors
    );
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [database, encryption_ready] = await Promise.all([
    checkDatabase(client),
    checkEncryptionReady(client),
  ]);

  const allOk = database.ok && encryption_ready.ok;
  const dbOnly = database.ok && !encryption_ready.ok;

  const status: HealthResponse["status"] = allOk
    ? "healthy"
    : dbOnly
      ? "degraded"
      : "down";

  const httpStatus = allOk ? 200 : dbOnly ? 200 : 503;

  return json(
    {
      ok: allOk,
      status,
      checks: { database, encryption_ready },
      ts: new Date().toISOString(),
    },
    httpStatus,
    cors
  );
});
