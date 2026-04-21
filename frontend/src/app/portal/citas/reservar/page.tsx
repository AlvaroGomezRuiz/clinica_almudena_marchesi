import Link from 'next/link';

import SlotPicker, { type ServicioOption } from '@/components/booking/SlotPicker';
import { PageHeader, SurfaceCard } from '@/components/portal-shell/ui';
import { createServerClient } from '@/lib/supabase/server';

export const metadata = { title: 'Reservar | Portal Paciente' };
export const dynamic = 'force-dynamic';

interface PageProps {
  readonly searchParams?: { readonly servicio?: string };
}

interface BonoPacienteLite {
  id: string;
  sesiones_totales: number;
  sesiones_consumidas: number;
  estado: string;
}

export default async function ReservarPage({ searchParams }: PageProps) {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: servicios }, { data: bonos }] = await Promise.all([
    supabase
      .from('servicios')
      .select('id, nombre, duracion_minutos, precio_centimos, descripcion')
      .eq('activo', true)
      .order('precio_centimos', { ascending: false })
      .returns<ServicioOption[]>(),
    supabase
      .from('bonos_pacientes')
      .select('id, sesiones_totales, sesiones_consumidas, estado')
      .eq('estado', 'activo')
      .limit(10)
      .returns<BonoPacienteLite[]>(),
  ]);

  const serviciosList = servicios ?? [];

  const tieneBono =
    (bonos ?? []).some(
      (b) =>
        typeof b.sesiones_totales === 'number' &&
        typeof b.sesiones_consumidas === 'number' &&
        b.sesiones_consumidas < b.sesiones_totales
    );

  if (serviciosList.length === 0) {
    return (
      <>
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
        description="Elige servicio, día y hora. Los huecos se calculan en vivo contra la agenda real."
      />

      <SlotPicker
        servicios={serviciosList}
        tieneBono={tieneBono}
        preseleccionadoId={searchParams?.servicio}
      />
    </>
  );
}
