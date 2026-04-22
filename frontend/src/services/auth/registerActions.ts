'use server';

/**
 * Server Actions de registro público de paciente — Supabase Auth.
 *
 * Reemplaza el flujo FastAPI previo (deprecado con la migración total a
 * Supabase). El flujo de UX se mantiene en 2 pasos:
 *
 *  1. `startRegistrationAction` (/registro-paciente)
 *     - Valida el formulario completo (datos clínicos).
 *     - Guarda los datos sensibles en cookies httpOnly `draft_*` (15 min TTL).
 *     - Llama `supabase.auth.signInWithOtp({ shouldCreateUser: true })` para
 *       enviar código OTP al email. NO pide contraseña aún.
 *     - Redirige a /registro-paciente/verificar.
 *
 *  2. `verifyOtpAction` (/registro-paciente/verificar)
 *     - Verifica el OTP con `supabase.auth.verifyOtp({ type: 'email' })` →
 *       crea la sesión.
 *     - Establece la contraseña con `supabase.auth.updateUser({ password })`.
 *     - Llama RPC `paciente_autoregistro_cifrada` con los datos de cookies
 *       draft → crea la ficha clínica cifrada vinculada a auth.uid().
 *     - Limpia cookies draft y redirige a /portal (o /portal/citas/reservar
 *       si venía con plan).
 *
 * Requisito de configuración (una sola vez en Supabase Dashboard):
 *   * Authentication → Email Templates → "Magic Link": usar `{{ .Token }}`
 *     en lugar de `{{ .ConfirmationURL }}` para enviar código de 6 dígitos.
 */

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { createServerClient } from '@/lib/supabase/server';

// ---------------------------------------------------------------------------
// Helpers de cookies draft — 15 min, httpOnly, sameSite=strict
// ---------------------------------------------------------------------------
const DRAFT_TTL_SECONDS = 15 * 60;

function setDraft(name: string, value: string, maxLen = 500): void {
  cookies().set(name, value.slice(0, maxLen), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: DRAFT_TTL_SECONDS,
  });
}

function getDraft(name: string): string {
  return cookies().get(name)?.value ?? '';
}

function clearDrafts(): void {
  const names = [
    'draft_email',
    'draft_plan',
    'draft_paciente_nombre',
    'draft_paciente_dni',
    'draft_paciente_telefono',
    'draft_paciente_motivo',
    'draft_paciente_experiencia',
    'draft_paciente_fn',
    'draft_paciente_medicacion',
    'draft_paciente_alergias',
  ];
  for (const n of names) cookies().delete(n);
}

// ---------------------------------------------------------------------------
// Redirección con error legible
// ---------------------------------------------------------------------------
function redirectRegistroError(message: string, plan: string): never {
  const params = new URLSearchParams();
  if (plan) params.set('plan', plan);
  params.set('error', message);
  redirect(`/registro-paciente?${params.toString()}`);
}

function redirectOtpError(message: string, plan: string): never {
  const params = new URLSearchParams();
  if (plan) params.set('plan', plan);
  params.set('error', message);
  redirect(`/registro-paciente/verificar?${params.toString()}`);
}

// ---------------------------------------------------------------------------
// PASO 1 — startRegistrationAction
// ---------------------------------------------------------------------------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DNI_RE = /^[0-9A-Za-z]{6,16}$/;
const PHONE_RE = /^[+()0-9\s-]{6,20}$/;
const EXPERIENCE_VALUES = new Set(['primera_vez', 'hace_tiempo', 'recientemente']);

