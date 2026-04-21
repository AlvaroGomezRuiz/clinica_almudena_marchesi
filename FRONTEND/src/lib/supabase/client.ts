/**
 * Supabase client para el navegador (Client Components).
 * Uso: `const supabase = createBrowserClient()`
 */
import { createBrowserClient as createBrowserClientBase } from '@supabase/ssr';

import { getSupabaseEnv } from './env';
import type { Database } from './types';

export function createBrowserClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClientBase<Database>(url, anonKey);
}
