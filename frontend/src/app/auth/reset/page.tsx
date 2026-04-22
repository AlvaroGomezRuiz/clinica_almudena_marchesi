import type { Metadata } from 'next';

import ResetPasswordForm from '@/components/auth/ResetPasswordForm';
import PremiumCard from '@/components/ui/PremiumCard';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Nueva contraseña | Almudena Marchesi',
  description: 'Elige una nueva contraseña para tu cuenta.',
  robots: { index: false, follow: false },
};

// Dinámico: lee cookies del usuario (sesión temporal creada por el callback de
// recovery). Si no hay sesión → redirige a /auth/forgot-password.
export const dynamic = 'force-dynamic';

export default async function ResetPasswordPage(): Promise<JSX.Element> {
  // Validamos que exista sesión de recovery antes de mostrar el formulario.
  // El callback de Supabase crea una sesión efímera al intercambiar el code.
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/forgot-password?expired=1');
  }

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6 md:p-12">
      <PremiumCard tilt={false} className="w-full max-w-md mx-auto">
        <div className="p-8 md:p-12">
          <div className="mb-10">
            <h1 className="font-display text-[2.25rem] text-ink italic mb-2 text-balance leading-tight">
              Nueva contraseña
            </h1>
            <p className="font-display text-[1.05rem] text-ink-soft leading-relaxed">
              Elige una contraseña robusta. Se cerrarán todas tus sesiones abiertas.
            </p>
          </div>

          <ResetPasswordForm email={user.email ?? ''} />
        </div>
      </PremiumCard>
    </div>
  );
}
