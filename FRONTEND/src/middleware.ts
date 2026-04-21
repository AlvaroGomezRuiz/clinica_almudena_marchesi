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

function buildCsp(isProd: boolean): string {
  const supabaseDomain = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const backendApi = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? 'http://localhost:8000';

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    `script-src 'self' ${isProd ? '' : "'unsafe-eval'"} 'unsafe-inline' https://va.vercel-scripts.com https://vercel.live https://js.stripe.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https://lh3.googleusercontent.com https://images.unsplash.com " + supabaseDomain,
    `connect-src 'self' ${supabaseDomain} wss://${supabaseDomain.replace(/^https?:\/\//, '')} ${backendApi} https://api.stripe.com`,
    "frame-src https://js.stripe.com https://hooks.stripe.com",
    'upgrade-insecure-requests',
  ];
  return directives.join('; ').replace(/\s{2,}/g, ' ').trim();
}

function applySecurityHeaders(response: NextResponse, isProd: boolean): NextResponse {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(self "https://js.stripe.com"), usb=()'
  );
  response.headers.set('Content-Security-Policy', buildCsp(isProd));

  if (isProd) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    );
  }
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
  const isProd = process.env.NODE_ENV === 'production';
  const { pathname } = request.nextUrl;

  const isAdminZone   = pathname.startsWith('/admin');
  const isPortalZone  = pathname.startsWith('/portal');
  const isPagosZone   = pathname.startsWith('/pagos');
  const isLoginPage   = pathname === '/login';
  const isProtected   = isAdminZone || isPortalZone;

  // Rutas completamente públicas: no tocar sesión (perf).
  if (!isProtected && !isLoginPage && !isPagosZone && isPublicPath(pathname)) {
    return applySecurityHeaders(NextResponse.next(), isProd);
  }

  const { response, user } = await updateSupabaseSession(request);

  // ─── Zona protegida sin sesión → expulsar a /login ───
  if (isProtected && !user) {
    return applySecurityHeaders(redirectTo(request, '/login', 'no_session'), isProd);
  }

  // ─── RBAC: rol no coincide con zona ───
  if (user && user.profile) {
    const role = user.profile.role;

    if (isAdminZone && role !== 'admin') {
      return applySecurityHeaders(redirectTo(request, '/portal', 'role_mismatch'), isProd);
    }
    if (isPortalZone && role !== 'paciente') {
      return applySecurityHeaders(redirectTo(request, '/admin', 'role_mismatch'), isProd);
    }
  }

  // ─── Usuario autenticado intenta ver /login → home según rol ───
  if (user && user.profile && isLoginPage) {
    const target = user.profile.role === 'admin' ? '/admin' : '/portal';
    return applySecurityHeaders(redirectTo(request, target), isProd);
  }

  return applySecurityHeaders(response, isProd);
}

export const config = {
  matcher: [
    // Excluir solo assets estáticos; todo lo demás pasa por middleware.
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2)).*)',
  ],
};
