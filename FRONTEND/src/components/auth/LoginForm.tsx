'use client';

import { useFormStatus } from 'react-dom';
import { loginAction } from '@/services/auth/actions';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="w-full bg-primary text-on-primary font-label uppercase py-4 rounded-xl tracking-widest hover:bg-primary-dim transition-all shadow-lg shadow-primary/10"
      type="submit"
      disabled={pending}
    >
      {pending ? 'Cargando...' : 'Acceder al Portal'}
    </button>
  );
}

type LoginFormProps = {
  redirectTo?: string;
};

export default function LoginForm({ redirectTo }: LoginFormProps) {
  return (
    <form action={loginAction} className="space-y-12">
      {redirectTo ? (
        <input type="hidden" name="redirect_to" value={redirectTo} />
      ) : null}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
        <div className="relative">
          <label className="font-label text-[10px] uppercase tracking-widest text-secondary mb-2 block font-semibold">
            Correo Electrónico
          </label>
          <input
            className="w-full bg-white border border-outline-variant/30 rounded-lg px-4 py-3 transition-all font-body text-on-surface placeholder:text-outline/40"
            type="email"
            name="email"
            placeholder="hola@ejemplo.com"
            required
          />
        </div>

        <div className="relative">
          <label className="font-label text-[10px] uppercase tracking-widest text-secondary mb-2 block font-semibold">
            Contraseña
          </label>
          <input
            className="w-full bg-white border border-outline-variant/30 rounded-lg px-4 py-3 transition-all font-body text-on-surface placeholder:text-outline/40"
            type="password"
            name="password"
            placeholder="••••••••••••"
            required
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          id="trust_device"
          name="trust_device"
          type="checkbox"
          className="h-4 w-4 accent-primary"
        />
        <label
          htmlFor="trust_device"
          className="font-body text-sm text-on-surface-variant"
        >
          Confiar en este dispositivo (30 días)
        </label>
      </div>

      <div className="pt-8 border-t border-outline-variant/15 flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
