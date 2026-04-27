'use server';

/**
 * Server Actions de autenticación — Supabase Auth.
 *
 * Reemplaza el flujo custom FastAPI anterior:
 *   * Login:       supabase.auth.signInWithPassword
 *   * Logout:      supabase.auth.signOut
 *   * MFA:         supabase.auth.mfa.challenge + .verify (TOTP RFC 6238)
 *   * Signup:      supabase.auth.signUp con verificación email
 *   * Recovery:    supabase.auth.resetPasswordForEmail
 *
 * Las cookies httpOnly las gestiona @supabase/ssr transparentemente.
 * Rol y payment-gate se validan en middleware + RLS.
 */

import { redirect } from 'next/navigation';

import { createServerClient } from '@/lib/supabase/server';
import { validateDniNie } from '@/lib/validation/dni';

interface LoginResult {
  ok: true;
  requiresMfa: boolean;
  role: 'admin' | 'paciente';
}

interface AuthError {
  ok: false;
  message: string;
}

type ActionResult<T> = T | AuthError;

// ---------------------------------------------------------------------------
// Sanitización de redirects (prevención open-redirect)
// ---------------------------------------------------------------------------
function safeNextPath(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith('/') || raw.startsWith('//')) return null;
  return raw;
}

function redirectLoginError(message: string, nextPath: string | null): never {
  const params = new URLSearchParams();
  params.set('error', message);
  if (nextPath) params.set('next', nextPath);
  redirect(`/login?${params.toString()}`);
}

function redirectMfaError(message: string, nextPath: string | null): never {
  const params = new URLSearchParams();
  params.set('error', message);
  if (nextPath) params.set('next', nextPath);
  redirect(`/login/mfa?${params.toString()}`);
}

// ---------------------------------------------------------------------------
// LOGIN — email + password (+ opcional MFA en flujo posterior)
// ---------------------------------------------------------------------------
export async function loginAction(formData: FormData): Promise<never> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const nextPath = safeNextPath(String(formData.get('redirect_to') ?? '').trim() || null);

  if (!email || !password) {
    redirectLoginError('Email y contraseña obligatorios.', nextPath);
  }

  const supabase = createServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    const msg =
      error?.message === 'Invalid login credentials'
        ? 'Credenciales inválidas.'
        : (error?.message ?? 'No se pudo iniciar sesión.');
    redirectLoginError(msg, nextPath);
  }

  // Verificar si hay factor MFA pendiente (Supabase maneja la elevación AAL2).
  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const requiresMfa = aalData?.nextLevel === 'aal2' && aalData.currentLevel === 'aal1';

  // Cargar rol desde profiles para redirect correcto.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle<{ role: 'admin' | 'paciente' }>();

  const role = profile?.role ?? 'paciente';

  if (requiresMfa) {
    const q = new URLSearchParams();
    if (nextPath) q.set('next', nextPath);
    const s = q.toString();
    redirect(s ? `/login/mfa?${s}` : '/login/mfa');
  }

  redirect(nextPath ?? (role === 'admin' ? '/admin' : '/portal'));
}

// ---------------------------------------------------------------------------
// SIGNUP — auto-registro paciente con verificación email obligatoria
// ---------------------------------------------------------------------------