function parseFechaNacimiento(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  const cleaned = v.replace(/\s+/g, '');

  // YYYY-MM-DD (input type=date)
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;

  // DD/MM/YYYY o DD-MM-YYYY
  const m = cleaned.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if (!m) return null;
  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const yyyy = Number(m[3]);
  if (dd < 1 || dd > 31 || mm < 1 || mm > 12 || yyyy < 1900) return null;
  return `${String(yyyy).padStart(4, '0')}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

export async function startRegistrationAction(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const nombreCompleto = String(formData.get('nombre_completo') ?? '').trim();
  const dniNie = String(formData.get('dni_nie') ?? '').trim();
  const telefonoRaw = String(formData.get('telefono') ?? '').trim();
  const experienciaTerapiaRaw = String(formData.get('experiencia_terapia') ?? '').trim();
  const motivoConsulta = String(formData.get('motivo_consulta_inicial') ?? '').trim();
  const fechaNacimientoRaw = String(formData.get('fecha_nacimiento') ?? '').trim();
  const medicacion = String(formData.get('medicacion_base') ?? '').trim();
  const alergias = String(formData.get('alergias') ?? '').trim();
  const consentimientoRgpd = formData.get('consentimiento_rgpd') === 'on';
  const planRaw = String(formData.get('plan') ?? '').trim();
  const plan = /^[a-zA-Z0-9_-]{1,64}$/.test(planRaw) ? planRaw : '';

  // Validaciones mínimas
  if (!EMAIL_RE.test(email)) redirectRegistroError('Introduce un email válido.', plan);
  if (nombreCompleto.length < 2 || nombreCompleto.length > 100) {
    redirectRegistroError('Nombre completo obligatorio (2–100 caracteres).', plan);
  }
  if (!DNI_RE.test(dniNie)) redirectRegistroError('DNI/NIE no válido.', plan);
  if (telefonoRaw && !PHONE_RE.test(telefonoRaw)) {
    redirectRegistroError('Teléfono no válido.', plan);
  }
  if (!consentimientoRgpd) {
    redirectRegistroError('Debes aceptar la política de privacidad.', plan);
  }

  // Enviar OTP por email (crea usuario si no existe)
  const supabase = createServerClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${appUrl}/auth/callback?type=signup`,
      data: {
        display_name: nombreCompleto.slice(0, 80),
        role: 'paciente',
        needs_clinical_intake: true,
      },
    },
  });

  if (error) {
    // Evitamos leak "email ya existe" → mensaje genérico + seguir flujo
    const sensitive = /already registered|user.*exists|email.*already/i.test(error.message);
    if (!sensitive) {
      redirectRegistroError(error.message, plan);
    }
  }

  // Persistir datos clínicos en cookies draft (httpOnly, 15 min)
  setDraft('draft_email', email);
  setDraft('draft_paciente_nombre', nombreCompleto, 100);
  setDraft('draft_paciente_dni', dniNie, 32);

  if (telefonoRaw) {
    setDraft('draft_paciente_telefono', telefonoRaw.replace(/\s+/g, ''), 20);
  }
  if (motivoConsulta) setDraft('draft_paciente_motivo', motivoConsulta, 2000);
  if (fechaNacimientoRaw) setDraft('draft_paciente_fn', fechaNacimientoRaw, 32);
  if (medicacion) setDraft('draft_paciente_medicacion', medicacion, 1000);
  if (alergias) setDraft('draft_paciente_alergias', alergias, 1000);
  if (plan) setDraft('draft_plan', plan);

  if (EXPERIENCE_VALUES.has(experienciaTerapiaRaw)) {
    setDraft('draft_paciente_experiencia', experienciaTerapiaRaw, 32);
  }

  redirect(
    plan
      ? `/registro-paciente/verificar?plan=${encodeURIComponent(plan)}`
      : '/registro-paciente/verificar'
  );
}

