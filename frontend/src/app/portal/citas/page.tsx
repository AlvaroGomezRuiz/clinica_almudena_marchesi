import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

import { CitaCancelButton } from '@/components/citas/CitaCancelButton';
import CitaNotasEditor, {
  type CitaNotaItem,
} from '@/components/portal/CitaNotasEditor';
import CountdownCita from '@/components/portal/CountdownCita';
import {
  Button,
  Chip,
  EmptyState,
  PageHeader,
  SectionDivider,
  SurfaceCard,
} from '@/components/portal-shell/ui';
import { createServerClient } from '@/lib/supabase/server';

export const metadata = { title: 'Mis citas | Portal Paciente' };
export const dynamic = 'force-dynamic';

interface CitaRow {
  readonly id: string;
  readonly inicio: string;
  readonly fin: string;
  readonly estado: string;
  readonly servicio_nombre: string;
  readonly precio_centimos: number;
  readonly paciente_id: string;
}

interface PagoRow {
  readonly id: string;
  readonly cita_id: string | null;
  readonly bono_id: string | null;
  readonly stripe_session_id: string | null;
  readonly estado: string;
  readonly importe_centimos: number;
  readonly fecha_pago: string;
}

interface NotaRow {
  readonly id: string;
  readonly cita_id: string;
  readonly contenido: string | null;
  readonly updated_at: string;
}

function toneForEstado(
  estado: string
): 'positive' | 'critical' | 'info' | 'neutral' | 'warning' {
  if (estado === 'confirmada') return 'positive';
  if (estado === 'cancelada') return 'critical';
  if (estado === 'completada') return 'info';
  if (estado === 'no_asistida') return 'warning';
  return 'neutral';
}

function formatImporte(centimos: number): string {
  return (centimos / 100).toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  });
}

function derivarMetodoPago(
  pago: PagoRow | undefined,
  estadoCita: string
): { label: string; tone: 'positive' | 'info' | 'warning' | 'neutral' } {
  if (!pago) {
    if (estadoCita === 'cancelada') return { label: 'Cancelada', tone: 'neutral' };
    return { label: 'Pendiente', tone: 'warning' };
  }
  if (pago.estado !== 'pagado') {
    return { label: `Pago ${pago.estado}`, tone: 'warning' };
  }
  if (pago.bono_id) return { label: 'Cubierta por bono', tone: 'info' };
  if (pago.stripe_session_id) return { label: 'Pagada · tarjeta', tone: 'positive' };
  return { label: 'Pagada', tone: 'positive' };
}

