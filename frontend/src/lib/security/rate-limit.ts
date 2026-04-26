/**
 * Rate limiter unificado — Upstash Redis (sliding window) + fallback in-memory.
 *
 * Estrategia:
 *   ▸ Si `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` están definidas,
 *     usa `@upstash/ratelimit` con algoritmo sliding-window distribuido. El
 *     bucket es global a todas las instancias Vercel de todas las regiones, lo
 *     que le convierte en un hard-limit real (no una mitigación).
 *   ▸ Si no, cae a un Map en memoria propio de cada instancia (suficiente para
 *     dev y preview; para prod siempre se espera Upstash).
 *
 * Compatibilidad:
 *   - Mantenemos la API histórica `{ key, max, windowMs }` → `{ ok, remaining, resetAt }`
 *     pero ahora es `async`. Todos los callers existentes son handlers de API
 *     route o Server Actions, todos ya `async`.
 *
 * Seguridad:
 *   - El `prefix` de Redis (`ratelimit:almudena:`) aisla los buckets por app.
 *   - Los buckets se indexan por `key`, que los callers ya construyen como
 *     `acción:identificador` (p.ej. `attach:<user_id>`, `register:<ip>`).
 *   - Nunca se guarda información sensible en la key (solo UUID/IP hash).
 */

import { NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export interface RateLimitOptions {
  /** Clave única por usuario + acción: p.ej. `login:203.0.113.5`. */
  key: string;
  /** Máximo de requests permitidos en la ventana. */
  max: number;
  /** Ventana en milisegundos. */
  windowMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

// ─── Upstash setup (lazy, shared) ───────────────────────────────────────────
let sharedRedis: Redis | null | undefined = undefined;
function getRedis(): Redis | null {
  if (sharedRedis !== undefined) return sharedRedis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    sharedRedis = null;
    return null;
  }
  try {
    sharedRedis = new Redis({ url, token });
  } catch {
    sharedRedis = null;
  }
  return sharedRedis;
}

const limiterCache = new Map<string, Ratelimit>();
function getLimiter(max: number, windowMs: number): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;
  const cacheKey = `${max}:${windowMs}`;
  const existing = limiterCache.get(cacheKey);
  if (existing) return existing;
  const fresh = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(max, `${windowMs} ms`),
    prefix: 'ratelimit:almudena',
    analytics: false,
    timeout: 800, // ms — fail-open si Upstash no responde rápido
  });
  limiterCache.set(cacheKey, fresh);
  return fresh;
}

// ─── Fallback in-memory (misma semántica que antes) ─────────────────────────
interface Bucket {
  count: number;
  resetAt: number;
}
const buckets = new Map<string, Bucket>();
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
let lastSweep = Date.now();

function sweepIfNeeded(): void {
  const now = Date.now();
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  buckets.forEach((v, k) => {
    if (v.resetAt <= now) buckets.delete(k);
  });
  lastSweep = now;
}

function enforceInMemory(opts: RateLimitOptions): RateLimitResult {
  sweepIfNeeded();
  const now = Date.now();
  const bucket = buckets.get(opts.key);
  if (!bucket || bucket.resetAt <= now) {
    const fresh: Bucket = { count: 1, resetAt: now + opts.windowMs };
    buckets.set(opts.key, fresh);
    return { ok: true, remaining: opts.max - 1, resetAt: fresh.resetAt };
  }
  bucket.count += 1;
  const ok = bucket.count <= opts.max;
  return { ok, remaining: Math.max(0, opts.max - bucket.count), resetAt: bucket.resetAt };
}

// ─── API pública ────────────────────────────────────────────────────────────

/**
 * Respuesta JSON 429 con `Retry-After` (segundos), alineada a `POST /api/mensajes/attach`.
 */
export function rateLimitJsonResponse(result: RateLimitResult): NextResponse {
  const retryAfterSec = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
  return NextResponse.json(
    { error: 'rate_limited' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSec) } }
  );
}

export async function enforceRateLimit(opts: RateLimitOptions): Promise<RateLimitResult> {
  const limiter = getLimiter(opts.max, opts.windowMs);
  if (limiter) {
    try {
      const res = await limiter.limit(opts.key);
      return {
        ok: res.success,
        remaining: Math.max(0, res.remaining),
        resetAt: res.reset,
      };
    } catch {
      /* Si falla Upstash (red, auth), caemos a in-memory para no bloquear tráfico legítimo. */
    }
  }
  return enforceInMemory(opts);
}

/**
 * Extrae IP del request desde los headers comunes. Vercel inyecta `x-forwarded-for`
 * con la IP del cliente final al principio de la lista. Si no existe, fallback a
 * `x-real-ip`. Último recurso: `'unknown'` (todos caen en el mismo bucket).
 */
export function getClientIp(headers: Headers): string {
  const xff = headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0];
    if (first) return first.trim();
  }
  const xri = headers.get('x-real-ip');
  if (xri) return xri.trim();
  return 'unknown';
}

/**
 * Devuelve true si hay un backend Redis distribuido configurado. Útil para
 * logs de arranque o para UIs de diagnóstico admin.
 */
export function isDistributedRateLimitAvailable(): boolean {
  return getRedis() !== null;
}
