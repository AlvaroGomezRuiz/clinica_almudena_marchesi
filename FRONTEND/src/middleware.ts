import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

type AccessStatus = {
  has_paid: boolean;
  is_admin: boolean;
};

type JwtClaims = {
  role?: unknown;
  exp?: unknown;
  iat?: unknown;
};

type AccessStatusResponse = {
  has_paid: boolean;
  is_admin: boolean;
};

type RefreshResponse = {
  refreshed: boolean;
  access_token: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseAccessStatusResponse(data: unknown): AccessStatusResponse | null {
  if (!isRecord(data)) return null;
  const hasPaid = data['has_paid'];
  const isAdmin = data['is_admin'];
  if (typeof hasPaid !== 'boolean' || typeof isAdmin !== 'boolean') return null;
  return { has_paid: hasPaid, is_admin: isAdmin };
}

function parseRefreshResponse(data: unknown): RefreshResponse | null {
  if (!isRecord(data)) return null;
  const refreshed = data['refreshed'];
  const accessToken = data['access_token'];
  if (typeof refreshed !== 'boolean' || typeof accessToken !== 'string') return null;
  return { refreshed, access_token: accessToken };
}

async function getAccessStatus(token: string): Promise<AccessStatus | null> {
  const backendApiUrl =
    process.env.NEXT_PUBLIC_BACKEND_API_URL ?? 'http://localhost:8000/api/v1';

  try {
    const res = await fetch(`${backendApiUrl}/pagos/access-status`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    if (!res.ok) return null;

    const data: unknown = await res.json().catch(() => null);
    const parsed = parseAccessStatusResponse(data);
    return parsed ? { has_paid: parsed.has_paid, is_admin: parsed.is_admin } : null;
  } catch {
    return null;
  }
}

function nextWithPathHeader(request: NextRequest): NextResponse {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', request.nextUrl.pathname);
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

function base64UrlToBase64(input: string): string {
  const pad = '='.repeat((4 - (input.length % 4)) % 4);
  return (input + pad).replace(/-/g, '+').replace(/_/g, '/');
}

function parseJwtClaims(token: string): JwtClaims | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const payload = parts[1];
    const json = atob(base64UrlToBase64(payload));
    return JSON.parse(json) as JwtClaims;
  } catch {
    return null;
  }
}

function isHalfConsumed(claims: JwtClaims | null): boolean {
  const exp = typeof claims?.exp === 'number' ? claims.exp : null;
  const iat = typeof claims?.iat === 'number' ? claims.iat : null;
  if (!exp || !iat || exp <= iat) return false;
  const ttl = exp - iat;
  const halfTs = iat + ttl / 2;
  const now = Date.now() / 1000;
  return now >= halfTs && now < exp;
}

async function refreshSlidingSession(
  backendApiUrl: string,
  token: string
): Promise<string | null> {
  try {
    const res = await fetch(`${backendApiUrl}/auth/refresh`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    if (!res.ok) return null;

    const data: unknown = await res.json().catch(() => null);
    const parsed = parseRefreshResponse(data);
    return parsed && parsed.refreshed && parsed.access_token
      ? parsed.access_token
      : null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const isProd = process.env.NODE_ENV === 'production';

  // ─── CSP ENDURECIDA ───
  // En producción: sin unsafe-inline para scripts (Next.js inyecta nonces).
  // En desarrollo: unsafe-inline + unsafe-eval para hot-reload/hidratación.
  const scriptSrc = isProd
    ? "script-src 'self'"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https://lh3.googleusercontent.com",
    "connect-src 'self' http://localhost:8000 http://127.0.0.1:8000 ws://localhost:3000 ws://127.0.0.1:3000",
    "upgrade-insecure-requests",
  ].join('; ');

  const withSecurityHeaders = (response: NextResponse) => {
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Content-Security-Policy', csp);
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    return response;
  };

  /**
   * Helper: Expulsar al login borrando la cookie auth_token.
   * Utilizado cuando el JWT ha expirado, es inválido, o el rol no coincide.
   */
  const expelToLogin = (reason: string) => {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('reason', reason);
    loginUrl.searchParams.set(
      'next',
      `${request.nextUrl.pathname}${request.nextUrl.search}`
    );
    const res = NextResponse.redirect(loginUrl);
    // Purgar la cookie corrompida/expirada
    res.cookies.set('auth_token', '', {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      path: '/',
      maxAge: 0,
    });
    return withSecurityHeaders(res);
  };

  const token = request.cookies.get('auth_token')?.value;
  const jwtClaims = token ? parseJwtClaims(token) : null;

  const { pathname } = request.nextUrl;
  const isLoginPage = pathname.startsWith('/login');
  const isDashboardPage = pathname.startsWith('/dashboard');
  const isPortalPage = pathname.startsWith('/portal');
  const isPagosPage = pathname.startsWith('/pagos');
  const isAdminPage = pathname.startsWith('/admin');
  const isProtectedPage = isDashboardPage || isPortalPage || isAdminPage;
  const isPaymentGateRoute = isDashboardPage || isPortalPage;

  // ─── REGLA 0: Sin credencial en zona protegida → Expulsión ───
  if (!token && isProtectedPage) {
    return expelToLogin('no_token');
  }

  // ─── REGLA 0B: Token presente pero expirado → Purgar y expulsar ───
  if (token && isProtectedPage) {
    if (!jwtClaims) {
      return expelToLogin('token_malformed');
    }
    const exp = typeof jwtClaims.exp === 'number' ? jwtClaims.exp : 0;
    if (exp > 0 && Date.now() / 1000 >= exp) {
      return expelToLogin('token_expired');
    }
  }

  // ─── REGLA 0C: Validación de rol ───
  // Admin tokens rechazados en /portal, patient tokens rechazados en /admin
  if (token && jwtClaims && isProtectedPage) {
    const role = typeof jwtClaims.role === 'string' ? jwtClaims.role : '';
    if (isAdminPage && role === 'paciente') {
      return expelToLogin('role_mismatch');
    }
    if (isPortalPage && role === 'admin') {
      // Los admins que intenten acceder al portal de pacientes → redirigir a /admin
      return withSecurityHeaders(
        NextResponse.redirect(new URL('/admin', request.url))
      );
    }
  }

  // ─── REGLA 1: Payment gate ───
  if (token && isPaymentGateRoute) {
    const status = await getAccessStatus(token);
    if (status && !status.is_admin && !status.has_paid) {
      return withSecurityHeaders(
        NextResponse.redirect(new URL('/pagos', request.url))
      );
    }
  }

  // ─── REGLA 2: Ya autenticado → no mostrar login ───
  if (token && isLoginPage) {
    const status = await getAccessStatus(token);
    const target = status?.is_admin
      ? '/admin'
      : status && !status.is_admin && !status.has_paid
        ? '/pagos'
        : '/portal';
    return withSecurityHeaders(
      NextResponse.redirect(new URL(target, request.url))
    );
  }

  // ─── REGLA 3: Sliding sessions → refresh a medio consumir ───
  if (
    token &&
    (isPortalPage || isDashboardPage || isPagosPage) &&
    isHalfConsumed(jwtClaims)
  ) {
    const backendApiUrl =
      process.env.NEXT_PUBLIC_BACKEND_API_URL ?? 'http://localhost:8000/api/v1';
    const newToken = await refreshSlidingSession(backendApiUrl, token);
    if (newToken) {
      const res = nextWithPathHeader(request);
      res.cookies.set('auth_token', newToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      });
      return withSecurityHeaders(res);
    }
  }

  // Si todo está en orden, permitir el paso
  return withSecurityHeaders(nextWithPathHeader(request));
}

// Configuración del radar: ¿Qué rutas debe vigilar este middleware?
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
