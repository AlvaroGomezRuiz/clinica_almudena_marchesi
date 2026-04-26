import Link from 'next/link';

import SlotPicker, { type ServicioOption } from '@/components/booking/SlotPicker';
import { PageHeader, SurfaceCard } from '@/components/portal-shell/ui';
import RealtimeRefresh from '@/components/realtime/RealtimeRefresh';
import { CLINIC_TARIFAS_SESION_RESUMEN } from '@/lib/clinic';
import { createServerClient } from '@/lib/supabase/server';
import type { BonoPaciente } from '@/lib/supabase/types';

export const metadata = { title: 'Reservar | Portal Paciente' };
export const dynamic = 'force-dynamic';

interface PageProps {
  readonly searchParams?: { readonly servicio?: string };
}

type BonoCobertura = Pick<
  BonoPaciente,
  'id' | 'servicio_id' | 'sesiones_totales' | 'sesiones_consumidas' | 'estado' | 'activo'
>;

export default async function ReservarPage({ searchParams }: PageProps) {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: pacRow } = await supabase
    .from('pacientes')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle<{ id: string }>();
  const pacienteId = pacRow?.id ?? null;

  const serviciosP = supabase
    .from('servicios')
    .select('id, nombre, duracion_minutos, precio_centimos, descripcion')
    .eq('activo', true)
    .order('precio_centimos', { ascending: false })
    .order('nombre', { ascending: true })
    .returns<ServicioOption[]>();

  let bonosP = supabase
    .from('bonos_pacientes')
    .select('id, servicio_id, sesiones_totales, sesiones_consumidas, estado, activo')
    .eq('estado', 'activo')
    .eq('activo', true);
  if (pacienteId) {
    bonosP = bonosP.eq('paciente_id', pacienteId);
  }
  const [{ data: servicios }, { data: bonos }] = await Promise.all([serviciosP, bonosP.returns<BonoCobertura[]>()]);

  const serviciosList = servicios ?? [];

  /** `servicio_id` con al menos una sesión libre en un bono activo (cada bono cuelga de un servicio concreto). */
  const servicioIdsCubiertoBono: string[] = Array.from(
    new Set(
      (bonos ?? [])
        .filter(
          (b) =>
            typeof b.sesiones_totales === 'number' &&
            typeof b.sesiones_consumidas === 'number' &&
            b.sesiones_consumidas < b.sesiones_totales
        )
        .map((b) => b.servicio_id)
    )
  );

  if (serviciosList.length === 0) {
    return (
      <>
        <RealtimeRefresh channelName="portal-reservar-agenda" tables={['agenda_bloqueos']} />
        <PageHeader
          eyebrow={
            <Link href="/portal/citas" className="hover:text-primary transition-colors">
              ← Volver a mis citas
            </Link>
          }
          title="Reservar nueva sesión"
          description="De momento no hay servicios publicados."
        />
        <SurfaceCard>
          <p className="font-body text-[0.95rem] text-ink-soft">
            Almudena aún no ha publicado servicios. Vuelve en unos minutos o escríbele por
            mensaje.
          </p>
        </SurfaceCard>
      </>
    );
  }

  return (
    <>
      <RealtimeRefresh channelName="portal-reservar-agenda" tables={['agenda_bloqueos']} />
      {pacienteId ? (
        <RealtimeRefresh
          channelName={`portal-reservar-citas-${pacienteId}`}
          tables={['citas']}
          filter={`paciente_id=eq.${pacienteId}`}
        />
      ) : null}
      <PageHeader
        eyebrow={
          <Link
            href="/portal/citas"
            className="group inline-flex items-center gap-1.5 hover:text-primary transition-colors"
          >
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-[0.85rem] transition-transform duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-x-0.5"
            >
              arrow_back
            </span>
            Mis citas
          </Link>
        }
        title="Reservar nueva sesión"
        description="Tres pasos: tipo de sesión, día y hora. Los huecos se sincronizan en tiempo real con la agenda."
      />

      <SurfaceCard className="mb-2 border-ink/6 dark:border-white/8">
        <p className="font-body text-[0.62rem] uppercase tracking-[0.18em] text-ink-muted dark:text-white/55">
          Antes de reservar
        </p>
        <ul className="mt-3 list-disc space-y-2.5 pl-5 font-body text-[0.84rem] leading-relaxed text-ink-soft dark:text-white/72">
          <li>
            <span className="font-medium text-ink dark:text-white/90">Con bono activo para esa modalidad</span>
            : el bono está ligado al tipo de servicio (p. ej. individual o pareja). No hay pago online; al
            confirmar la hora se descuenta <span className="whitespace-nowrap">1 sesión</span> y la
            cita queda confirmada. Si reservas otra modalidad sin bono, verás el importe.
          </li>
          <li>
            <span className="font-medium text-ink dark:text-white/90">Sin bono</span>: verás el importe del servicio
            elegido; tras aceptar la política de cancelación (48 h) el hueco se bloquea unos minutos para completar el
            pago con tarjeta o wallet.
          </li>
          <li>
            Referencia pública de tarifas:{' '}
            <span className="whitespace-nowrap font-medium text-ink dark:text-white/85">
              {CLINIC_TARIFAS_SESION_RESUMEN}
            </span>
            . Duración e importe definitivos son los del servicio que marques en el paso 1 (individual, pareja u otros
            publicados).
          </li>
        </ul>
      </SurfaceCard>

      <SlotPicker
        servicios={serviciosList}
        servicioIdsCubiertoBono={servicioIdsCubiertoBono}
        preseleccionadoId={searchParams?.servicio}
      />
    </>
  );
}
