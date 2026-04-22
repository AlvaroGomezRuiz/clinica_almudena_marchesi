/**
 * Rate limiter en-memoria, per-IP, por clave de acción.
 *
 * ⚠️  Limitaciones conocidas:
 *   - Vercel Serverless: cada instancia tiene su propio Map; múltiples instancias
 *     en cold-start pueden dividir el contador. Funciona como *mitigación*,
 *     no como bloqueo duro. Para hard-limit real se necesitaría Upstash KV o
 *     Vercel KV. No obstante, en el cluster fra1 con tráfico clínico moderado,
 *     la dispersión es mínima.
 *   - El `Map` se purga automáticamente para no filtrar memoria.
 *
 * ✅  Ventajas:
 *   - Zero dependencies, cero coste de red, cero coste económico.
 *   - Suficiente para frenar bots triviales y abusos desde el formulario de
 *     registro, /login, /password-reset y acciones de facturación.
 *
 * Uso:
 *   import { enforceRateLimit } from '@/lib/security/rate-limit';
 *   const rate = enforceRateLimit({ key: `register:${ip}`, max: 5, windowMs: 60_000 });
 *   if (!rate.ok) throw new Error('Too many requests');
 */

interface Bucket {
  count: number;
  resetAt: number;
}

/* Map global — en Vercel, se reutiliza mientras la instancia está caliente. */
const buckets = new Map<string, Bucket>();

/* Cada 5 minutos, barrer entradas expiradas para evitar fugas de memoria. */
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
let lastSweep = Date.now();

function sweepIfNeeded(): void {
  const now = Date.now();
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  /* Evitamos `for...of` sobre el Map (requiere downlevelIteration en TS).
     `forEach` es totalmente seguro y tiene el mismo coste. */
  buckets.forEach((v, k) => {
    if (v.resetAt <= now) buckets.delete(k);
  });
  lastSweep = now;
}

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

export function enforceRateLimit(opts: RateLimitOptions): RateLimitResult {
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
