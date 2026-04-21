/**
 * Supabase client para Server Components, Route Handlers y Server Actions.
 * Gestiona cookies httpOnly con integración nativa `next/headers`.
 */
import { createServerClient as createServerClientBase, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { getSupabaseEnv } from './env';
import type { Database } from './types';

/**
 * Crea un cliente Supabase server-side con cookies sincronizadas.
 *
 * IMPORTANTE: En Server Components de solo lectura (page.tsx sin acciones),
 * Next.js puede fallar al llamar cookieStore.set(). Envolvemos en try/catch
 * para que sea no-op en ese contexto (Next lo refresca via middleware).
 */
export function createServerClient() {
  const { url, anonKey } = getSupabaseEnv();
  const cookieStore = cookies();

  return createServerClientBase<Database>(url, anonKey, {
    cookies: {
      get(name: string): string | undefined {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions): void {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Contexto de solo lectura (ej. Server Component que no es Action).
          // El middleware refresca la cookie en el siguiente request.
        }
      },
      remove(name: string, options: CookieOptions): void {
        try {
          cookieStore.set({ name, value: '', ...options, maxAge: 0 });
        } catch {
          // Idem.
        }
      },
    },
  });
}
