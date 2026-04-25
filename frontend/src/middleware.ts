/**
 * Middleware Next.js — Autenticación Supabase + RBAC por zona.
 *
 * Responsabilidades (en orden de ejecución):
 *   1. Refrescar la sesión Supabase (cookies httpOnly rotating refresh token).
 *   2. Cabeceras de seguridad (CSP, HSTS, X-Frame-Options, etc.).
 *   3. Expulsar a /login cualquier request a zona protegida sin sesión válida.
 *   4. RBAC:
 *        - /admin/*  → solo profiles.role = 'admin'
 *        - /portal/* → solo profiles.role = 'paciente'
 *        - paciente sin pago → /pagos (payment-gate)
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
 * Las cabeceras de seguridad (CSP, HSTS, X-Frame, COOP, etc.) se configuran
 * como **única fuente de verdad** en `next.config.js` → `async headers()`.
 * Evitamos duplicarlas aquí para no generar divergencias entre rutas
 * estáticas (que no pasan por middleware) y dinámicas (que sí).
 *
 * El middleware solo añade cabeceras específicas de SESIÓN autenticada.
 */
function applyRuntimeHeaders(response: NextResponse): NextResponse {
  /* Vary: garantiza que la cache de Vercel no sirva la misma respuesta a
     usuarios con distintas cookies (evita fuga de sesiones entre usuarios). */
  response.headers.set('Vary', 'Cookie, Accept-Encoding');
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

  const isAdminZone   = pathname.startsWith('/admin');
  const isPortalZone  = pathname.startsWith('/portal');
  const isPagosZone   = pathname.startsWith('/pagos');
  const isLoginPage   = pathname === '/login';
  const isMfaPage     = pathname === '/login/mfa';
  const isProtected   = isAdminZone || isPortalZone;

  // Público sin tocar Supabase, salvo bajo /login/... (MFA: cookies + AAL).
  if (
    !isProtected &&
    !isLoginPage &&
    !isPagosZone &&
    isPublicPath(pathname) &&
    !pathname.startsWith('/login/')
  ) {
    return applyRuntimeHeaders(NextResponse.next());
  }

  const { response, user, needsMfa } = await updateSupabaseSession(request);

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
