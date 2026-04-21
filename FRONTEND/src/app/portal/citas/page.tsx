import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import {
  Button,
  Chip,
  EmptyState,
  PageHeader,
  SurfaceCard,
} from '@/components/portal-shell/ui';
import { CitaCancelButton } from '@/components/citas/CitaCancelButton';
import { createServerClient } from '@/lib/supabase/server';

export const metadata = { title: 'Mis citas | Portal Paciente' };
export const dynamic = 'force-dynamic';

interface CitaRow {
  id: string;
  inicio: string;
  fin: string;
  estado: string;
  servicio_nombre: string;
}

function toneForEstado(estado: string): 'positive' | 'critical' | 'info' | 'neutral' {
  if (estado === 'confirmada') return 'positive';
  if (estado === 'cancelada') return 'critical';
  if (estado === 'completada') return 'info';
  return 'neutral';
}

export default async function PortalCitasPage() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const now = new Date().toISOString();

  const [{ data: futurasRaw }, { data: pasadasRaw }] = await Promise.all([
    supabase
      .from('v_citas_expandidas')
      .select('id, inicio, fin, estado, servicio_nombre')
      .eq('paciente_user_id', user.id)
      .gte('inicio', now)
      .order('inicio'),
    supabase
      .from('v_citas_expandidas')
      .select('id, inicio, fin, estado, servicio_nombre')
      .eq('paciente_user_id', user.id)
      .lt('inicio', now)
      .order('inicio', { ascending: false })
      .limit(10),
  ]);

  const futuras = (futurasRaw as CitaRow[] | null) ?? [];
  const pasadas = (pasadasRaw as CitaRow[] | null) ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Mis citas"
        title="Sesiones con Almudena"
        description="Revisa tus próximas citas, consulta el historial y reserva nuevas sesiones."
        actions={
          <Link href="/portal/citas/reservar">
            <Button variant="primary" icon="add">Reservar cita</Button>
          </Link>
        }
      />

      <section>
        <h2 className="mb-5 font-display text-[1.25rem] italic text-ink">Próximas</h2>
        {futuras.length === 0 ? (
          <EmptyState
            icon="event_busy"
            title="Sin citas programadas"
            description="Cuando reserves una cita, aparecerá aquí."
            action={
              <Link href="/portal/citas/reservar">
                <Button variant="primary" icon="add">Reservar ahora</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4">
            {futuras.map((c) => (
              <SurfaceCard key={c.id} className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex-shrink-0 text-center sm:w-24">
                  <p className="font-body text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">
                    {format(new Date(c.inicio), 'MMM', { locale: es })}
                  </p>
                  <p className="font-display text-[2rem] italic leading-none text-primary">
                    {format(new Date(c.inicio), 'dd')}
                  </p>
                  <p className="mt-1 font-body text-[0.75rem] text-ink-soft">
                    {format(new Date(c.inicio), 'HH:mm')}
                  </p>
                </div>

                <div className="h-12 w-px bg-ink/10 hidden sm:block" aria-hidden="true" />

                <div className="min-w-0 flex-1">
                  <p className="font-display text-[1.1rem] text-ink">{c.servicio_nombre}</p>
                  <p className="mt-1 font-body text-[0.8rem] text-ink-soft">
                    {format(new Date(c.inicio), "EEEE d 'de' MMMM", { locale: es })} ·{' '}
                    {Math.round((new Date(c.fin).getTime() - new Date(c.inicio).getTime()) / 60000)} min
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Chip tone={toneForEstado(c.estado)}>{c.estado}</Chip>
                  {c.estado === 'confirmada' || c.estado === 'bloqueo_temporal' ? (
                    <CitaCancelButton
                      citaId={c.id}
                      inicioISO={c.inicio}
                      servicioNombre={c.servicio_nombre}
                      compact
                    />
                  ) : null}
                </div>
              </SurfaceCard>
            ))}
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="mb-5 font-display text-[1.25rem] italic text-ink">Historial</h2>
        {pasadas.length === 0 ? (
          <p className="font-body text-[0.85rem] text-ink-muted">
            Todavía no hay sesiones pasadas.
          </p>
        ) : (
          <SurfaceCard className="p-0 overflow-hidden">
            <ul className="divide-y divide-ink/5">
              {pasadas.map((c) => (
                <li key={c.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="w-20 flex-shrink-0">
                    <p className="font-body text-[0.8rem] text-ink tabular-nums">
                      {format(new Date(c.inicio), 'd MMM', { locale: es })}
                    </p>
                    <p className="font-body text-[0.7rem] text-ink-muted">
                      {format(new Date(c.inicio), 'HH:mm')}
                    </p>
                  </div>
                  <p className="flex-1 font-body text-[0.85rem] text-ink-soft">
                    {c.servicio_nombre}
                  </p>
                  <Chip tone={toneForEstado(c.estado)}>{c.estado}</Chip>
                </li>
              ))}
            </ul>
          </SurfaceCard>
        )}
      </section>
    </>
  );
}
