import type { Metadata } from 'next';
import Image from 'next/image';

import { SignupForm } from '@/components/auth/SignupForm';
import PremiumCard from '@/components/ui/PremiumCard';

export const metadata: Metadata = {
  title: 'Crear cuenta | Portal del Paciente',
  description: 'Regístrate como paciente para acceder al portal de reservas y recursos.',
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function RegistroPacientePage(): JSX.Element {
  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6 md:p-12">
      <div className="max-w-screen-xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24 items-center">
        <div className="hidden md:block">
          <div className="relative aspect-[4/5] rounded-apple overflow-hidden shadow-apple-lg">
            <Image
              alt="Ventana con luz suave en espacio de consulta"
              className="w-full h-full object-cover"
              height={1000}
              priority
              src="/images/acceso-portal-login.avif"
              width={800}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/40 to-transparent" />
            <div className="absolute bottom-10 left-10 right-10">
              <p className="font-display text-2xl text-white italic leading-tight">
                &ldquo;Empezar es el paso más difícil y también el más valiente.&rdquo;
              </p>
            </div>
          </div>
        </div>

        <PremiumCard tilt={false} className="w-full max-w-md mx-auto">
          <div className="p-8 md:p-12">
            <div className="mb-10">
              <p className="font-display text-[10px] uppercase tracking-[0.15em] text-primary/80 font-medium">
                Nuevo paciente
              </p>
              <h1 className="mt-2 font-display text-[2.25rem] text-ink italic mb-2 text-balance leading-tight">
                Crea tu cuenta
              </h1>
              <p className="font-body text-[0.95rem] text-ink-soft leading-relaxed">
                Solo necesitamos unos datos básicos. Después de verificar tu correo,
                Almudena validará tu alta clínica y tendrás acceso completo al portal.
              </p>
            </div>

            <SignupForm />
          </div>
        </PremiumCard>
      </div>
    </div>
  );
}
