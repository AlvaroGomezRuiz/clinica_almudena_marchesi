/**
 * Validación fail-fast de variables de entorno Supabase.
 * Si faltan, la app no arranca — mejor fallar en build que silenciosamente en runtime.
 */

interface SupabaseEnv {
  readonly url: string;
  readonly anonKey: string;
}

function assertDefined(name: string, value: string | undefined): string {
  if (!value || value.trim().length === 0) {
    throw new Error(
      `[supabase/env] Variable requerida "${name}" no está definida. ` +
        `Revisa FRONTEND/.env.local (ver .env.example).`
    );
  }
  return value;
}

export function getSupabaseEnv(): SupabaseEnv {
  return {
    url: assertDefined('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
    anonKey: assertDefined(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ),
  };
}
