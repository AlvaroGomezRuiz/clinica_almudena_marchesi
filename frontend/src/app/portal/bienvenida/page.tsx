import Link from 'next/link';
import { redirect } from 'next/navigation';

import PortalBienvenidaStepper from '@/components/portal/PortalBienvenidaStepper';
import { PageHeader, SurfaceCard } from '@/components/portal-shell/ui';
import { CLINIC_TARIFAS_SESION_RESUMEN } from '@/lib/clinic';
import { primerNombre } from '@/lib/greeting-es';
import { getPreferredProfileFullName } from '@/lib/profile-display-name';
import { createServerClient } from '@/lib/supabase/server';

export const metadata = { title: 'Bienvenida | Portal' };

export default async function PortalBienvenidaPage() {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    redirect('/login?reason=no_session');
  }

  const { data: prof } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .maybeSingle<{ display_name: string | null }>();

  const preferred = getPreferredProfileFullName(
    prof?.display_name,
    typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : undefined
  );
  const first =
    preferred.length > 0 ? primerNombre(preferred, preferred) : '';
  const title = first.length > 0 ? `Bienvenida, ${first}` : 'Bienvenida';

  return (
    <>
      <PageHeader
        eyebrow="Primeros pasos"
        title={title}
        description="Activa el portal con un pago completado, un bono en uso o una cita confirmada. Abajo, el recorrido sugerido; puedes empezar por comprar bono o por reservar (si aún no tienes bono, pagarás la sesión al confirmar)."
      />

      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <PortalBienvenidaStepper />

        <SurfaceCard>
          <ol className="list-decimal space-y-4 pl-5 font-body text-[0.88rem] leading-relaxed text-ink-soft dark:text-white/75">
            <li>
              <strong className="text-ink dark:text-white">Referencia de tarifas:</strong>{' '}
              {CLINIC_TARIFAS_SESION_RESUMEN}. <strong className="text-ink dark:text-white">Pago con Stripe</strong> en
              el portal: bonos en Bonos y pagos, o pago al confirmar cita (si no aplicas bono con sesión libre).
            </li>
            <li>
              <strong className="text-ink dark:text-white">Reservar cita</strong> elige servicio, día y hora; con bono
              con sesiones disponibles no verás un cobro extra por esa cita, salvo otras reglas (48 h, etc.) que verás en
              el flujo.
            </li>
            <li>
              <strong className="text-ink dark:text-white">Correo:</strong> tras un pago con tarjeta o método online, puedes recibir
              comprobante o factura según el flujo (ver Bonos y pagos o Ajustes).
            </li>
            <li>
              <strong className="text-ink dark:text-white">Luego de activar</strong> (pago, bono o cita) tendrás
              mensajes, recursos y ajustes en el menú, sin quedarte en esta pantalla.
            </li>
          </ol>
        </SurfaceCard>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href="/portal/pagos"
            className="group inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 font-display text-[0.84rem] font-medium text-on-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_28px_-10px_rgba(75,100,95,0.45)] transition hover:bg-primary-dim sm:w-auto dark:bg-primary-fixed dark:text-[#1C1C19] dark:hover:bg-primary-fixed-dim"
          >
            <span className="material-symbols-outlined text-[1rem]" aria-hidden="true">
              payments
            </span>
            Comprar bono o ver pagos
          </Link>
          <Link
            href="/portal/citas/reservar"
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-white/75 px-5 py-3 font-display text-[0.84rem] font-medium text-ink ring-1 ring-inset ring-white/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition hover:bg-white sm:w-auto dark:bg-white/[0.06] dark:text-white dark:ring-white/10 dark:hover:bg-white/[0.1]"
          >
            <span className="material-symbols-outlined text-[1rem]" aria-hidden="true">
              event_available
            </span>
            Ir a reservar cita
          </Link>
        </div>
      </div>
    </>
  );
}
