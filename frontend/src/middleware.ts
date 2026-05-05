/**
 * Middleware Next.js — Autenticación Supabase + RBAC por zona.
 *
 * Responsabilidades (en orden de ejecución):
 *   0. Si GEO_ENFORCE=1: permitir solo ES/PT/AD (rastreadores y E2E con token exentos); 403 con noindex.
 *   1. Refrescar la sesión Supabase (cookies httpOnly rotating refresh token).
 *   2. Cabeceras de runtime (Vary: cookie; con geo, también por país en edge).
 *   3. Expulsar a /login cualquier request a zona protegida sin sesión válida.
 *   4. RBAC:
 *        - /admin/*  → solo profiles.role = 'admin'
 *        - /portal/* → solo profiles.role = 'paciente'
 *   4b. Payment-gate (headers internos x-ss-portal-*):
 *        - Sin pago/bono/cita confirmada → layout redirige a /portal/bienvenida
 *          salvo rutas operativas (pagos, citas, bienvenida).
 *   5. Usuario ya autenticado en /login: si falta MFA (AAL1→2) → /login/mfa;
 *      si ya completó → home según rol.
 *   6. Sin sesión en /login/mfa → vuelve a /login; con sesión plena (sin MFA
 *      pendiente) en /login/mfa → home (no debe atascarse en la pantalla).
 *
 * Principios de defensa:
 *   - NUNCA confiamos en cookie parseada client-side: siempre getUser() (valida JWT).
 *   - fail-closed: ante duda, expulsar.
 *   - RLS activo en Postgres = si middleware falla, la DB protege igual.
 */
import { NextResponse, type NextRequest } from 'next/server';

import {
  buildGeoDeniedHtml,
  evaluateGeoGate,
  isGeoEnforcementEnabled,
} from '@/lib/security/geo-gate';
import { updateSupabaseSession } from '@/lib/supabase/middleware';

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/enfoque',
  '/servicios',
  '/sobre-mi',
  '/contacto',
  '/aviso-legal',
  '/privacidad',
  '/cookies',
  '/registro-paciente',
  '/auth',
];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  return PUBLIC_PATHS.some((p) => p !== '/' && pathname.startsWith(`${p}/`));
}

/**
 * Cabeceras de runtime: `Vary` para caché correcta; resto (CSP, HSTS, etc.) en
 * `next.config.js`. Con geo activo, el `Vary` incluye cabecera de país en edge.
 */
function applyRuntimeHeaders(response: NextResponse): NextResponse {
  const base = isGeoEnforcementEnabled()
    ? 'Cookie, Accept-Encoding, X-Vercel-IP-Country, CF-IPCountry'
    : 'Cookie, Accept-Encoding';
  response.headers.set('Vary', base);
  return response;
}

function redirectTo(request: NextRequest, path: string, reason?: string): NextResponse {
  const url = new URL(path, request.url);
  if (reason) url.searchParams.set('reason', reason);
  if (path === '/login' || path === '/login/mfa') {
    url.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
  }
  return NextResponse.redirect(url);
}

function redirectToLoginMfaNoSession(request: NextRequest): NextResponse {
  const u = new URL('/login', request.url);
  u.searchParams.set('reason', 'mfa_no_session');
  return NextResponse.redirect(u);
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  const geo = evaluateGeoGate(request);
  if (geo.kind === 'deny') {
    const res = new NextResponse(buildGeoDeniedHtml(geo.country), {
      status: 403,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
        'X-Robots-Tag': 'noindex, nofollow',
        'Cache-Control': 'no-store, max-age=0',
        'Referrer-Policy': 'no-referrer',
      },
    });
    return applyRuntimeHeaders(res);
  }

  const isAdminZone   = pathname.startsWith('/admin');
  const isPortalZone  = pathname.startsWith('/portal');
  const isPagosZone   = pathname.startsWith('/pagos');
  const isLoginPage   = pathname === '/login';
  const isMfaPage     = pathname === '/login/mfa';
  const isRegisterPage = pathname === '/registro-paciente';
  const isProtected   = isAdminZone || isPortalZone;

  /* ── Portal oculto: redirigir /login, /login/mfa y /registro-paciente
     a /contacto. El código del portal se mantiene intacto pero no es
     accesible desde la web pública. Accesos directos a /admin y /portal
     siguen funcionando para usuarios autenticados. ─────────────────── */
  if (isLoginPage || isMfaPage || isRegisterPage) {
    return applyRuntimeHeaders(NextResponse.redirect(new URL('/contacto', request.url)));
  }

  // Público sin tocar Supabase.
  if (
    !isProtected &&
    !isPagosZone &&
    isPublicPath(pathname) &&
    !pathname.startsWith('/login/')
  ) {
    return applyRuntimeHeaders(NextResponse.next());
  }

  const { response, user, needsMfa } = await updateSupabaseSession(request, pathname);

  // Pantalla de código: sin cookies de sesión → al login (sin next= /login/mfa)
  if (isMfaPage && !user) {
    return applyRuntimeHeaders(redirectToLoginMfaNoSession(request));
  }
  // Ya con MFA hecho (o sin MFA) no debe quedar en /login/mfa
  if (isMfaPage && user && !needsMfa) {
    if (user.profile) {
      const t = user.profile.role === 'admin' ? '/admin' : '/portal';
      return applyRuntimeHeaders(NextResponse.redirect(new URL(t, request.url)));
    }
    return applyRuntimeHeaders(NextResponse.redirect(new URL('/portal', request.url)));
  }

  // Zona /admin|/portal con sesión a medias (falta TOTP) → pantalla MFA
  if (isProtected && user && needsMfa) {
    return applyRuntimeHeaders(redirectTo(request, '/login/mfa'));
  }

  // Zona protegida sin sesión
  if (isProtected && !user) {
    return applyRuntimeHeaders(redirectTo(request, '/login', 'no_session'));
  }

  // RBAC: rol no coincide
  if (user && user.profile) {
    const role = user.profile.role;

    if (isAdminZone && role !== 'admin') {
      return applyRuntimeHeaders(redirectTo(request, '/portal', 'role_mismatch'));
    }
    if (isPortalZone && role !== 'paciente') {
      return applyRuntimeHeaders(redirectTo(request, '/admin', 'role_mismatch'));
    }
  }

  if (user && user.profile && isLoginPage) {
    if (needsMfa) {
      const mfa = new URL('/login/mfa', request.url);
      mfa.search = request.nextUrl.search;
      return applyRuntimeHeaders(NextResponse.redirect(mfa));
    }
    const target = user.profile.role === 'admin' ? '/admin' : '/portal';
    return applyRuntimeHeaders(NextResponse.redirect(new URL(target, request.url)));
  }

  return applyRuntimeHeaders(response);
}

export const config = {
  matcher: [
    /* Excluidas del middleware: assets estáticos, endpoints de monitoring
       (tunnel Sentry), metadata de AI/SEO y recursos sin cookies.
       Cuanto menor sea la superficie del matcher, menor latencia global. */
    '/((?!_next/static|_next/image|_next/data|favicon.ico|manifest.webmanifest|robots.txt|sitemap.xml|monitoring|llms.txt|llms-full.txt|ai/|.well-known/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2|txt|json|xml)).*)',
  ],
};
