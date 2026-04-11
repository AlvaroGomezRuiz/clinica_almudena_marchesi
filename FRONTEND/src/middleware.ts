import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

type AccessStatus = {
  has_paid: boolean;
  is_admin: boolean;
};

async function getAccessStatus(token: string): Promise<AccessStatus | null> {
  const backendApiUrl =
    process.env.BACKEND_API_URL ?? 'http://localhost:8000/api/v1';

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
    return {
      has_paid: Boolean((data as any)?.has_paid),
      is_admin: Boolean((data as any)?.is_admin),
    };
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

export async function middleware(request: NextRequest) {
  const isProd = process.env.NODE_ENV === 'production';

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "script-src 'self' 'unsafe-inline'" + (isProd ? '' : " 'unsafe-eval'"),
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https://lh3.googleusercontent.com",
    "connect-src 'self' http://localhost:8000 http://127.0.0.1:8000 ws://localhost:3000 ws://127.0.0.1:3000",
  ].join('; ');

  const withSecurityHeaders = (response: NextResponse) => {
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Content-Security-Policy', csp);
    return response;
  };

  // Busca la credencial de acceso. Si tu cookie se llama 'access_token', cámbialo aquí.
  const token = request.cookies.get('auth_token')?.value;

  const isLoginPage = request.nextUrl.pathname.startsWith('/login');
  const isDashboardPage = request.nextUrl.pathname.startsWith('/dashboard');
  const isPortalPage = request.nextUrl.pathname.startsWith('/portal');
  const isAdminPage = request.nextUrl.pathname.startsWith('/admin');
  const isProtectedPage = isDashboardPage || isPortalPage || isAdminPage;

  const isPaymentGateRoute = isDashboardPage || isPortalPage;

  // Regla 1: Si intenta entrar al búnker sin credencial -> Expulsión al login
  if (!token && isProtectedPage) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set(
      'next',
      `${request.nextUrl.pathname}${request.nextUrl.search}`
    );
    return withSecurityHeaders(NextResponse.redirect(loginUrl));
  }

  // Regla 1B: Si está autenticado pero no ha pagado -> redirigir a /pagos
  if (token && isPaymentGateRoute) {
    const status = await getAccessStatus(token);
    if (status && !status.is_admin && !status.has_paid) {
      return withSecurityHeaders(
        NextResponse.redirect(new URL('/pagos', request.url))
      );
    }
  }

  // Regla 2: Si ya tiene credencial e intenta ir al login -> Redirigir al búnker
  if (token && isLoginPage) {
    const status = await getAccessStatus(token);
    const target =
      status && !status.is_admin && !status.has_paid ? '/pagos' : '/dashboard';
    return withSecurityHeaders(
      NextResponse.redirect(new URL(target, request.url))
    );
  }

  // Si todo está en orden, permitir el paso
  return withSecurityHeaders(nextWithPathHeader(request));
}

// Configuración del radar: ¿Qué rutas debe vigilar este middleware?
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
