import type { Metadata } from 'next';

import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';
import PremiumCard from '@/components/ui/PremiumCard';
import { CLINIC_PUBLIC_SITE_HOST_LABEL } from '@/lib/clinic';

export const metadata: Metadata = {
  title: `Recuperar contraseña | ${CLINIC_PUBLIC_SITE_HOST_LABEL}`,
  description: 'Solicita un enlace para restablecer tu contraseña.',
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6 md:p-12">
      <PremiumCard tilt={false} className="w-full max-w-md mx-auto">
        <div className="p-8 md:p-12">
          <div className="mb-10">
            <h1 className="font-display text-[2.25rem] text-ink italic mb-2 text-balance leading-tight">
              Recuperar contraseña
            </h1>
            <p className="font-display text-[1.05rem] text-ink-soft leading-relaxed">
              Introduce tu correo y te enviaremos un enlace seguro para elegir una contraseña nueva.
            </p>
          </div>

          <ForgotPasswordForm />

          <div className="mt-10 pt-6 border-t border-outline-variant/30 text-center">
            <a
              href="/login"
              className="font-body text-[0.9rem] text-ink-soft hover:text-ink underline-offset-4 hover:underline"
            >
              Volver al acceso
            </a>
          </div>
        </div>
      </PremiumCard>
    </div>
  );
}
