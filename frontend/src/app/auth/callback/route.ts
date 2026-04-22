/**
 * Callback OAuth / Email Verification de Supabase Auth.
 * URL: /auth/callback?code=...&type=signup|recovery|magiclink&next=/ruta-opcional
 *
 * Flujo:
 *   1. Intercambia el `code` por sesión cookies httpOnly (@supabase/ssr).
 *   2. Si es `type=signup`:
 *      - Lee `user_metadata` (given_name, family_name, dni_nie_temp, etc.) que
 *        el `signupAction` guardó en el `signUp`.
 *      - Llama RPC `paciente_autoregistro_cifrada` (idempotente) para crear la
 *        ficha clínica cifrada vinculada a `auth.uid()`.
 *      - Limpia `dni_nie_temp` del user_metadata (no se conserva PII en claro).
 *      - Dispara welcome email fire-and-forget.
 *   3. Redirige: signup → /portal (o `next`), recovery → /auth/reset.
 *
 * Si la RPC falla (ya existe ficha, etc.) NO se aborta el flujo — se loggea y
 * el usuario entra al portal normalmente. El autoregistro RPC es idempotente.
 */

import { NextResponse, type NextRequest } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import { fireEmail } from '@/lib/email/send';

export const dynamic = 'force-dynamic';

interface PacienteMetadata {
  readonly display_name?: string;
  readonly given_name?: string;
  readonly family_name?: string;
  readonly dni_nie_temp?: string;
  readonly role?: string;
  readonly needs_clinical_intake?: boolean;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const type = searchParams.get('type') ?? 'signup';
  const nextPath = safeNext(searchParams.get('next'));

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = createServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data?.user) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error?.message ?? 'auth_exchange_failed')}`
    );
  }

  if (type === 'signup') {
    await handleSignupMetadata(supabase, data.user.id, data.user.user_metadata ?? {});

    void fireEmail({
      type: 'welcome',
      toUserId: data.user.id,
      data: {},
    });
  }

  const target =
    type === 'recovery'
      ? '/auth/reset'
      : type === 'signup'
        ? nextPath ?? '/portal'
        : nextPath ?? '/portal';

  return NextResponse.redirect(`${origin}${target}`);
}

/**
 * Crea la ficha clínica cifrada con los datos que el usuario introdujo en el
 * SignupForm (persistidos en user_metadata durante la verificación de email).
 * Es idempotente — seguro frente a reintentos o al link clicado varias veces.
 */
async function handleSignupMetadata(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  rawMetadata: Record<string, unknown>
): Promise<void> {
  const meta = rawMetadata as PacienteMetadata;

  const nombreCompleto =
    meta.display_name?.trim() ||
    `${meta.given_name ?? ''} ${meta.family_name ?? ''}`.trim();
  const dniNie = meta.dni_nie_temp?.trim() ?? '';

  if (!nombreCompleto || !dniNie) {
    // Signup legacy o sin metadata — no podemos crear ficha automáticamente.
    // El paciente podrá completarla luego desde el portal.
    return;
  }

  const { error: rpcError } = await supabase.rpc('paciente_autoregistro_cifrada', {
    p_nombre_completo: nombreCompleto,
    p_dni_nie: dniNie,
    p_telefono: null,
    p_email: null, // el email ya está en auth.users, no lo duplicamos
    p_fecha_nacimiento: null,
    p_consentimiento_rgpd: true,
  });

  if (rpcError) {
    console.error('[auth/callback] paciente_autoregistro_cifrada falló', {
      user_id: userId,
      code: rpcError.code,
      message: rpcError.message,
    });
    // Idempotente: si ya existe ficha (unique_violation) o falla, seguimos igual.
    // No bloqueamos el login porque la cuenta ya está verificada.
  }

  // Borrar el DNI en claro del user_metadata — ya está cifrado en la tabla.
  const { error: updErr } = await supabase.auth.updateUser({
    data: {
      ...rawMetadata,
      dni_nie_temp: null,
      needs_clinical_intake: false,
    },
  });

  if (updErr) {
    console.error('[auth/callback] no se pudo limpiar user_metadata', {
      user_id: userId,
      message: updErr.message,
    });
  }
}

function safeNext(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith('/') || raw.startsWith('//')) return null;
  return raw;
}
