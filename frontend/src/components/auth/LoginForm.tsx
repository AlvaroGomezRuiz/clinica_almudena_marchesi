'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';

import { loginAction } from '@/services/auth/actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      className="w-full bg-primary text-on-primary font-display text-xs uppercase py-3.5 rounded-xl tracking-[0.15em] font-medium hover:bg-primary-dim transition-all shadow-lg shadow-primary/10 disabled:opacity-50"
      type="submit"
      disabled={pending}
    >
      {pending ? 'Verificando…' : 'Acceder al Portal'}
    </button>
  );
}

interface LoginFormProps {
  redirectTo?: string;
}

export default function LoginForm({ redirectTo }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={loginAction} className="space-y-10">
      {redirectTo ? <input type="hidden" name="redirect_to" value={redirectTo} /> : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
        <div className="relative">
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
            className="w-full bg-white/50 dark:bg-black/30 border border-outline-variant/30 dark:border-white/10 rounded-lg px-4 py-3 font-body text-[0.95rem] text-ink placeholder:text-ink-muted/70 focus:ring-2 focus:ring-sage focus:outline-none transition-all"
          />
        </div>

        <div className="relative">
          <label
            htmlFor="password"
            className="flex h-5 items-end font-display text-[10px] uppercase tracking-[0.15em] text-ink-soft mb-2 font-medium"
          >
            Contraseña
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              placeholder="••••••••••••"
              className="w-full bg-white/50 dark:bg-black/30 border border-outline-variant/30 dark:border-white/10 rounded-lg px-4 py-3 pr-12 font-body text-[0.95rem] text-ink placeholder:text-ink-muted/70 focus:ring-2 focus:ring-sage focus:outline-none transition-all"
            />
            <button
              type="button"
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-outline/60 hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined text-xl">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-start gap-3 text-[0.85rem]">
        <a
          href="/auth/forgot-password"
          className="text-ink-soft hover:text-ink underline-offset-4 hover:underline font-body"
        >
          ¿Olvidaste tu contraseña?
        </a>
      </div>

      <div className="pt-4 flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
