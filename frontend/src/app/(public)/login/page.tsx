import type { Metadata } from 'next';
import Image from 'next/image';

import LoginForm from '@/components/auth/LoginForm';
import PremiumCard from '@/components/ui/PremiumCard';
import { CLINIC_PUBLIC_SITE_HOST_LABEL } from '@/lib/clinic';

export const metadata: Metadata = {
  title: `Inicio de sesión — portal del paciente | ${CLINIC_PUBLIC_SITE_HOST_LABEL}`,
  description: 'Accede a tu espacio seguro para gestionar tus citas y documentos.',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: { redirect_to?: string; next?: string; error?: string; reason?: string };
}) {
  const errorMsg =
    searchParams.error ??
    (searchParams.reason === 'no_session'
      ? 'Debes iniciar sesión para acceder a esta página.'
      : searchParams.reason === 'mfa_no_session'
        ? 'Sesión incompleta. Vuelve a identificarte y, si tienes MFA, introduce el código de 6 dígitos.'
        : searchParams.reason === 'role_mismatch'
          ? 'No tienes permisos para acceder a esa sección.'
          : null);
  const nextPath = searchParams.redirect_to ?? searchParams.next;

  /* Detectar si el error es de tipo "dispositivo diferente" para mostrar icono especial */
  const isDeviceError = errorMsg?.includes('dispositivo o navegador distinto') ?? false;

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6 md:p-12">
      <div className="max-w-screen-xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24 items-center">
        <div className="hidden md:block">
          <div className="relative aspect-[4/5] rounded-apple overflow-hidden shadow-apple-lg">
            <Image
              alt="Espacio acogedor de consulta psicológica con luz natural cálida"
              className="w-full h-full object-cover"
              height={1000}
              priority
              src="/images/acceso-portal-login.avif"
              width={800}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/40 to-transparent" />
            <div className="absolute bottom-10 left-10 right-10">
              <p className="font-display text-2xl text-white italic leading-tight">
                &ldquo;Tu espacio de seguridad y calma, ahora también en digital.&rdquo;
              </p>
            </div>
          </div>
        </div>

        <PremiumCard tilt={false} className="w-full max-w-md mx-auto">
          <div className="p-8 md:p-12">
            <div className="mb-12">
              <h1 className="font-display text-[2.5rem] text-ink italic mb-2 text-balance leading-tight">
                Tu Espacio Seguro
              </h1>
              <p className="font-display text-[1.1rem] text-ink-soft leading-relaxed">
                Accede a tu portal privado para gestionar tus citas y documentación clínica.
              </p>
            </div>

            {errorMsg ? (
              <div
                role="alert"
                className={`mb-8 rounded-2xl border px-5 py-4 font-body text-[0.88rem] leading-relaxed ${
                  isDeviceError
                    ? 'border-amber-500/20 bg-amber-500/5 text-amber-800 dark:text-amber-300'
                    : 'border-red-500/20 bg-red-500/5 text-red-700 dark:text-red-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  {isDeviceError ? (
                    <span className="mt-0.5 shrink-0 text-lg" aria-hidden="true">📱</span>
                  ) : (
                    <span className="mt-0.5 shrink-0 text-lg" aria-hidden="true">⚠️</span>
                  )}
                  <span>{errorMsg}</span>
                </div>
              </div>
            ) : null}

            <LoginForm redirectTo={nextPath} />

            <div className="mt-12 pt-8 border-t border-outline-variant/30 text-center space-y-5">
              <p className="font-body text-[0.95rem] text-ink-soft">
                ¿Todavía no eres paciente de la clínica?
              </p>
              <div className="flex flex-row justify-center items-center gap-3">
                <a
                  href="/registro-paciente"
                  className="px-4 py-1.5 rounded-full border border-ink/10 text-ink text-xs font-medium hover:bg-ink/5 dark:hover:bg-white/5 transition-all"
                >
                  Crear Cuenta
                </a>
                <a
                  href="/contacto"
                  className="px-4 py-1.5 rounded-full border border-ink/10 text-ink text-xs font-medium hover:bg-ink/5 dark:hover:bg-white/5 transition-all"
                >
                  Contactar
                </a>
              </div>
            </div>
          </div>
        </PremiumCard>
      </div>
    </div>
  );
}

