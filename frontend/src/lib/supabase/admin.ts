/**
 * Cliente Supabase admin (service_role) para operaciones server-side
 * que necesitan bypassear RLS (ej: storage uploads desde API routes).
 *
 * ⚠️  NUNCA importar en código client-side.
 * ⚠️  NUNCA exponer la service_role key al navegador.
 *
 * Devuelve null si SUPABASE_SERVICE_ROLE_KEY no está configurada (dev local).
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

let _admin: ReturnType<typeof createClient<Database>> | null = null;
let _checked = false;

export function createAdminClient(): ReturnType<typeof createClient<Database>> | null {
  if (_checked) return _admin;
  _checked = true;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.warn(
      '[supabase/admin] SUPABASE_SERVICE_ROLE_KEY no definida — ' +
        'storage uploads usarán el client con anon key (sujeto a RLS).'
    );
    return null;
  }

  _admin = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return _admin;
}

