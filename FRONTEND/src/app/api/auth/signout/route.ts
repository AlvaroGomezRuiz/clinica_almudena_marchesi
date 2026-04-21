import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';

/**
 * Cierre de sesión seguro.
 *   - Acepta POST (CSRF-safe vía same-origin).
 *   - Invalida refresh token en GoTrue y limpia cookies.
 *   - Redirige al login con flag informativo.
 */
export async function POST(request: Request): Promise<Response> {
  const supabase = createServerClient();
  await supabase.auth.signOut();

  const url = new URL('/login?reason=signed_out', request.url);
  return NextResponse.redirect(url, { status: 303 });
}
