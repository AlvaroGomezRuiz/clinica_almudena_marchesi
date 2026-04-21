import { addDays, endOfDay, format, startOfDay, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';

import {
  Button,
  Chip,
  PageHeader,
  SurfaceCard,
} from '@/components/portal-shell/ui';
import { CitaCancelButton } from '@/components/citas/CitaCancelButton';
import { createServerClient } from '@/lib/supabase/server';

export const metadata = { title: 'Agenda | Panel Almudena' };
export const dynamic = 'force-dynamic';

interface CitaRow {
  id: string;
  inicio: string;
  fin: string;
  estado: string;
  servicio_nombre: string;
  paciente_user_id: string | null;
}

interface BloqueoRow {
  id: string;
  inicio: string;
  fin: string;
  motivo: string | null;
}

const DIAS_VISTA = 7;

export default async function AdminAgendaPage() {
  const supabase = createServerClient();
  const today = startOfDay(new Date());
  const rangeEnd = endOfDay(addDays(today, DIAS_VISTA - 1));

  const [{ data: citasRaw }, { data: bloqueosRaw }] = await Promise.all([
    supabase
      .from('v_citas_expandidas')
      .select('id, inicio, fin, estado, servicio_nombre, paciente_user_id')
      .gte('inicio', today.toISOString())
      .lte('inicio', rangeEnd.toISOString())
      .neq('estado', 'cancelada')
      .order('inicio'),
    supabase
      .from('agenda_bloqueos')
      .select('id, inicio, fin, motivo')
      .eq('activo', true)
      .gte('fin', today.toISOString())
      .order('inicio'),
  ]);

  const citas = (citasRaw as CitaRow[] | null) ?? [];
  const bloqueos = (bloqueosRaw as BloqueoRow[] | null) ?? [];

  // Agrupar citas por día
  const dias = Array.from({ length: DIAS_VISTA }, (_, idx) => {
    const dia = addDays(today, idx);
    const iniDia = startOfDay(dia).getTime();
    const finDia = endOfDay(dia).getTime();
    const citasDia = citas.filter((c) => {
      const t = new Date(c.inicio).getTime();
      return t >= iniDia && t <= finDia;
    });
    const bloqueosDia = bloqueos.filter((b) => {
      const ini = new Date(b.inicio).getTime();
      const fin = new Date(b.fin).getTime();
      return ini <= finDia && fin >= iniDia;
    });
    return { dia, citasDia, bloqueosDia };
  });

  return (
    <>
      <PageHeader
        eyebrow={`Semana del ${format(startOfWeek(today, { weekStartsOn: 1 }), "d 'de' MMMM", { locale: es })}`}
        title="Agenda"
        description="Vista de los próximos 7 días. Sincronizada con pagos y bloqueos."
        actions={
          <>
            <Button variant="surface" icon="event_busy">Nuevo bloqueo</Button>
            <Button variant="primary" icon="add">Nueva cita</Button>
          </>
        }
      />

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-4">
          {dias.map(({ dia, citasDia, bloqueosDia }) => (
            <SurfaceCard key={dia.toISOString()}>
              <header className="mb-4 flex items-baseline justify-between">
                <div>
                  <p className="font-display text-[1.05rem] italic text-ink">
                    {format(dia, "EEEE d 'de' MMMM", { locale: es })}
                  </p>
                  <p className="font-body text-[0.75rem] text-ink-muted">
                    {citasDia.length} cita{citasDia.length === 1 ? '' : 's'}
                    {bloqueosDia.length > 0 ? ` · ${bloqueosDia.length} bloqueo${bloqueosDia.length === 1 ? '' : 's'}` : ''}
                  </p>
                </div>
                <Chip tone={citasDia.length > 0 ? 'positive' : 'neutral'}>
                  {citasDia.length > 0 ? 'Activa' : 'Disponible'}
                </Chip>
              </header>

              {citasDia.length === 0 && bloqueosDia.length === 0 ? (
                <p className="py-2 font-body text-[0.85rem] text-ink-soft">
                  Sin citas ni bloqueos. Hueco libre.
                </p>
              ) : (
                <ul className="divide-y divide-ink/5">
                  {[...citasDia, ...bloqueosDia.map((b) => ({ ...b, _bloqueo: true }))]
                    .sort(
                      (a, b) =>
                        new Date(a.inicio).getTime() - new Date(b.inicio).getTime()
                    )
                    .map((item) => {
                      const isBloqueo = '_bloqueo' in item;
                      return (
                        <li key={item.id} className="flex items-center gap-4 py-3">
                          <span className="w-14 font-body text-[0.85rem] font-medium text-ink tabular-nums">
                            {format(new Date(item.inicio), 'HH:mm')}
                          </span>
                          <span className="h-8 w-px bg-ink/10" aria-hidden="true" />
                          <span className="flex-1 font-body text-[0.9rem] text-ink-soft">
                            {isBloqueo
                              ? (item as BloqueoRow).motivo ?? 'Bloqueo'
                              : (item as CitaRow).servicio_nombre}
                          </span>
                          <Chip tone={isBloqueo ? 'warning' : 'positive'}>
                            {isBloqueo ? 'Bloqueo' : (item as CitaRow).estado}
                          </Chip>
                          {!isBloqueo && (item as CitaRow).estado !== 'completada' ? (
                            <CitaCancelButton
                              citaId={(item as CitaRow).id}
                              inicioISO={(item as CitaRow).inicio}
                              servicioNombre={(item as CitaRow).servicio_nombre}
                              isAdmin
                              compact
                            />
                          ) : null}
                        </li>
                      );
                    })}
                </ul>
              )}
            </SurfaceCard>
          ))}
        </div>

        {/* Sidebar: bloqueos activos */}
        <aside>
          <SurfaceCard>
            <h3 className="font-display text-[1.15rem] italic text-ink mb-1">
              Bloqueos activos
            </h3>
            <p className="font-body text-[0.75rem] text-ink-muted mb-4">
              Vacaciones, pausas, asuntos personales
            </p>

            {bloqueos.length === 0 ? (
              <p className="py-4 font-body text-[0.85rem] text-ink-soft text-center">
                Sin bloqueos programados
              </p>
            ) : (
              <ul className="space-y-3">
                {bloqueos.slice(0, 8).map((b) => (
                  <li key={b.id} className="rounded-2xl bg-white/40 p-3">
                    <p className="font-body text-[0.85rem] font-medium text-ink">
                      {b.motivo ?? 'Bloqueo'}
                    </p>
                    <p className="mt-1 font-body text-[0.72rem] text-ink-muted">
                      {format(new Date(b.inicio), "d MMM HH:mm", { locale: es })}
                      {' → '}
                      {format(new Date(b.fin), "d MMM HH:mm", { locale: es })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </SurfaceCard>
        </aside>
      </section>
    </>
  );
}
