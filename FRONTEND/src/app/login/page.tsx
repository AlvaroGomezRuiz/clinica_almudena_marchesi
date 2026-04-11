'use client';

import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useFormStatus } from 'react-dom';

import { loginAction } from '@/lib/auth/actions';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="w-full md:w-auto bg-primary text-on-primary px-10 py-5 rounded-xl font-label text-xs uppercase tracking-[0.2em] font-bold editorial-shadow hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed"
      type="submit"
      disabled={pending}
    >
      <span className="material-symbols-outlined text-xl" data-icon="login">
        login
      </span>
      {pending ? 'Procesando...' : 'Entrar al Búnker'}
    </button>
  );
}

export default function LoginPage() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('next') ?? '';
  const error = searchParams.get('error');

  return (
    <main className="min-h-screen pt-40 pb-20 px-6 flex items-center justify-center bg-background text-on-surface font-body selection:bg-primary-container selection:text-on-primary-container">
      <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-12 bg-surface-container-lowest editorial-shadow rounded-xl overflow-hidden">
        <div className="md:col-span-5 bg-surface-container-low p-12 flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <div className="mb-8 overflow-hidden rounded-xl h-80 w-full">
              <Image
                alt="Retrato profesional de Almudena Marchesi"
                className="w-full h-full object-cover"
                height={800}
                sizes="(min-width: 768px) 40vw, 100vw"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBEhhmYFWoOy8Fd0GBsFwm9_63u27nkDMwDUWfJm7tNuEbZFFs6titbrfGnyLpX3cDlm2Cy1HCsJTzc-__ErjSgH5ArRnQObKciorMRZIzm0lae37gm2wMON4g7Kzc_32nAeztrs8r8JAEJ_1nfLH6hDW9o2PHU6F0_ymZlbBKCAvJw6A8feLhYOCzqteJRU0qXJt8BY9gjiQVMdftpg71WfOvzbajsjOOx4cjpMzunayyU0wu85QFViA19SgJ-TOncxFZGJhM_L4k"
                width={1200}
              />
            </div>

            <h1 className="font-headline text-4xl text-primary font-bold tracking-tight mb-4 leading-tight">
              Acceso al Búnker
            </h1>
            <p className="text-on-surface-variant font-body leading-relaxed mb-8">
              Identifícate para acceder a tu portal seguro.
            </p>
          </div>

          <div className="space-y-6 relative z-10 pt-8 border-t border-outline-variant/20">
            <div className="flex items-center gap-4 text-primary">
              <span className="material-symbols-outlined text-2xl" data-icon="verified_user">
                verified_user
              </span>
              <div className="flex flex-col">
                <span className="font-label text-[10px] uppercase tracking-[0.2em] font-bold">
                  RGPD
                </span>
                <span className="text-xs text-on-surface-variant">Protección de datos (UE)</span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-primary">
              <span className="material-symbols-outlined text-2xl" data-icon="lock">
                lock
              </span>
              <div className="flex flex-col">
                <span className="font-label text-[10px] uppercase tracking-[0.2em] font-bold">
                  AES-256
                </span>
                <span className="text-xs text-on-surface-variant">Cifrado en bóveda clínica</span>
              </div>
            </div>
          </div>

          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        </div>

        <div className="md:col-span-7 p-12 bg-white">
          {error ? (
            <div className="mb-8 bg-error-container text-on-error-container border border-error/20 rounded-xl p-4 text-sm">
              {error}
            </div>
          ) : null}

          <form action={loginAction} className="space-y-10">
            <input type="hidden" name="redirect_to" value={redirectTo} />

            <div className="space-y-2">
              <label className="font-label text-[10px] uppercase tracking-widest text-secondary block font-semibold">
                Email
              </label>
              <input
                className="w-full bg-white border border-outline-variant/30 rounded-lg px-4 py-3 transition-all font-body text-on-surface placeholder:text-outline/40"
                placeholder="hola@ejemplo.com"
                type="email"
                name="email"
                autoComplete="username"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="font-label text-[10px] uppercase tracking-widest text-secondary block font-semibold">
                Contraseña
              </label>
              <input
                className="w-full bg-white border border-outline-variant/30 rounded-lg px-4 py-3 transition-all font-body text-on-surface placeholder:text-outline/40"
                placeholder="••••••••••••••"
                type="password"
                name="password"
                autoComplete="current-password"
                required
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                id="trust_device"
                name="trust_device"
                type="checkbox"
                className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary-container"
              />
              <label htmlFor="trust_device" className="text-sm text-on-surface-variant">
                Confiar en este dispositivo
              </label>
            </div>

            <div className="pt-4 border-t border-surface-container flex justify-end">
              <SubmitButton />
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