export type SignupResult =
  | { readonly ok: true; readonly pendingVerification: true; readonly email: string }
  | { readonly ok: false; readonly message: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NAME_RE = /^[\p{L}\p{M}'´\-\s.]{2,80}$/u;

/**
 * La contraseña debe cumplir la política de seguridad (OWASP para datos
 * clínicos): ≥12 chars, 1 mayús, 1 minús, 1 dígito, 1 símbolo.
 */
const PW_MIN = 12;
const PW_RULES = [
  { re: /[a-z]/, msg: 'al menos 1 minúscula' },
  { re: /[A-Z]/, msg: 'al menos 1 mayúscula' },
  { re: /[0-9]/, msg: 'al menos 1 número' },
  { re: /[!-/:-@[-`{-~]/, msg: 'al menos 1 símbolo' },
] as const;

function validatePasswordStrength(pw: string): string | null {
  if (pw.length < PW_MIN) return `La contraseña debe tener al menos ${PW_MIN} caracteres.`;
  for (const rule of PW_RULES) {
    if (!rule.re.test(pw)) return `La contraseña debe contener ${rule.msg}.`;
  }
  return null;
}

/**
 * Traduce mensajes de error comunes de Supabase Auth al español.
 * Los mensajes originales son en inglés; aquí mapeamos los más frecuentes
 * para que el usuario vea algo comprensible.
 */
function translateSupabaseError(msg: string): string {
  const translations: Array<[RegExp, string]> = [
    [
      /error sending confirmation email/i,
      'No se ha podido enviar el correo de confirmación. Revisa que el email sea correcto e inténtalo de nuevo en unos minutos.',
    ],
    [
      /rate limit|too many requests|email rate limit/i,
      'Has superado el límite de intentos. Espera unos minutos antes de volver a intentarlo.',
    ],
    [
      /email not confirmed/i,
      'Tu email aún no está confirmado. Revisa tu bandeja de entrada (o spam).',
    ],
    [
      /invalid email/i,
      'El email introducido no es válido.',
    ],
    [
      /password.*too short|password.*too weak/i,
      'La contraseña es demasiado débil. Debe tener al menos 12 caracteres con mayúsculas, minúsculas, números y símbolos.',
    ],
    [
      /signup.*disabled/i,
      'El registro de nuevos usuarios está temporalmente deshabilitado. Contacta con la clínica.',
    ],
  ];

  for (const [pattern, translation] of translations) {
    if (pattern.test(msg)) return translation;
  }

  // Fallback genérico si no reconocemos el mensaje.
  return `Error al crear la cuenta: ${msg}`;
}

export async function signupAction(formData: FormData): Promise<SignupResult> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const passwordConfirm = String(formData.get('password_confirm') ?? '');
  const givenName = String(formData.get('given_name') ?? '').trim();
  const familyName = String(formData.get('family_name') ?? '').trim();
  // `dni_nie` viene ya normalizado por el cliente; aceptamos `dni_nie_raw` como fallback.
  const dniRaw =
    String(formData.get('dni_nie') ?? '').trim() ||
    String(formData.get('dni_nie_raw') ?? '').trim();
  const rgpd = formData.get('rgpd') === 'on';
  const honeypot = String(formData.get('company') ?? '').trim();

  if (honeypot) return { ok: false, message: 'Solicitud no válida.' };

  if (!EMAIL_RE.test(email)) {
    return { ok: false, message: 'Introduce un email válido.' };
  }
  if (!NAME_RE.test(givenName) || givenName.length < 2 || givenName.length > 60) {
    return { ok: false, message: 'Nombre entre 2 y 60 caracteres, sin símbolos extraños.' };
  }
  if (!NAME_RE.test(familyName) || familyName.length < 2 || familyName.length > 80) {
    return { ok: false, message: 'Apellidos entre 2 y 80 caracteres, sin símbolos extraños.' };
  }

  const dniCheck = validateDniNie(dniRaw);
  if (!dniCheck.ok || !dniCheck.normalized) {
    return { ok: false, message: dniCheck.error ?? 'DNI/NIE no válido.' };
  }

  const pwError = validatePasswordStrength(password);
  if (pwError) return { ok: false, message: pwError };
  if (password !== passwordConfirm) {
    return { ok: false, message: 'Las contraseñas no coinciden.' };
  }
  if (!rgpd) {
    return { ok: false, message: 'Debes aceptar la política de privacidad.' };
  }

  const telefono = String(formData.get('telefono') ?? '').trim().replace(/\s+/g, ' ');
  const direccion = String(formData.get('direccion') ?? '').trim();
  const contactoEmergenciaNombre = String(formData.get('contacto_emergencia_nombre') ?? '').trim();
  const contactoEmergenciaTelefono = String(formData.get('contacto_emergencia_telefono') ?? '')
    .trim()
    .replace(/\s+/g, '');
  const fechaNacimiento = String(formData.get('fecha_nacimiento') ?? '').trim();
  const motivoConsultaBreve = String(formData.get('motivo_consulta_breve') ?? '').trim().slice(0, 2000);
  const experienciaTerapia = String(formData.get('experiencia_terapia') ?? '').trim();
  const medicacionPsiquiatria = String(formData.get('medicacion_psiquiatria') ?? '').trim().slice(0, 1500);

  const PHONE_RE = /^[+]?[\d\s]{9,18}$/;
  if (!PHONE_RE.test(telefono)) {
    return { ok: false, message: 'Introduce un teléfono de contacto válido (9 dígitos o más).' };
  }
  if (direccion.length < 8) {
    return { ok: false, message: 'Introduce una dirección completa (calle, número, localidad).' };
  }
  if (contactoEmergenciaNombre.length < 2) {
    return { ok: false, message: 'Indica el nombre de una persona de contacto de emergencia.' };
  }
  if (!PHONE_RE.test(contactoEmergenciaTelefono)) {
    return { ok: false, message: 'El teléfono de emergencia no es válido.' };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaNacimiento)) {
    return { ok: false, message: 'La fecha de nacimiento debe tener formato AAAA-MM-DD.' };
  }
  const expSet = new Set(['never', 'long_ago', 'from_clinic']);
  if (!expSet.has(experienciaTerapia)) {
    return { ok: false, message: 'Selecciona tu experiencia previa en terapia.' };
  }

  const displayName = `${givenName} ${familyName}`.slice(0, 140);

  const supabase = createServerClient();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${appUrl}/auth/callback?type=signup`,
      data: {
        display_name: displayName,
        given_name: givenName,
        family_name: familyName,
        // El DNI se elimina del user_metadata en /auth/callback tras crear la ficha
        // cifrada. No se almacena en texto plano más allá de la ventana de
        // verificación del email (≤ 24 h).
        dni_nie_temp: dniCheck.normalized,
        role: 'paciente',
        rgpd_accepted_at: new Date().toISOString(),
        needs_clinical_intake: true,
        telefono_temp: telefono,
        direccion_temp: direccion,
        contacto_emergencia_nombre_temp: contactoEmergenciaNombre,
        contacto_emergencia_telefono_temp: contactoEmergenciaTelefono,
        fecha_nacimiento_temp: fechaNacimiento,
        motivo_consulta_temp: motivoConsultaBreve || null,
        experiencia_terapia_temp: experienciaTerapia,
        medicacion_psiquiatria_temp: medicacionPsiquiatria || null,
      },
    },
  });

  if (error) {
    // Evitamos leak de "email ya existe" (enumeration): respondemos como si fuera OK
    // y dejamos que el usuario intente verificar o use "olvidé mi contraseña".
    const sensitive =
      /already registered|user already exists|email.*already/i.test(error.message);
    if (sensitive) {
      return {
        ok: true,
        pendingVerification: true,
        email,
      };
    }
    return { ok: false, message: translateSupabaseError(error.message) };
  }

  return { ok: true, pendingVerification: true, email };
}

// ---------------------------------------------------------------------------
// LOGOUT
// ---------------------------------------------------------------------------
export async function logoutAction(): Promise<never> {
  const supabase = createServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}

// ---------------------------------------------------------------------------
// MFA — completar inicio de sesión (TOTP) y redirigir al destino
// ---------------------------------------------------------------------------
export async function completeMfaLoginAction(formData: FormData): Promise<never> {
  const code = String(formData.get('code') ?? '').trim().replace(/\s+/g, '');
  const nextPath = safeNextPath(String(formData.get('next') ?? '').trim() || null);

  if (!/^\d{6}$/.test(code)) {
    redirectMfaError('Código inválido (6 dígitos).', nextPath);
  }

  const supabase = createServerClient();

  const { data: factorsData, error: factorsErr } = await supabase.auth.mfa.listFactors();
  if (factorsErr) {
    redirectMfaError(factorsErr.message, nextPath);
  }

  const totp = factorsData.totp.find((f) => f.status === 'verified');
  if (!totp) {
    redirectMfaError('No hay autenticación en dos pasos activa. Vuelve a iniciar sesión.', nextPath);
  }

  const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({
    factorId: totp.id,
  });
  if (chErr || !challenge) {
    redirectMfaError(
      chErr?.message ?? 'Error al verificar. Inténtalo otra vez.',
      nextPath
    );
  }

  const { error: verifyErr } = await supabase.auth.mfa.verify({
    factorId: totp.id,
    challengeId: challenge.id,
    code,
  });
  if (verifyErr) {
    redirectMfaError('Código incorrecto. Revisa la app de autenticación.', nextPath);
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    redirectMfaError('Sesión no válida. Vuelve a iniciar sesión.', null);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle<{ role: 'admin' | 'paciente' }>();

  const role = profile?.role ?? 'paciente';
  const target = nextPath ?? (role === 'admin' ? '/admin' : '/portal');
  redirect(target);
}

// ---------------------------------------------------------------------------
// MFA — reto (para uso no redirect; tests / futuras ampliaciones)
// ---------------------------------------------------------------------------
export async function verifyMfaAction(formData: FormData): Promise<ActionResult<LoginResult>> {
  const code = String(formData.get('code') ?? '').trim().replace(/\s+/g, '');

  if (!/^\d{6}$/.test(code)) {
    return { ok: false, message: 'Código inválido (6 dígitos).' };
  }

  const supabase = createServerClient();

  const { data: factorsData, error: factorsErr } = await supabase.auth.mfa.listFactors();
  if (factorsErr) return { ok: false, message: factorsErr.message };

  const totp = factorsData.totp.find((f) => f.status === 'verified');
  if (!totp) return { ok: false, message: 'No hay factor TOTP registrado.' };

  const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({
    factorId: totp.id,
  });
  if (chErr || !challenge) {
    return { ok: false, message: chErr?.message ?? 'Fallo al crear reto MFA.' };
  }

  const { error: verifyErr } = await supabase.auth.mfa.verify({
    factorId: totp.id,
    challengeId: challenge.id,
    code,
  });

  if (verifyErr) {
    return { ok: false, message: 'Código incorrecto.' };
  }

  const { data: u2 } = await supabase.auth.getUser();
  if (!u2.user) return { ok: false, message: 'Sesión no válida.' };

  const { data: prof } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', u2.user.id)
    .maybeSingle<{ role: 'admin' | 'paciente' }>();

  const role = prof?.role ?? 'paciente';
  return { ok: true, requiresMfa: false, role };
}

// ---------------------------------------------------------------------------
// MFA ENROLL — iniciar enrolamiento TOTP (devuelve QR provisioning URI)
// ---------------------------------------------------------------------------
interface EnrollMfaResult {
  ok: true;
  factorId: string;
  provisioningUri: string; // otpauth://... — sirve para QR
  secret: string;
}

export async function enrollMfaAction(): Promise<ActionResult<EnrollMfaResult>> {
  const supabase = createServerClient();
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: `Clinica-Almudena-${new Date().toISOString().slice(0, 10)}`,
  });

  if (error || !data) {
    return { ok: false, message: error?.message ?? 'No se pudo iniciar enrolamiento MFA.' };
  }

  return {
    ok: true,
    factorId: data.id,
    provisioningUri: data.totp.uri,
    secret: data.totp.secret,
  };
}

export async function confirmMfaEnrollmentAction(
  formData: FormData
): Promise<ActionResult<{ ok: true }>> {
  const factorId = String(formData.get('factor_id') ?? '').trim();
  const code = String(formData.get('code') ?? '').trim().replace(/\s+/g, '');

  if (!factorId || !/^\d{6}$/.test(code)) {
    return { ok: false, message: 'Código o factor inválido.' };
  }

  const supabase = createServerClient();
  const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
  if (chErr || !challenge) {
    return { ok: false, message: chErr?.message ?? 'No se pudo crear reto.' };
  }

  const { error: verifyErr } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });
  if (verifyErr) {
    return { ok: false, message: 'Código incorrecto. Escanea de nuevo el QR e intenta otra vez.' };
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// RECOVERY — enviar email de reset password
// ---------------------------------------------------------------------------
export async function requestPasswordResetAction(
  formData: FormData
): Promise<ActionResult<{ ok: true }>> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (!email) return { ok: false, message: 'Email obligatorio.' };

  const supabase = createServerClient();
  // IMPORTANTE: apuntamos al /auth/callback (no a /auth/reset directamente).
  // El callback hace `exchangeCodeForSession(code)` — indispensable para crear
  // la cookie de sesión temporal de recuperación — y solo entonces redirige a
  // /auth/reset. Si apuntáramos directamente a /auth/reset, el page verifica
  // `auth.getUser()` y, al no existir sesión, rebotaría al forgot-password.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/auth/callback?type=recovery`,
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// UPDATE PASSWORD (tras click en email de reset)
// ---------------------------------------------------------------------------
export async function updatePasswordAction(
  formData: FormData
): Promise<ActionResult<{ ok: true }>> {
  const password = String(formData.get('password') ?? '');
  if (password.length < 12) {
    return { ok: false, message: 'La contraseña debe tener al menos 12 caracteres.' };
  }

  const supabase = createServerClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}
