'use client';

import { useState, useTransition } from 'react';

import { requestPasswordResetAction } from '@/services/auth/actions';

type FormState =
  | { kind: 'idle' }
  | { kind: 'sent' }
  | { kind: 'error'; message: string };

/**
 * Formulario para solicitar un email de recuperación de contraseña.
 * Llama a `requestPasswordResetAction` que dispara Supabase `resetPasswordForEmail`
 * con `redirectTo` = `${APP_URL}/auth/reset`. El usuario recibirá un correo con un
 * enlace; al clicar, Supabase redirige a /auth/callback?type=recovery → /auth/reset.
 *
 * Defensa anti-enumeración: siempre mostramos el mismo mensaje de éxito aunque
 * el email no exista (evita que un atacante descubra cuentas válidas).
 */
export default function ForgotPasswordForm(): JSX.Element {
  const [state, setState] = useState<FormState>({ kind: 'idle' });
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    startTransition(async () => {
      const result = await requestPasswordResetAction(data);
      if (!result.ok) {
        // Defensa anti-enumeración: ocultamos errores de "email no registrado"
        // mostrando el mismo estado exitoso. Sólo propagamos errores técnicos.
        const msg = result.message?.toLowerCase() ?? '';
        if (msg.includes('not found') || msg.includes('no encontr')) {
          setState({ kind: 'sent' });
        } else {
          setState({
            kind: 'error',
            message: 'No se pudo procesar la solicitud. Inténtalo de nuevo en unos minutos.',
          });
        }
        return;
      }
      setState({ kind: 'sent' });
    });
  }

  if (state.kind === 'sent') {
    return (
      <div
        role="status"
        className="rounded-xl border border-sage/30 bg-sage/5 px-5 py-6 text-center"
      >
        <span
          className="material-symbols-outlined text-4xl text-sage mb-3 block"
          aria-hidden="true"
        >
          mark_email_read
        </span>
        <h2 className="font-display text-[1.25rem] text-ink italic mb-2">
          Revisa tu correo
        </h2>
        <p className="font-body text-[0.95rem] text-ink-soft leading-relaxed">
          Si esa dirección está registrada, te hemos enviado un enlace para elegir
          una contraseña nueva. El enlace caduca en 1&nbsp;hora.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {state.kind === 'error' ? (
        <div
          role="alert"
          className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 font-body text-sm text-red-700 dark:text-red-300"
        >
          {state.message}
        </div>
      ) : null}

      <div>
        <label
          htmlFor="email"
          className="flex h-5 items-end font-display text-[10px] uppercase tracking-[0.15em] text-ink-soft mb-2 font-medium"
        >
          Correo Electrónico
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="hola@ejemplo.com"
          disabled={isPending}
          className="w-full bg-white/50 dark:bg-black/30 border border-outline-variant/30 dark:border-white/10 rounded-lg px-4 py-3 font-body text-[0.95rem] text-ink placeholder:text-ink-muted/70 focus:ring-2 focus:ring-sage focus:outline-none transition-all disabled:opacity-50"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-primary text-on-primary font-display text-xs uppercase py-3.5 rounded-xl tracking-[0.15em] font-medium hover:bg-primary-dim transition-all shadow-lg shadow-primary/10 disabled:opacity-50"
      >
        {isPending ? 'Enviando…' : 'Enviar enlace'}
      </button>
    </form>
  );
}
