import type { Metadata } from 'next';
import Image from 'next/image';

import MfaCodeForm from '@/components/auth/MfaCodeForm';
import PremiumCard from '@/components/ui/PremiumCard';

export const metadata: Metadata = {
  title: 'Código de seguridad | Inicio de sesión',
  description: 'Verificación en dos pasos para acceder al portal de la clínica.',
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function LoginMfaPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string; reason?: string };
}) {
  const errorMsg =
    searchParams.error ??
    (searchParams.reason === 'mfa_no_session'
      ? 'Sesión incompleta o expirada. Vuelve a identificarte e introduce el código.'
      : null);
  const nextPath = searchParams.next;

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6 md:p-12">
      <div className="max-w-screen-xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24 items-center">
        <div className="hidden md:block">
          <div className="relative aspect-[4/5] rounded-apple overflow-hidden shadow-apple-lg">
            <Image
              alt="Espacio acogedor de consulta psicológica"
              className="w-full h-full object-cover"
              height={1000}
              priority
              src="/images/acceso-portal-login.avif"
              width={800}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/40 to-transparent" />
            <div className="absolute bottom-10 left-10 right-10">
              <p className="font-display text-2xl text-white italic leading-tight">
                &ldquo;Un paso más: tu clínica protegida a dos llaves.&rdquo;
              </p>
            </div>
          </div>
        </div>

        <PremiumCard tilt={false} className="w-full max-w-md mx-auto">
          <div className="p-8 md:p-12">
            <div className="mb-10">
              <h1 className="font-display text-[2rem] text-ink italic mb-2 text-balance leading-tight">
                Código de verificación
              </h1>
              <p className="font-display text-[1rem] text-ink-soft leading-relaxed">
                Introduce el código de 6 dígitos de tu aplicación de autenticación. Solo
                con este paso se completa el inicio de sesión.
              </p>
            </div>

            <MfaCodeForm
              nextPath={nextPath}
              error={errorMsg}
            />
          </div>
        </PremiumCard>
      </div>
    </div>
  );
}
