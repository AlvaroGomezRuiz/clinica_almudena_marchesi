import { addMonths, endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

import AgendaClient, {
  type AplicacionRow,
  type BloqueoRow,
  type CitaRow,
  type PlantillaRow,
} from '@/components/admin/agenda/AgendaClient';
import { PageHeader } from '@/components/portal-shell/ui';
import RealtimeRefresh from '@/components/realtime/RealtimeRefresh';
import { createServerClient } from '@/lib/supabase/server';
import { CLINIC_PUBLIC_SITE_HOST_LABEL } from '@/lib/clinic';

export const metadata = { title: `Agenda | ${CLINIC_PUBLIC_SITE_HOST_LABEL}` };
export const dynamic = 'force-dynamic';

interface AdminAgendaPageProps {
  readonly searchParams: Promise<{
    d?: string;
    vista?: 'dia' | 'semana' | 'mes';
  }>;
}

function parseFecha(d: string | undefined): Date {
  if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const parsed = new Date(`${d}T12:00:00`);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

function parseVista(v: string | undefined): 'dia' | 'semana' | 'mes' {
  if (v === 'dia' || v === 'semana' || v === 'mes') return v;
  return 'semana';
}

export default async function AdminAgendaPage({
  searchParams,
}: AdminAgendaPageProps): Promise<JSX.Element> {
  const sp = await searchParams;
  const fechaAncla = parseFecha(sp.d);
  const vista = parseVista(sp.vista);

  // Rango amplio (mes anterior + mes actual + mes siguiente) para cubrir navegación local.
  const desde = startOfMonth(subMonths(fechaAncla, 1));
  const hasta = endOfMonth(addMonths(fechaAncla, 1));

  const supabase = createServerClient();

  const [
    { data: citasRaw },
    { data: bloqueosRaw },
    { data: plantillasRaw },
    { data: aplicacionesRaw },
  ] = await Promise.all([
    supabase
      .from('v_citas_expandidas')
      .select(
        'id, inicio, fin, estado, servicio_nombre, paciente_user_id, paciente_id, paciente_display_name, duracion_minutos, precio_centimos',
      )
      .gte('inicio', desde.toISOString())
      .lte('inicio', hasta.toISOString())
      .neq('estado', 'cancelada')
      /* Solo citas confirmadas u homologadas: ocultar reservas pendientes de pago en rejilla */
      .neq('estado', 'bloqueo_temporal')
      .order('inicio'),
    supabase
      .from('agenda_bloqueos')
      .select('id, inicio, fin, motivo, dia_completo')
      .eq('activo', true)
      .gte('fin', desde.toISOString())
      .lte('inicio', hasta.toISOString())
      .order('inicio'),
    supabase
      .from('horario_plantillas')
      .select('id, nombre, descripcion, color, bloquea_dia_completo')
      .eq('activo', true)
      .order('nombre'),
    supabase
      .from('agenda_plantilla_aplicaciones')
      .select('id, plantilla_id, fecha_desde, fecha_hasta, nota')
      .eq('activo', true)
      .gte('fecha_hasta', format(desde, 'yyyy-MM-dd'))
      .lte('fecha_desde', format(hasta, 'yyyy-MM-dd'))
      .order('fecha_desde'),
  ]);

  const citas = (citasRaw as CitaRow[] | null) ?? [];
  const bloqueos = (bloqueosRaw as BloqueoRow[] | null) ?? [];
  const plantillas = (plantillasRaw as PlantillaRow[] | null) ?? [];
  const aplicaciones = (aplicacionesRaw as AplicacionRow[] | null) ?? [];

  return (
    <>
      <RealtimeRefresh
        channelName="admin-agenda"
        tables={['citas', 'agenda_bloqueos', 'agenda_plantilla_aplicaciones']}
      />
      <PageHeader
        eyebrow={format(fechaAncla, "EEEE d 'de' MMMM yyyy", { locale: es })}
        title="Agenda"
        description="Navega por día, semana o mes. Aplica plantillas reutilizables y gestiona bloqueos en segundos."
      />

      <AgendaClient
        citas={citas}
        bloqueos={bloqueos}
        plantillas={plantillas}
        aplicaciones={aplicaciones}
        fechaISO={format(fechaAncla, 'yyyy-MM-dd')}
        vista={vista}
      />
    </>
  );
}
