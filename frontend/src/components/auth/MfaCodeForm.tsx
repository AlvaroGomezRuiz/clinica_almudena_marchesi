'use client';

import { useFormStatus } from 'react-dom';
import { useId } from 'react';

import { completeMfaLoginAction, logoutAction } from '@/services/auth/actions';

function SubmitMfa() {
  const { pending } = useFormStatus();
  return (
    <button
      className="w-full bg-primary text-on-primary font-display text-xs uppercase py-3.5 rounded-xl tracking-[0.15em] font-medium hover:bg-primary-dim transition-all shadow-lg shadow-primary/10 disabled:opacity-50"
      type="submit"
      disabled={pending}
    >
      {pending ? 'Verificando…' : 'Verificar e iniciar sesión'}
    </button>
  );
}

interface MfaCodeFormProps {
  nextPath: string | undefined;
  error: string | null;
}

export default function MfaCodeForm({ nextPath, error: initialError }: MfaCodeFormProps) {
  const id = useId();

  return (
    <div className="space-y-6">
      {initialError ? (
        <div
          role="alert"
          className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 font-body text-sm text-red-700 dark:text-red-300"
        >
          {initialError}
        </div>
      ) : null}

      <form className="space-y-6" action={completeMfaLoginAction}>
        {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
        <div>
          <label
            htmlFor={id}
            className="flex h-5 items-end font-display text-[10px] uppercase tracking-[0.15em] text-ink-soft mb-2 font-medium"
          >
            Código de 6 dígitos
          </label>
          <input
            id={id}
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            minLength={6}
            required
            pattern="[0-9]{6}"
            placeholder="000000"
            className="w-full bg-white/50 dark:bg-black/30 border border-outline-variant/30 dark:border-white/10 rounded-lg px-4 py-3 font-body text-2xl tracking-[0.35em] text-ink text-center font-medium placeholder:text-ink-muted/30 focus:ring-2 focus:ring-sage focus:outline-none transition-all"
            aria-describedby={`${id}-help`}
            onInput={(e) => {
              const t = e.currentTarget;
              t.value = t.value.replace(/\D/g, '').slice(0, 6);
            }}
          />
          <p
            id={`${id}-help`}
            className="mt-2 font-body text-[0.8rem] text-ink-soft leading-relaxed"
          >
            Abre la app (Google Authenticator, 1Password, etc.) y el código vinculado
            a esta clínica.
          </p>
        </div>
        <div className="pt-2 flex flex-col gap-3">
          <SubmitMfa />
        </div>
      </form>

      <form action={logoutAction} className="flex justify-center">
        <button
          type="submit"
          className="font-body text-[0.85rem] text-ink-soft hover:text-ink underline-offset-4 hover:underline"
        >
          Cerrar sesión e intentar con otra cuenta
        </button>
      </form>
    </div>
  );
}
