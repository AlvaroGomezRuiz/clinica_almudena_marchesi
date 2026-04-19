import type { Metadata } from 'next';
import Image from 'next/image';
import LoginForm from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Portal del Paciente | Almudena Marchesi',
  description: 'Accede a tu espacio seguro para gestionar tus citas y documentos.',
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: { redirect_to?: string };
}) {
  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6 md:p-12">
      <div className="max-w-screen-xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24 items-center">
        {/* Left Side: Illustration / Image */}
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

        {/* Right Side: Form */}
        <div className="w-full max-w-md mx-auto glass-card dark:glass-card-dark p-8 md:p-12 rounded-[24px]">
          <div className="mb-12">
            <h1 className="font-display text-[2.5rem] text-ink italic mb-2 text-balance leading-tight">
              Tu Espacio Seguro
            </h1>
            <p className="font-display text-[1.1rem] text-ink-soft leading-relaxed">
              Accede a tu portal privado para gestionar tus citas y documentación clínica.
            </p>
          </div>

          <LoginForm redirectTo={searchParams.redirect_to} />

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
      </div>
    </div>
  );
}
