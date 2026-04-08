import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Busca la credencial de acceso. Si tu cookie se llama 'access_token', cámbialo aquí.
  const token = request.cookies.get('auth_token')?.value;

  const isLoginPage = request.nextUrl.pathname.startsWith('/login');
  const isDashboardPage = request.nextUrl.pathname.startsWith('/dashboard');

  // Regla 1: Si intenta entrar al búnker sin credencial -> Expulsión al login
  if (!token && isDashboardPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Regla 2: Si ya tiene credencial e intenta ir al login -> Redirigir al búnker
  if (token && isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Si todo está en orden, permitir el paso
  return NextResponse.next();
}

// Configuración del radar: ¿Qué rutas debe vigilar este middleware?
export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
