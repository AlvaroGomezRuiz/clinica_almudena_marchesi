'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { updatePasswordAction } from '@/services/auth/actions';
import { PasswordInput, isPasswordStrong } from '@/components/auth/PasswordInput';

interface ResetPasswordFormProps {
  readonly email: string;
}

type FormState =
  | { kind: 'idle' }
  | { kind: 'error'; message: string }
  | { kind: 'success' };

/**
 * Formulario para establecer una nueva contraseña tras el flujo de recovery.
 * Al llegar aquí, el usuario YA tiene una sesión efímera creada por
 * /auth/callback?type=recovery. Envía el formulario, la acción actualiza la
 * contraseña vía `supabase.auth.updateUser`, y redirigimos al portal.
 */
export default function ResetPasswordForm({ email }: ResetPasswordFormProps): JSX.Element {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [state, setState] = useState<FormState>({ kind: 'idle' });
  const [isPending, startTransition] = useTransition();

  const canSubmit =
    !isPending && isPasswordStrong(password) && password === confirm;

  function onSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!canSubmit) return;

    if (password !== confirm) {
      setState({ kind: 'error', message: 'Las contraseñas no coinciden.' });
      return;
    }
    if (!isPasswordStrong(password)) {
      setState({
        kind: 'error',
        message: 'La contraseña no cumple todos los requisitos mínimos.',
      });
      return;
    }

    const data = new FormData();
    data.set('password', password);

    startTransition(async () => {
      const result = await updatePasswordAction(data);
      if (!result.ok) {
        setState({
          kind: 'error',
          message: result.message ?? 'No se pudo actualizar la contraseña.',
        });
        return;
      }
      setState({ kind: 'success' });
      setTimeout(() => {
        router.replace('/portal');
      }, 1200);
    });
  }

  if (state.kind === 'success') {
    return (
      <div
        role="status"
        className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-5 py-6 text-center"
      >
        <span
          className="material-symbols-outlined text-4xl text-emerald-600 mb-3 block"
          aria-hidden="true"
        >
          check_circle
        </span>
        <p className="font-display text-[1.15rem] text-ink italic mb-1">
          Contraseña actualizada
        </p>
        <p className="font-body text-[0.9rem] text-ink-soft">Redirigiendo a tu portal…</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-7" noValidate>
      {state.kind === 'error' ? (
        <div
          role="alert"
          className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 font-body text-sm text-red-700 dark:text-red-300"
        >
          {state.message}
        </div>
      ) : null}

      {email ? (
        <p className="font-body text-[0.85rem] text-ink-soft">
          Cuenta: <span className="text-ink font-medium">{email}</span>
        </p>
      ) : null}

      <PasswordInput
        name="password"
        value={password}
        onChange={setPassword}
        label="Nueva contraseña"
        autoComplete="new-password"
        disabled={isPending}
        showStrength
      />

      <div>
        <label
          htmlFor="password-confirm"
          className="flex h-5 items-end font-display text-[10px] uppercase tracking-[0.15em] text-ink-soft mb-2 font-medium"
        >
          Confirmar contraseña
        </label>
        <input
          id="password-confirm"
          name="password_confirm"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          disabled={isPending}
          aria-invalid={confirm.length > 0 && confirm !== password}
          className="w-full bg-white/50 dark:bg-black/30 border border-outline-variant/30 dark:border-white/10 rounded-lg px-4 py-3 font-body text-[0.95rem] text-ink placeholder:text-ink-muted/70 focus:ring-2 focus:ring-sage focus:outline-none transition-all disabled:opacity-50"
        />
        {confirm.length > 0 && confirm !== password ? (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400 font-body">
            Las contraseñas no coinciden.
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full bg-primary text-on-primary font-display text-xs uppercase py-3.5 rounded-xl tracking-[0.15em] font-medium hover:bg-primary-dim transition-all shadow-lg shadow-primary/10 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? 'Actualizando…' : 'Guardar contraseña'}
      </button>
    </form>
  );
}
