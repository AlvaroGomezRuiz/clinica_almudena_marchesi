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
 *   5. Usuario ya autenticado en /login → redirige a su home según rol.
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
  if (path === '/login') {
    url.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
  }
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  const isAdminZone   = pathname.startsWith('/admin');
  const isPortalZone  = pathname.startsWith('/portal');
  const isPagosZone   = pathname.startsWith('/pagos');
  const isLoginPage   = pathname === '/login';
  const isProtected   = isAdminZone || isPortalZone;

  // Rutas completamente públicas: no tocar sesión (perf).
  if (!isProtected && !isLoginPage && !isPagosZone && isPublicPath(pathname)) {
    return applyRuntimeHeaders(NextResponse.next());
  }

  const { response, user } = await updateSupabaseSession(request);

  // ─── Zona protegida sin sesión → expulsar a /login ───
  if (isProtected && !user) {
    return applyRuntimeHeaders(redirectTo(request, '/login', 'no_session'));
  }

  // ─── RBAC: rol no coincide con zona ───
  if (user && user.profile) {
    const role = user.profile.role;

    if (isAdminZone && role !== 'admin') {
      return applyRuntimeHeaders(redirectTo(request, '/portal', 'role_mismatch'));
    }
    if (isPortalZone && role !== 'paciente') {
      return applyRuntimeHeaders(redirectTo(request, '/admin', 'role_mismatch'));
    }
  }

  // ─── Usuario autenticado intenta ver /login → home según rol ───
  if (user && user.profile && isLoginPage) {
    const target = user.profile.role === 'admin' ? '/admin' : '/portal';
    return applyRuntimeHeaders(redirectTo(request, target));
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