// ---------------------------------------------------------------------------
// PASO 2 — verifyOtpAction
// ---------------------------------------------------------------------------
export async function verifyOtpAction(formData: FormData): Promise<void> {
  const draftEmail = getDraft('draft_email');
  const draftPlanRaw = getDraft('draft_plan');
  const draftPlan = /^[a-zA-Z0-9_-]{1,64}$/.test(draftPlanRaw) ? draftPlanRaw : '';

  if (!draftEmail) {
    redirectRegistroError('Sesión de registro expirada. Reinicia el registro.', draftPlan);
  }

  const code = String(formData.get('code') ?? '')
    .trim()
    .replace(/\s+/g, '');
  const password = String(formData.get('password') ?? '');
  const passwordConfirm = String(formData.get('password_confirm') ?? '');

  if (!/^\d{6}$/.test(code)) {
    redirectOtpError('Código OTP inválido (6 dígitos).', draftPlan);
  }
  if (password.length < 14) {
    redirectOtpError('La contraseña debe tener al menos 14 caracteres.', draftPlan);
  }
  if (password !== passwordConfirm) {
    redirectOtpError('Las contraseñas no coinciden.', draftPlan);
  }

  const supabase = createServerClient();

  // 1. Verificar OTP → crea sesión
  const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
    email: draftEmail,
    token: code,
    type: 'email',
  });

  if (verifyError || !verifyData.session) {
    redirectOtpError(verifyError?.message ?? 'Código incorrecto o expirado.', draftPlan);
  }

  // 2. Establecer contraseña (el usuario existe y está logueado via OTP)
  const { error: pwdError } = await supabase.auth.updateUser({ password });
  if (pwdError) {
    redirectOtpError(`No se pudo guardar la contraseña: ${pwdError.message}`, draftPlan);
  }

  // 3. Crear ficha clínica cifrada vinculada a auth.uid()
  const draftNombre = getDraft('draft_paciente_nombre');
  const draftDni = getDraft('draft_paciente_dni');
  const draftTelefono = getDraft('draft_paciente_telefono');
  const draftMotivo = getDraft('draft_paciente_motivo');
  const draftExperiencia = getDraft('draft_paciente_experiencia');
  const draftFn = getDraft('draft_paciente_fn');
  const draftMedicacion = getDraft('draft_paciente_medicacion');
  const draftAlergias = getDraft('draft_paciente_alergias');

  const fechaNacimientoIso = parseFechaNacimiento(draftFn);

  const { error: rpcError } = await supabase.rpc('paciente_autoregistro_cifrada', {
    p_nombre_completo: draftNombre,
    p_dni_nie: draftDni,
    p_telefono: draftTelefono || null,
    p_email: draftEmail,
    p_fecha_nacimiento: fechaNacimientoIso,
    p_motivo_consulta_inicial: draftMotivo || null,
    p_experiencia_terapia: EXPERIENCE_VALUES.has(draftExperiencia) ? draftExperiencia : null,
    p_medicacion_base: draftMedicacion || null,
    p_alergias: draftAlergias || null,
    p_consentimiento_rgpd: true,
  });

  if (rpcError) {
    // NO abortamos el flujo: la cuenta ya existe y el password está puesto.
    // El paciente podrá completar la ficha desde el portal.
    // Logueamos vía headers para que sentry/vercel capture el error si procede.
    const h = headers();
    console.error('[registro-paciente] RPC paciente_autoregistro_cifrada falló:', {
      message: rpcError.message,
      code: rpcError.code,
      user_agent: h.get('user-agent'),
    });
  }

  clearDrafts();

  // 4. Redirigir según plan preseleccionado
  redirect(draftPlan
    ? `/portal/citas/reservar?plan=${encodeURIComponent(draftPlan)}`
    : '/portal'
  );
}

// ---------------------------------------------------------------------------
// Reenvío de OTP (si el usuario no recibió el email)
// ---------------------------------------------------------------------------
export async function resendOtpAction(): Promise<{ ok: true } | { ok: false; message: string }> {
  const draftEmail = getDraft('draft_email');
  if (!draftEmail) {
    return { ok: false, message: 'Sesión de registro expirada. Vuelve a iniciar el registro.' };
  }

  const supabase = createServerClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const { error } = await supabase.auth.signInWithOtp({
    email: draftEmail,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${appUrl}/auth/callback?type=signup`,
    },
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}
