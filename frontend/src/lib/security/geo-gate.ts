/**
 * Restricción geográfica (Edge) para reducir superficie de ataque.
 *
 * - Fuente de país: `x-vercel-ip-country` (Vercel) o `cf-ipcountry` (Cloudflare delante).
 * - Sin header de país: no bloquea (entornos locales, proxies raros, tests).
 * - Rastreadores: lista conservadora de User-Agents (el spoofing es posible;
 *   combinar con WAF / Bot Protection en Vercel o en el proveedor DNS).
 * - E2E: `GEO_E2E_BYPASS_TOKEN` + cabecera `X-Geo-E2E-Bearer` (solo CI/QA).
 */
import type { NextRequest } from 'next/server';

const GEO_ALLOWLIST = new Set<string>(['ES', 'PT', 'AD']);

const CRAWLER_UA_SUBSTR: readonly string[] = [
  'googlebot',
  'adsbot-google',
  'google-inspectiontool',
  'googleinspectiontool',
  'mediapartners-google',
  'googleother',
  'storebot-google',
  'google-extended',
  'adsbot',
  'bingbot',
  'msnbot',
  'yandex',
  'duckduckbot',
  'baiduspider',
  'applebot',
  'facebot',
  'facebookexternalhit',
  'twitterbot',
  'linkedinbot',
  'pinterest',
  'rogerbot',
  'slurp',
  'embedly',
  'gptbot',
  'oai-searchbot',
  'chatgpt-user',
  'claudebot',
  'anthropic-ai',
  'ccbot',
  'perplexitybot',
  'amazonbot',
] as const;

/**
 * @returns `true` si se debe aplicar comprobación de país (puede aún permitir
 * el request vía rastreador o bypass de pruebas).
 */
export function isGeoEnforcementEnabled(): boolean {
  const v = process.env.GEO_ENFORCE?.trim();
  if (v === '1' || v?.toLowerCase() === 'true' || v?.toLowerCase() === 'on') {
    return true;
  }
  return false;
}

/**
 * Código ISO 3166-1 alfa-2 o `null` si el edge no aporta país.
 */
export function getRequestCountryCode(request: NextRequest): string | null {
  const raw =
    request.headers.get('x-vercel-ip-country') ?? request.headers.get('cf-ipcountry');
  if (raw == null || raw.length !== 2) {
    return null;
  }
  return raw.toUpperCase();
}

function isLikelyCrawler(ua: string | null | undefined): boolean {
  if (ua == null || ua.length < 4) {
    return false;
  }
  const lower = ua.toLowerCase();
  return CRAWLER_UA_SUBSTR.some((s) => lower.includes(s));
}

function isE2EBypass(request: NextRequest): boolean {
  const token = process.env.GEO_E2E_BYPASS_TOKEN?.trim();
  if (token == null || token.length < 8) {
    return false;
  }
  const sent = request.headers.get('x-geo-e2e-bearer');
  return sent === token;
}

export type GeoGateResult =
  | { kind: 'allow'; reason: 'enforcement_off' }
  | { kind: 'allow'; reason: 'no_country_header' }
  | { kind: 'allow'; reason: 'allowlisted_country' }
  | { kind: 'allow'; reason: 'crawler_user_agent' }
  | { kind: 'allow'; reason: 'e2e_bypass' }
  | { kind: 'deny'; country: string };

/**
 * Regla: si hay país y no es ES/PT/AD → denegar, salvo rastreador o bypass E2E.
 * Si `GEO_ENFORCE` no está activo, siempre `allow` con `enforcement_off`.
 */
export function evaluateGeoGate(request: NextRequest): GeoGateResult {
  if (!isGeoEnforcementEnabled()) {
    return { kind: 'allow', reason: 'enforcement_off' };
  }
  if (isE2EBypass(request)) {
    return { kind: 'allow', reason: 'e2e_bypass' };
  }
  const ua = request.headers.get('user-agent');
  if (isLikelyCrawler(ua)) {
    return { kind: 'allow', reason: 'crawler_user_agent' };
  }
  const code = getRequestCountryCode(request);
  if (code == null) {
    return { kind: 'allow', reason: 'no_country_header' };
  }
  if (GEO_ALLOWLIST.has(code)) {
    return { kind: 'allow', reason: 'allowlisted_country' };
  }
  return { kind: 'deny', country: code };
}

export function buildGeoDeniedHtml(detectedCountry: string): string {
  const safe = /^[A-Z0-9-]{1,8}$/u.test(detectedCountry) ? detectedCountry : '—';
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<meta name="robots" content="noindex, nofollow"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Acceso restringido</title>
</head>
<body style="font-family:system-ui,sans-serif;padding:2rem;max-width:32rem;margin:auto;line-height:1.5">
<h1>Acceso restringido</h1>
<p>La consulta solo atiende solicitudes desde España, Portugal y Andorra. Si estás de viaje o crees que es un error, escribe a <a href="mailto:clinica.almudena.marchesi@outlook.com">el correo de la clínica</a> (desde un entorno en la zona permitida) o conecta a una red en ES/PT/AD.</p>
<p style="color:#666;font-size:0.9rem">Código de país detectado: <code>${safe}</code></p>
</body>
</html>`;
}
