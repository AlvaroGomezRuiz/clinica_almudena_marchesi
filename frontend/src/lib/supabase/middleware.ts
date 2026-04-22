/**
 * Supabase helper para Next.js middleware.
 *
 * Refresca tokens expirados y propaga cookies httpOnly al request y response.
 * Además, inyecta en los *request headers* (no en los response headers que
 * viajarían al cliente) la identidad del usuario ya verificada para que los
 * layouts RSC puedan leerla vía `next/headers` sin re-ejecutar `auth.getUser()`
 * ni la query a `profiles`. Esto ahorra 2 round-trips a Supabase por cada
 * navegación autenticada.
 *
 * Seguridad: los headers `x-ss-*` se **borran** del request entrante antes
 * de inyectarlos, de modo que un atacante no puede forjarlos desde el
 * navegador. Solo el middleware puede setearlos.
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

/* Prefijo claro para headers internos — nunca deben llegar al cliente. */
const H_USER_ID = 'x-ss-user-id';
const H_USER_EMAIL = 'x-ss-user-email';
const H_USER_ROLE = 'x-ss-user-role';
const H_USER_NAME = 'x-ss-user-name';
const H_USER_AVATAR = 'x-ss-user-avatar';

const SSH_HEADERS = [H_USER_ID, H_USER_EMAIL, H_USER_ROLE, H_USER_NAME, H_USER_AVATAR];

/**
 * Endurece las opciones de cookie impuestas por Supabase-SSR.
 * - `httpOnly`: imprescindible → previene robo via XSS.
 * - `secure`: solo HTTPS en producción.
 * - `sameSite: 'lax'`: bloquea envío de cookie en POST cross-site (CSRF barrera),
 *   pero permite navegación top-level (magic-links, redirects OAuth). Si algún día
 *   se añade OAuth externo con cookie-based callback, `strict` rompería el flujo.
 * - `path: '/'` → la cookie de sesión cubre toda la app.
 */
function hardenCookieOptions(options: CookieOptions): CookieOptions {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    ...options,
    httpOnly: true,
    secure: isProd,
    sameSite: options.sameSite ?? 'lax',
    path: options.path ?? '/',
  };
}

export async function updateSupabaseSession(
  request: NextRequest
): Promise<SupabaseSessionResult> {
  /* Headers mutables del request. Purgamos los x-ss-* que pudiera haber
     enviado un atacante para evitar spoofing de identidad server-side. */
  const requestHeaders = new Headers(request.headers);
  for (const h of SSH_HEADERS) requestHeaders.delete(h);

  let response = NextResponse.next({ request: { headers: requestHeaders } });
  const { url, anonKey } = getSupabaseEnv();

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      get(name: string): string | undefined {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions): void {
        const hardened = hardenCookieOptions(options);
        request.cookies.set({ name, value, ...hardened });
        response = NextResponse.next({ request: { headers: requestHeaders } });
        response.cookies.set({ name, value, ...hardened });
      },
      remove(name: string, options: CookieOptions): void {
        const hardened = hardenCookieOptions(options);
        request.cookies.set({ name, value: '', ...hardened });
        response = NextResponse.next({ request: { headers: requestHeaders } });
        response.cookies.set({ name, value: '', ...hardened, maxAge: 0 });
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

  /* Inyectamos la identidad verificada en los request headers internos para
     que los layouts del App Router la consuman sin re-ejecutar queries.
     Tras mutar, recreamos la response para que Next propague los headers. */
  if (profile) {
    requestHeaders.set(H_USER_ID, user.id);
    requestHeaders.set(H_USER_EMAIL, user.email);
    requestHeaders.set(H_USER_ROLE, profile.role);
    if (profile.display_name) requestHeaders.set(H_USER_NAME, profile.display_name);
    if (profile.avatar_url) requestHeaders.set(H_USER_AVATAR, profile.avatar_url);

    const nextResponse = NextResponse.next({ request: { headers: requestHeaders } });
    /* Preservamos cookies que Supabase setteó durante el refresh. */
    for (const cookie of response.cookies.getAll()) {
      nextResponse.cookies.set(cookie);
    }
    response = nextResponse;
  }

  return {
    response,
    user: {
      id: user.id,
      email: user.email,
      profile,
    },
  };
}

/* Keys exportadas para que los layouts lean los headers internos. */
export const SSH_KEYS = {
  id: H_USER_ID,
  email: H_USER_EMAIL,
  role: H_USER_ROLE,
  name: H_USER_NAME,
  avatar: H_USER_AVATAR,
} as const;
