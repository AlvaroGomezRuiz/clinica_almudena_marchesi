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

import { captureClinicalError } from '@/lib/sentry';
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
  readonly telefono_temp?: string;
  readonly direccion_temp?: string;
  readonly contacto_emergencia_nombre_temp?: string;
  readonly contacto_emergencia_telefono_temp?: string;
  readonly fecha_nacimiento_temp?: string;
  readonly motivo_consulta_temp?: string | null;
  readonly experiencia_terapia_temp?: string;
  readonly medicacion_psiquiatria_temp?: string | null;
}

function experienciaTerapiaLabel(code: string | undefined): string | null {
  switch (code) {
    case 'never':
      return 'Nunca he ido a terapia';
    case 'long_ago':
      return 'Hace más de un año sin terapia continua';
    case 'from_clinic':
      return 'Vengo de otra clínica';
    default:
      return null;
  }
}

/**
 * Traduce errores comunes del intercambio de código a mensajes
 * amigables en español. Evita que el usuario vea textos internos
 * en inglés como el de PKCE.
 */
function translateCallbackError(msg: string): string {
  if (/pkce.*verifier|code.verifier/i.test(msg)) {
    return 'El enlace ha expirado o ya fue utilizado. Vuelve a registrarte o solicita un nuevo enlace de verificación.';
  }
  if (/expired|invalid.*code|otp.*expired/i.test(msg)) {
    return 'El enlace ha caducado o ya fue utilizado. Solicita uno nuevo desde "¿Olvidaste tu contraseña?" o vuelve a registrarte.';
  }
  if (/already.*used|reuse/i.test(msg)) {
    return 'Este enlace ya fue utilizado. Si ya verificaste tu cuenta, inicia sesión directamente.';
  }
  return `Error al verificar tu cuenta: ${msg}`;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = (searchParams.get('type') ?? 'signup') as
    | 'signup'
    | 'recovery'
    | 'magiclink'
    | 'email'
    | 'email_change';
  const nextPath = safeNext(searchParams.get('next'));

  const supabase = createServerClient();
  let user: { id: string; user_metadata: Record<string, unknown>; email?: string } | null = null;

  if (tokenHash) {
    // ── Flujo OTP / token_hash (cross-device, sin restricción de navegador) ──
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error || !data?.user) {
      const friendlyMsg = translateCallbackError(error?.message ?? 'otp_verify_failed');
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(friendlyMsg)}`);
    }
    user = {
      id: data.user.id,
      user_metadata: data.user.user_metadata ?? {},
      email: data.user.email,
    };
  } else if (code) {
    // ── Flujo PKCE / code (mismo navegador) ──
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data?.user) {
      const friendlyMsg = translateCallbackError(error?.message ?? 'auth_exchange_failed');
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(friendlyMsg)}`);
    }
    user = {
      id: data.user.id,
      user_metadata: data.user.user_metadata ?? {},
      email: data.user.email,
    };
  } else {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent('Enlace de verificación inválido. Solicita uno nuevo.')}`
    );
  }

  if (type === 'signup' || type === 'email') {
    await handleSignupMetadata(supabase, user.id, user.user_metadata, user.email ?? '');

    void fireEmail({
      type: 'welcome',
      toUserId: user.id,
      data: {},
    });
  }

  const target =
    type === 'recovery'
      ? '/auth/reset'
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
  rawMetadata: Record<string, unknown>,
  userEmail: string
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

  const fnac = meta.fecha_nacimiento_temp?.trim();
  const fnacSql = fnac && /^\d{4}-\d{2}-\d{2}$/.test(fnac) ? fnac : null;

  const { error: rpcError } = await supabase.rpc('paciente_autoregistro_cifrada', {
    p_nombre_completo: nombreCompleto,
    p_dni_nie: dniNie,
    p_telefono: meta.telefono_temp?.trim() ?? null,
    p_email: userEmail.trim() || null,
    p_fecha_nacimiento: fnacSql,
    p_direccion: meta.direccion_temp?.trim() ?? null,
    p_contacto_emergencia_nombre: meta.contacto_emergencia_nombre_temp?.trim() ?? null,
    p_contacto_emergencia_telefono: meta.contacto_emergencia_telefono_temp?.trim() ?? null,
    p_alergias: null,
    p_medicacion_base: meta.medicacion_psiquiatria_temp?.trim() || null,
    p_objetivos: null,
    p_motivo_consulta_inicial: meta.motivo_consulta_temp?.trim() || null,
    p_experiencia_terapia:
      experienciaTerapiaLabel(meta.experiencia_terapia_temp) ?? 'Sin especificar',
    p_consentimiento_rgpd: true,
  });

  // ¿La RPC realmente falló (no es un duplicado idempotente)?
  const isRealError =
    rpcError &&
    !/unique_violation|23505|already exists/i.test(
      `${rpcError.code ?? ''} ${rpcError.message ?? ''}`
    );

  if (rpcError) {
    captureClinicalError(
      new Error(`paciente_autoregistro_cifrada: ${rpcError.code ?? 'unknown'}`),
      { area: 'auth', patient_id: userId, operation: 'autoregistro' },
    );
  }

  // Solo borramos los PII temporales si la ficha se creó (o ya existía).
  // Si hubo un error real, conservamos los datos para que el próximo
  // acceso al callback pueda reintentarlo.
  if (!isRealError) {
    const { error: updErr } = await supabase.auth.updateUser({
      data: {
        ...rawMetadata,
        dni_nie_temp: null,
        telefono_temp: null,
        direccion_temp: null,
        contacto_emergencia_nombre_temp: null,
        contacto_emergencia_telefono_temp: null,
        fecha_nacimiento_temp: null,
        motivo_consulta_temp: null,
        experiencia_terapia_temp: null,
        medicacion_psiquiatria_temp: null,
        needs_clinical_intake: false,
      },
    });

    if (updErr) {
      captureClinicalError(
        new Error(`limpiar user_metadata: ${updErr.code ?? 'unknown'}`),
        { area: 'auth', patient_id: userId, operation: 'cleanup_metadata' },
      );
    }
  }
}

function safeNext(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith('/') || raw.startsWith('//')) return null;
  return raw;
}
