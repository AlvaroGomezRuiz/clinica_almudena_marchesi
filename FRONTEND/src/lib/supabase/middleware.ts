/**
 * Supabase helper para Next.js middleware.
 *
 * Refresca tokens expirados y propaga cookies httpOnly al request y response.
 * Uso: `const { response, user } = await updateSupabaseSession(request)`.
 */
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { getSupabaseEnv } from './env';
import type { Database, Profile } from './types';

export interface SupabaseSessionResult {
  readonly response: NextResponse;
  readonly user: {
    id: string;
    email: string;
    profile: Pick<Profile, 'role' | 'display_name' | 'avatar_url'> | null;
  } | null;
}

export async function updateSupabaseSession(
  request: NextRequest
): Promise<SupabaseSessionResult> {
  let response = NextResponse.next({ request });
  const { url, anonKey } = getSupabaseEnv();

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      get(name: string): string | undefined {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions): void {
        request.cookies.set({ name, value, ...options });
        response = NextResponse.next({ request });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions): void {
        request.cookies.set({ name, value: '', ...options });
        response = NextResponse.next({ request });
        response.cookies.set({ name, value: '', ...options, maxAge: 0 });
      },
    },
  });

  // getUser() valida el JWT contra Supabase (no solo lo parsea como getSession).
  // Esto es crítico para no confiar en un token forjado client-side.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return { response, user: null };
  }

  // Cargar perfil con rol (una sola query extra gracias a la RLS profiles_self_select).
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, display_name, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  return {
    response,
    user: {
      id: user.id,
      email: user.email,
      profile,
    },
  };
}