export default async function PortalCitasPage(): Promise<JSX.Element | null> {
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

  const now = new Date().toISOString();

  const [{ data: futurasRaw }, { data: pasadasRaw }] = await Promise.all([
    supabase
      .from('v_citas_expandidas')
      .select('id, paciente_id, inicio, fin, estado, servicio_nombre, precio_centimos')
      .eq('paciente_user_id', user.id)
      .gte('inicio', now)
      .order('inicio'),
    supabase
      .from('v_citas_expandidas')
      .select('id, paciente_id, inicio, fin, estado, servicio_nombre, precio_centimos')
      .eq('paciente_user_id', user.id)
      .lt('inicio', now)
      .order('inicio', { ascending: false })
      .limit(12),
  ]);

  const futuras = (futurasRaw as readonly CitaRow[] | null) ?? [];
  const pasadas = (pasadasRaw as readonly CitaRow[] | null) ?? [];
  const allCitaIds = [...futuras, ...pasadas].map((c) => c.id);

  const [{ data: pagosRaw }, { data: notasRaw }] = await Promise.all([
    allCitaIds.length > 0
      ? supabase
          .from('pagos')
          .select('id, cita_id, bono_id, stripe_session_id, estado, importe_centimos, fecha_pago')
          .in('cita_id', allCitaIds)
      : Promise.resolve({ data: [] as readonly PagoRow[] }),
    pacienteId && allCitaIds.length > 0
      ? supabase
          .from('citas_notas_paciente')
          .select('id, cita_id, contenido, updated_at')
          .eq('paciente_id', pacienteId)
          .eq('activo', true)
          .in('cita_id', allCitaIds)
          .order('updated_at', { ascending: false })
      : Promise.resolve({ data: [] as readonly NotaRow[] }),
  ]);

  const pagoPorCita = new Map<string, PagoRow>();
  for (const p of (pagosRaw ?? []) as readonly PagoRow[]) {
    if (p.cita_id) pagoPorCita.set(p.cita_id, p);
  }

  const notasPorCita = new Map<string, CitaNotaItem[]>();
  for (const n of (notasRaw ?? []) as readonly NotaRow[]) {
    if (!n.contenido) continue;
    const arr = notasPorCita.get(n.cita_id) ?? [];
    arr.push({
      id: n.id,
      contenido: n.contenido,
      updated_at: n.updated_at,
    });
    notasPorCita.set(n.cita_id, arr);
  }

  const renderCita = (c: CitaRow, isFuture: boolean): JSX.Element => {
    const pago = pagoPorCita.get(c.id);
    const metodo = derivarMetodoPago(pago, c.estado);
    const notas = notasPorCita.get(c.id) ?? [];
    const duracion = Math.round(
      (new Date(c.fin).getTime() - new Date(c.inicio).getTime()) / 60000
    );

    return (
      <SurfaceCard
        key={c.id}
        className="space-y-4"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex-shrink-0 text-center sm:w-24">
            <p className="font-body text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted dark:text-white/55">
              {format(new Date(c.inicio), 'MMM', { locale: es })}
            </p>
            <p className="font-display text-[2rem] italic leading-none text-primary">
              {format(new Date(c.inicio), 'dd')}
            </p>
            <p className="mt-1 font-body text-[0.75rem] text-ink-soft tabular-nums dark:text-white/65">
              {format(new Date(c.inicio), 'HH:mm')}
            </p>
          </div>

          <div
            className="hidden h-14 w-px bg-ink/10 sm:block dark:bg-white/10"
            aria-hidden="true"
          />

          <div className="min-w-0 flex-1">
            <p className="font-display text-[1.1rem] italic text-ink dark:text-white">
              {c.servicio_nombre}
            </p>
            <p className="mt-1 font-body text-[0.8rem] text-ink-soft dark:text-white/60">
              {format(new Date(c.inicio), "EEEE d 'de' MMMM", { locale: es })} · {duracion} min
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Chip tone={toneForEstado(c.estado)}>{c.estado}</Chip>
              <Chip tone={metodo.tone}>{metodo.label}</Chip>
              <span className="font-display text-[0.95rem] italic text-ink dark:text-white tabular-nums">
                {formatImporte(c.precio_centimos)}
              </span>
              {isFuture && c.estado === 'confirmada' ? (
                <CountdownCita target={c.inicio} />
              ) : (
                <span className="font-body text-[0.72rem] text-ink-muted dark:text-white/55">
                  {formatDistanceToNow(new Date(c.inicio), { locale: es, addSuffix: true })}
                </span>
              )}
            </div>
          </div>

          {isFuture && (c.estado === 'confirmada' || c.estado === 'bloqueo_temporal') ? (
            <CitaCancelButton
              citaId={c.id}
              inicioISO={c.inicio}
              servicioNombre={c.servicio_nombre}
              compact
            />
          ) : null}
        </div>

        <div className="rounded-2xl bg-white/40 p-4 ring-1 ring-inset ring-ink/5 dark:bg-white/[0.03] dark:ring-white/8">
          <h3 className="mb-2 font-display text-[0.9rem] italic text-ink dark:text-white">
            Mis notas
          </h3>
          <CitaNotasEditor citaId={c.id} notas={notas} />
        </div>
      </SurfaceCard>
    );
  };

  return (
    <>
      <PageHeader
        eyebrow="Mis citas"
        title="Sesiones con Almudena"
        description="Revisa tus próximas citas, consulta el historial y registra reflexiones privadas."
        actions={
          <Link href="/portal/citas/reservar">
            <Button variant="primary" icon="add">
              Reservar cita
            </Button>
          </Link>
        }
      />

      <section>
        <h2 className="mb-5 font-display text-[1.25rem] italic text-ink dark:text-white">
          Próximas
        </h2>
        {futuras.length === 0 ? (
          <EmptyState
            icon="event_busy"
            title="Sin citas programadas"
            description="Cuando reserves una cita, aparecerá aquí."
            action={
              <Link href="/portal/citas/reservar">
                <Button variant="primary" icon="add">
                  Reservar ahora
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4">{futuras.map((c) => renderCita(c, true))}</div>
        )}
      </section>

      <SectionDivider label="Historial" />

      <section>
        {pasadas.length === 0 ? (
          <p className="font-body text-[0.85rem] text-ink-muted dark:text-white/55">
            Todavía no hay sesiones pasadas.
          </p>
        ) : (
          <div className="grid gap-4">{pasadas.map((c) => renderCita(c, false))}</div>
        )}
      </section>
    </>
  );
}
