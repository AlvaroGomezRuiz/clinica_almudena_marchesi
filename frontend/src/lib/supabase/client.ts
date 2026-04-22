/**
 * Supabase client para el navegador (Client Components).
 *
 * Singleton por tab: todas las llamadas a `createBrowserClient()` devuelven
 * la misma instancia. Esto evita abrir múltiples websockets Realtime y
 * duplicar el estado de auth cuando varios client components lo usan.
 */
import { createBrowserClient as createBrowserClientBase } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseEnv } from './env';
import type { Database } from './types';

type TypedClient = SupabaseClient<Database>;

/* Instancia cacheada a nivel de módulo. En el servidor nunca se instancia
   (este archivo no se importa en código server). En cliente, cada pestaña
   mantiene exactamente una instancia durante toda su vida. */
let browserClient: TypedClient | null = null;

export function createBrowserClient(): TypedClient {
  if (browserClient) return browserClient;

  const { url, anonKey } = getSupabaseEnv();
  browserClient = createBrowserClientBase<Database>(url, anonKey);
  return browserClient;
}
