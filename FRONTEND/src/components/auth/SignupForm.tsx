'use client';

/**
 * Formulario de auto-registro de paciente.
 * - Valida client-side mínima (UX), server-side completa.
 * - Honeypot anti-bot (`company` oculto).
 * - Tras éxito, muestra aviso de verificación.
 */

import { useState, useTransition } from 'react';

import { signupAction, type SignupResult } from '@/services/auth/actions';

export function SignupForm(): JSX.Element {
  const [result, setResult] = useState<SignupResult | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
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

      <div>
        <label
          htmlFor="display_name"
          className="block font-display text-[10px] uppercase tracking-[0.15em] text-ink-soft mb-2 font-medium"
        >
          Nombre completo
        </label>
        <input
          id="display_name"
          name="display_name"
          type="text"
          autoComplete="name"
          required
          minLength={2}
          maxLength={80}
          placeholder="María Pérez García"
          disabled={pending}
          className="w-full bg-white/50 dark:bg-black/30 border border-outline-variant/30 dark:border-white/10 rounded-lg px-4 py-3 font-body text-[0.95rem] text-ink placeholder:text-ink-muted/70 focus:ring-2 focus:ring-sage focus:outline-none"
        />
      </div>

      <div>
        <label
          htmlFor="email"
          className="block font-display text-[10px] uppercase tracking-[0.15em] text-ink-soft mb-2 font-medium"
        >
          Correo electrónico
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="tu@correo.com"
          disabled={pending}
          className="w-full bg-white/50 dark:bg-black/30 border border-outline-variant/30 dark:border-white/10 rounded-lg px-4 py-3 font-body text-[0.95rem] text-ink placeholder:text-ink-muted/70 focus:ring-2 focus:ring-sage focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label
            htmlFor="password"
            className="block font-display text-[10px] uppercase tracking-[0.15em] text-ink-soft mb-2 font-medium"
          >
            Contraseña
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              minLength={12}
              placeholder="Mín. 12 caracteres"
              disabled={pending}
              className="w-full bg-white/50 dark:bg-black/30 border border-outline-variant/30 dark:border-white/10 rounded-lg px-4 py-3 pr-12 font-body text-[0.95rem] text-ink placeholder:text-ink-muted/70 focus:ring-2 focus:ring-sage focus:outline-none"
            />
            <button
              type="button"
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-outline/60 hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-xl">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>

        <div>
          <label
            htmlFor="password_confirm"
            className="block font-display text-[10px] uppercase tracking-[0.15em] text-ink-soft mb-2 font-medium"
          >
            Repetir contraseña
          </label>
          <input
            id="password_confirm"
            name="password_confirm"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            required
            minLength={12}
            placeholder="Repite la contraseña"
            disabled={pending}
            className="w-full bg-white/50 dark:bg-black/30 border border-outline-variant/30 dark:border-white/10 rounded-lg px-4 py-3 font-body text-[0.95rem] text-ink placeholder:text-ink-muted/70 focus:ring-2 focus:ring-sage focus:outline-none"
          />
        </div>
      </div>

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
          <a href="/privacidad" className="text-ink underline underline-offset-4">
            política de privacidad
          </a>
          {' y el tratamiento de mis datos con fines clínicos, según la LOPDGDD y el RGPD.'}
        </span>
      </label>

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
