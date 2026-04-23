'use client';

/**
 * Formulario de auto-registro de paciente.
 *
 * Campos (los 5 que realmente identifican legalmente al paciente):
 *   - Nombre
 *   - Apellidos
 *   - Email
 *   - DNI / NIE (validado con letra de control oficial)
 *   - Contraseña (≥12 chars + may/min/num/símbolo) + confirmación
 *   - Consentimiento RGPD
 *
 * El resto de información clínica (motivo, medicación, etc.) se rellena
 * después, desde el portal, una vez verificada la cuenta.
 *
 * Flujo post-submit:
 *   1. signupAction → supabase.auth.signUp con password + user_metadata.
 *   2. Supabase manda email de verificación con link.
 *   3. Click → /auth/callback?type=signup → crea ficha cifrada (RPC).
 *   4. Sesión activa → /portal.
 */

import { useState, useTransition } from 'react';

import { signupAction, type SignupResult } from '@/services/auth/actions';
import { validateDniNie } from '@/lib/validation/dni';
import { PasswordInput, isPasswordStrong } from './PasswordInput';

export function SignupForm(): JSX.Element {
  const [result, setResult] = useState<SignupResult | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Campos controlados (necesario para los componentes de password y feedback DNI).
  const [givenName, setGivenName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [email, setEmail] = useState('');
  const [dni, setDni] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  const dniCheck = dni.length >= 5 ? validateDniNie(dni) : null;

  function onSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    setClientError(null);

    if (givenName.trim().length < 2) {
      setClientError('Introduce tu nombre.');
      return;
    }
    if (familyName.trim().length < 2) {
      setClientError('Introduce tus apellidos.');
      return;
    }
    const dniResult = validateDniNie(dni);
    if (!dniResult.ok) {
      setClientError(dniResult.error ?? 'DNI/NIE no válido.');
      return;
    }
    if (!isPasswordStrong(password)) {
      setClientError('La contraseña no cumple la política de seguridad.');
      return;
    }
    if (password !== passwordConfirm) {
      setClientError('Las contraseñas no coinciden.');
      return;
    }

    const fd = new FormData(e.currentTarget);
    fd.set('dni_nie', dniResult.normalized ?? dni.trim().toUpperCase());
    startTransition(async () => {
      const res = await signupAction(fd);
      setResult(res);
    });
  }

  if (result?.ok) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-2xl bg-primary/8 p-6 ring-1 ring-primary/20"
      >
        <p className="font-display text-[10px] uppercase tracking-[0.15em] text-primary/80 font-medium">
          Email enviado
        </p>
        <h2 className="mt-2 font-display text-[1.5rem] italic leading-tight text-ink">
          Verifica tu correo electrónico
        </h2>
        <p className="mt-3 font-body text-[0.9rem] leading-relaxed text-ink-soft">
          Te hemos enviado un enlace de confirmación a{' '}
          <strong className="font-medium text-ink">{result.email}</strong>. Abre
          el mensaje y haz click en el botón para activar tu cuenta. El enlace
          caduca en 24 horas.
        </p>
        <p className="mt-4 font-body text-[0.8rem] text-ink-muted">
          ¿No lo encuentras? Revisa spam o promociones. Si sigue sin llegar,
          contacta con la consulta.
        </p>
      </div>
    );
  }

  const inputCls =
    'w-full bg-white/50 dark:bg-black/30 border border-outline-variant/30 dark:border-white/10 rounded-lg px-4 py-3 font-body text-[0.95rem] text-ink placeholder:text-ink-muted/70 focus:ring-2 focus:ring-sage focus:outline-none disabled:opacity-60';
  const labelCls =
    'block font-display text-[10px] uppercase tracking-[0.15em] text-ink-soft mb-2 font-medium';

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      {/* Honeypot — oculto a usuarios, visible a bots */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="given_name" className={labelCls}>
            Nombre
          </label>
          <input
            id="given_name"
            name="given_name"
            type="text"
            autoComplete="given-name"
            required
            minLength={2}
            maxLength={60}
            value={givenName}
            onChange={(e) => setGivenName(e.target.value)}
            placeholder="María"
            disabled={pending}
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="family_name" className={labelCls}>
            Apellidos
          </label>
          <input
            id="family_name"
            name="family_name"
            type="text"
            autoComplete="family-name"
            required
            minLength={2}
            maxLength={80}
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            placeholder="Pérez García"
            disabled={pending}
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className={labelCls}>
          Correo electrónico
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@correo.com"
          disabled={pending}
          className={inputCls}
        />
      </div>

      <div>
        <label htmlFor="dni_nie" className={labelCls}>
          DNI / NIE
        </label>
        <input
          id="dni_nie"
          name="dni_nie_raw"
          type="text"
          autoComplete="off"
          required
          maxLength={12}
          value={dni}
          onChange={(e) => setDni(e.target.value.toUpperCase())}
          placeholder="12345678Z"
          aria-invalid={dniCheck ? !dniCheck.ok : undefined}
          aria-describedby="dni-hint"
          disabled={pending}
          className={inputCls}
        />
        <p
          id="dni-hint"
          className={`mt-2 font-body text-[0.78rem] ${
            dniCheck?.ok
              ? 'text-emerald-600'
              : dniCheck && !dniCheck.ok
                ? 'text-[#b2675e]'
                : 'text-ink-muted'
          }`}
        >
          {dniCheck?.ok
            ? `${dniCheck.kind === 'nie' ? 'NIE' : 'DNI'} válido`
            : dniCheck?.error
              ? dniCheck.error
              : 'Se usa para identificarte en la historia clínica. Formato: 8 dígitos + letra (DNI) o X/Y/Z + 7 dígitos + letra (NIE).'}
        </p>
      </div>

      <div>
        <label htmlFor="telefono" className={labelCls}>
          Teléfono
        </label>
        <input
          id="telefono"
          name="telefono"
          type="tel"
          autoComplete="tel"
          required
          maxLength={22}
          disabled={pending}
          className={inputCls}
          placeholder="+34 600 000 000"
        />
      </div>

      <div>
        <label htmlFor="direccion" className={labelCls}>
          Dirección completa
        </label>
        <textarea
          id="direccion"
          name="direccion"
          required
          rows={2}
          maxLength={400}
          disabled={pending}
          className={inputCls}
          placeholder="Calle, número, piso, código postal, ciudad"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="contacto_emergencia_nombre" className={labelCls}>
            Contacto emergencia · nombre
          </label>
          <input
            id="contacto_emergencia_nombre"
            name="contacto_emergencia_nombre"
            type="text"
            autoComplete="name"
            required
            minLength={2}
            maxLength={120}
            disabled={pending}
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="contacto_emergencia_telefono" className={labelCls}>
            Contacto emergencia · teléfono
          </label>
          <input
            id="contacto_emergencia_telefono"
            name="contacto_emergencia_telefono"
            type="tel"
            autoComplete="tel"
            required
            maxLength={22}
            disabled={pending}
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <label htmlFor="fecha_nacimiento" className={labelCls}>
          Fecha de nacimiento
        </label>
        <input
          id="fecha_nacimiento"
          name="fecha_nacimiento"
          type="date"
          required
          disabled={pending}
          className={inputCls}
        />
      </div>

      <fieldset className="space-y-3">
        <legend className={labelCls}>Experiencia previa en terapia</legend>
        <div className="space-y-2 font-body text-[0.88rem] text-ink-soft">
          <label className="flex items-center gap-2">
            <input type="radio" name="experiencia_terapia" value="never" required disabled={pending} />
            Nunca he ido
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="experiencia_terapia" value="long_ago" disabled={pending} />
            Hace mucho (mín. 1 año sin proceso continuo)
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="experiencia_terapia" value="from_clinic" disabled={pending} />
            Vengo de otra clínica
          </label>
        </div>
      </fieldset>

      <div>
        <label htmlFor="motivo_consulta_breve" className={labelCls}>
          Motivo de la consulta (breve)
        </label>
        <textarea
          id="motivo_consulta_breve"
          name="motivo_consulta_breve"
          rows={3}
          maxLength={2000}
          disabled={pending}
          className={inputCls}
          placeholder="Unas líneas bastan. Solo lo verá Almudena para contextualizar la primera sesión."
        />
        <p className="mt-2 font-body text-[0.72rem] text-ink-muted">
          No aparece en tu perfil público; queda en la historia clínica cifrada accesible solo para la psicóloga.
        </p>
      </div>

      <div>
        <label htmlFor="medicacion_psiquiatria" className={labelCls}>
          Medicación psiquiátrica (opcional)
        </label>
        <textarea
          id="medicacion_psiquiatria"
          name="medicacion_psiquiatria"
          rows={2}
          maxLength={1500}
          disabled={pending}
          className={inputCls}
          placeholder="Si tomas medicación prescrita relacionada con salud mental, indícalo aquí. No uses este campo para alergias."
        />
      </div>

      <PasswordInput
        id="password"
        name="password"
        value={password}
        onChange={setPassword}
        disabled={pending}
        autoComplete="new-password"
        label="Contraseña"
      />

      <PasswordInput
        id="password_confirm"
        name="password_confirm"
        value={passwordConfirm}
        onChange={setPasswordConfirm}
        disabled={pending}
        autoComplete="new-password"
        label="Repetir contraseña"
        placeholder="Repite la contraseña"
        showStrength={false}
      />

      {passwordConfirm.length > 0 && password !== passwordConfirm ? (
        <p className="-mt-3 font-body text-[0.8rem] text-[#b2675e]">
          Las contraseñas no coinciden.
        </p>
      ) : null}

      <label className="flex items-start gap-3 text-[0.85rem] text-ink-soft">
        <input
          type="checkbox"
          name="rgpd"
          required
          disabled={pending}
          className="mt-1 size-4 accent-primary"
        />
        <span className="font-body leading-relaxed">
          Acepto la{' '}
          <a
            href="/privacidad"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink underline underline-offset-4"
          >
            política de privacidad
          </a>
          {' y el tratamiento de mis datos con fines clínicos, según la LOPDGDD y el RGPD.'}
        </span>
      </label>

      {clientError ? (
        <p role="alert" className="font-body text-[0.85rem] text-[#b2675e]">
          {clientError}
        </p>
      ) : null}

      {result && !result.ok ? (
        <p role="alert" className="font-body text-[0.85rem] text-[#b2675e]">
          {result.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-primary text-on-primary font-display text-xs uppercase py-3.5 rounded-xl tracking-[0.15em] font-medium hover:bg-primary-dim transition-all shadow-lg shadow-primary/10 disabled:opacity-50"
      >
        {pending ? 'Creando cuenta…' : 'Crear mi cuenta'}
      </button>

      <p className="text-center font-body text-[0.85rem] text-ink-soft">
        ¿Ya tienes cuenta?{' '}
        <a href="/login" className="text-ink underline underline-offset-4">
          Iniciar sesión
        </a>
      </p>
    </form>
  );
}
