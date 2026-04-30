import Link from 'next/link';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';

import AdminFab from '@/components/admin/AdminFab';
import QuickNotes from '@/components/admin/QuickNotes';
import {
  Button,
  Chip,
  EmptyState,
  PageHeader,
  SectionTitle,
  StatCard,
  SurfaceCard,
} from '@/components/portal-shell/ui';
import RealtimeRefresh from '@/components/realtime/RealtimeRefresh';
import { primerNombre, saludoDiurnoEs } from '@/lib/greeting-es';
import { getPreferredProfileFullName } from '@/lib/profile-display-name';
import { CLINIC_PUBLIC_SITE_HOST_LABEL } from '@/lib/clinic';
import { createServerClient } from '@/lib/supabase/server';

export const metadata = { title: `Inicio | ${CLINIC_PUBLIC_SITE_HOST_LABEL}` };
export const dynamic = 'force-dynamic';

interface CitaHoyRow {
  id: string;
  inicio: string;
  fin: string;
  estado: string;
  servicio_nombre: string;
  paciente_user_id: string | null;
}

interface PagoRecienteRow {
  id: string;
  importe_centimos: number;
  moneda: string;
  estado: string;
  fecha_pago: string;
}

interface MensajesNoLeidosRow {
  unread_admin: number;
}

function euro(centimos: number): string {
  return (centimos / 100).toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });
}

export default async function AdminInicioPage() {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const now = new Date();
  const hoyStart = startOfDay(now).toISOString();
  const hoyEnd = endOfDay(now).toISOString();
  const semanaStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
  const semanaEnd = endOfWeek(now, { weekStartsOn: 1 }).toISOString();

  // --- Queries paralelas ---
  const [
    { data: adminProfile },
    { count: pacientesActivos },
    { data: citasHoy, count: citasHoyCount },
    { data: pagosMes },
    { data: conversaciones },
    { count: citasSemanaCount },
    { data: bonosAlerta },
    { data: rgpdPendientes },
    { data: notaGlobal },
  ] = await Promise.all([
    user?.id
      ? supabase
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .maybeSingle<{ display_name: string | null }>()
      : Promise.resolve({ data: null as { display_name: string | null } | null }),
    supabase
      .from('pacientes')
      .select('id', { count: 'exact', head: true })
      .eq('activo', true),
    supabase
      .from('v_citas_expandidas')
      .select('id, inicio, fin, estado, servicio_nombre, paciente_user_id', { count: 'exact' })
      .gte('inicio', hoyStart)
      .lte('inicio', hoyEnd)
      .in('estado', ['confirmada', 'bloqueo_temporal'])
      .order('inicio'),
    supabase
      .from('pagos')
      .select('id, importe_centimos, moneda, estado, fecha_pago')
      .gte('fecha_pago', startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)).toISOString())
      .eq('estado', 'completado')
      .order('fecha_pago', { ascending: false })
      .limit(10),
    supabase
      .from('conversaciones')
      .select('unread_admin')
      .gt('unread_admin', 0),
    supabase
      .from('citas')
      .select('id', { count: 'exact', head: true })
      .gte('inicio', semanaStart)
      .lte('inicio', semanaEnd)
      .in('estado', ['confirmada', 'completada']),
    supabase
      .from('bonos_pacientes')
      .select('id, paciente_id, sesiones_totales, sesiones_consumidas, fecha_expiracion')
      .eq('estado', 'activo')
      .eq('activo', true)
      .order('sesiones_consumidas', { ascending: false })
      .limit(20),
    supabase
      .from('rgpd_requests')
      .select('id, tipo, estado, created_at, fecha_limite, user_id')
      .in('estado', ['pendiente', 'en_revision'])
      .order('created_at', { ascending: true })
      .limit(10),
    supabase
      .from('facturacion_nota')
      .select('nota')
      .eq('id', 1)
      .maybeSingle<{ nota: string }>(),
  ]);

  const pagosMesList = (pagosMes as PagoRecienteRow[] | null) ?? [];

  const mensajesNoLeidos = (conversaciones as MensajesNoLeidosRow[] | null)?.reduce(
    (acc, c) => acc + (c.unread_admin || 0),
    0
  ) ?? 0;

  const ingresoMes = pagosMesList.reduce(
    (acc, p) => acc + p.importe_centimos,
    0
  ) ?? 0;

  // Bonos con <= 2 sesiones restantes o expirando en <= 14 días
  type BonoAlertaRow = {
    id: string;
    paciente_id: string;
    sesiones_totales: number;
    sesiones_consumidas: number;
    fecha_expiracion: string | null;
  };
  const bonosList = (bonosAlerta as BonoAlertaRow[] | null) ?? [];
  const hoy = new Date();
  const alertasBonos = bonosList
    .map((b) => ({
      ...b,
      restantes: b.sesiones_totales - b.sesiones_consumidas,
      diasRestantes: b.fecha_expiracion
        ? Math.floor((new Date(b.fecha_expiracion).getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
        : null,
    }))
    .filter((b) => b.restantes <= 2 || (b.diasRestantes !== null && b.diasRestantes <= 14));

  type RgpdPendienteRow = {
    id: string;
    tipo: string;
    estado: string;
    created_at: string;
    fecha_limite: string;
    user_id: string;
  };
  const rgpdList = (rgpdPendientes as RgpdPendienteRow[] | null) ?? [];
  const notaInicial = notaGlobal?.nota ?? '';
  const metaFull =
    typeof user?.user_metadata?.full_name === 'string'
      ? user.user_metadata.full_name
      : undefined;
  const preferredAdmin = getPreferredProfileFullName(
    adminProfile?.display_name,
    metaFull
  );
  const nombreCabecera =
    preferredAdmin.length > 0
      ? primerNombre(preferredAdmin, 'Almudena')
      : 'Almudena';
  const tituloSaludo = `${saludoDiurnoEs(now)}, ${nombreCabecera}.`;

  return (
    <>
      <RealtimeRefresh
        channelName="admin-inicio"
        tables={['citas', 'pagos', 'conversaciones']}
      />
      <div className="portal-rise">
        <PageHeader
          eyebrow={format(now, "EEEE d 'de' MMMM", { locale: es })}
          title={tituloSaludo}
          description="Panorámica editorial de tu consulta. Cada métrica se actualiza en tiempo real vía Supabase Realtime."
          actions={
            <Link href="/admin/agenda">
              <Button variant="primary" icon="arrow_outward">Agenda completa</Button>
            </Link>
          }
        />
      </div>

      {/* ─── Bento asimétrico de métricas ─── */}
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 portal-rise portal-rise-delay-1">
        <StatCard
          label="Pacientes activos"
          value={pacientesActivos ?? 0}
          icon="diversity_3"
          footnote="Últimos 12 meses"
        />
        <StatCard
          label="Citas hoy"
          value={citasHoyCount ?? 0}
          icon="event_available"
          footnote={`${citasSemanaCount ?? 0} esta semana`}
        />
        <StatCard
          label="Ingresos del mes"
          value={euro(ingresoMes)}
          icon="savings"
          delta={
            pagosMesList.length > 0
              ? { value: `${pagosMesList.length} pagos`, trend: 'up' }
              : undefined
          }
        />
        <StatCard
          label="Mensajes sin leer"
          value={mensajesNoLeidos}
          icon="mark_email_unread"
          footnote={mensajesNoLeidos === 0 ? 'Todo al día' : 'Requiere atención'}
        />
      </section>

      {/* ─── Agenda de hoy (tarjetas editorial) ─── */}
      <section className="mt-16 portal-rise portal-rise-delay-2">
        <SectionTitle
          kicker="Hoy"
          title="Sesiones programadas"
          action={
            <Link
              href="/admin/agenda"
              className="group inline-flex items-center gap-1.5 font-body text-[0.82rem] text-ink-soft hover:text-primary transition-colors"
            >
              <span>Ver calendario</span>
              <span className="material-symbols-outlined text-[1rem] transition-transform duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5" aria-hidden="true">
                arrow_outward
              </span>
            </Link>
          }
        />

        {!citasHoy || citasHoy.length === 0 ? (
          <EmptyState
            icon="self_improvement"
            title="Un día para ti"
            description="No hay sesiones programadas. Aprovecha para anotaciones clínicas o descanso activo."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {(citasHoy as CitaHoyRow[]).map((cita, idx) => {
              const inicio = new Date(cita.inicio);
              const fin = new Date(cita.fin);
              const durationMin = Math.round((fin.getTime() - inicio.getTime()) / 60000);
              return (
                <li key={cita.id}>
                  <SurfaceCard
                    interactive
                    className="flex items-center gap-6"
                    glow={idx === 0 ? 'sage' : 'none'}
                  >
                    {/* Columna hora — massive editorial */}
                    <div className="flex-shrink-0">
                      <p className="font-display text-[2rem] italic text-primary leading-none tabular-nums tracking-[-0.02em]">
                        {format(inicio, 'HH:mm')}
                      </p>
                      <p className="mt-1.5 font-body text-[0.62rem] uppercase tracking-[0.2em] text-ink-muted tabular-nums">
                        {durationMin} min · {format(fin, 'HH:mm')}
                      </p>
                    </div>

                    {/* Hairline gradient en lugar de border plano */}
                    <span
                      aria-hidden="true"
                      className="h-14 w-px bg-gradient-to-b from-transparent via-ink/15 to-transparent"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="font-display text-[1.1rem] text-ink tracking-[-0.01em]">
                        {cita.servicio_nombre}
                      </p>
                      <p className="mt-1 font-body text-[0.8rem] text-ink-soft">
                        {cita.estado === 'confirmada' ? 'Paciente confirmado · Recordatorio enviado' : 'Pre-reserva en curso'}
                      </p>
                    </div>

                    <Chip tone={cita.estado === 'confirmada' ? 'positive' : 'warning'}>
                      {cita.estado === 'confirmada' ? 'Confirmada' : 'Pre-reserva'}
                    </Chip>
                  </SurfaceCard>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ─── Split editorial: pagos + mensajes ─── */}
      <section className="mt-16 grid gap-6 lg:grid-cols-[1.35fr_1fr] portal-rise portal-rise-delay-3">
        <SurfaceCard>
          <header className="mb-6 flex items-end justify-between">
            <div>
              <p className="font-body text-[0.62rem] uppercase tracking-[0.22em] text-ink-muted">
                Flujo financiero
              </p>
              <h3 className="mt-2 font-display text-[1.375rem] italic text-ink leading-none tracking-[-0.01em]">
                Últimos pagos del mes
              </h3>
            </div>
            <Chip tone="positive">{pagosMesList.length} registros</Chip>
          </header>

          {pagosMesList.length === 0 ? (
            <p className="font-body text-[0.88rem] text-ink-soft py-6 text-center">
              Sin pagos registrados este mes todavía.
            </p>
          ) : (
            <ul className="-mx-2">
              {pagosMesList.slice(0, 5).map((pago, i) => (
                <li
                  key={pago.id}
                  className="group flex items-center justify-between gap-4 rounded-2xl px-2 py-3 transition-colors duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:bg-white/40"
                  style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(28,28,25,0.06)' }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-primary/10 ring-1 ring-inset ring-primary/15">
                      <span className="material-symbols-outlined text-[1.05rem] text-primary" aria-hidden="true">
                        arrow_downward
                      </span>
                    </span>
                    <div className="min-w-0">
                      <p className="font-display text-[1.05rem] text-ink tabular-nums tracking-[-0.01em]">
                        {euro(pago.importe_centimos)}
                      </p>
                      <p className="mt-0.5 font-body text-[0.72rem] text-ink-muted">
                        {format(new Date(pago.fecha_pago), "d MMM · HH:mm", { locale: es })}
                      </p>
                    </div>
                  </div>
                  <Chip tone="positive">Completado</Chip>
                </li>
              ))}
            </ul>
          )}

          <footer className="mt-6 flex justify-end">
            <Link href="/admin/facturacion">
              <Button variant="ghost" size="sm" icon="arrow_outward">Ver facturación</Button>
            </Link>
          </footer>
        </SurfaceCard>

        <SurfaceCard variant="hero" glow={mensajesNoLeidos > 0 ? 'sage' : 'none'}>
          <p className="font-body text-[0.62rem] uppercase tracking-[0.22em] text-ink-muted">
            Buzón clínico
          </p>
          <h3 className="mt-3 font-display text-[clamp(2rem,3vw,2.625rem)] italic text-ink leading-[0.98] tracking-[-0.02em] text-balance">
            {mensajesNoLeidos === 0
              ? 'Bandeja al día.'
              : `${mensajesNoLeidos} ${mensajesNoLeidos === 1 ? 'mensaje' : 'mensajes'} por leer.`}
          </h3>
          <p className="mt-4 max-w-[30ch] font-body text-[0.9rem] leading-[1.6] text-ink-soft">
            {mensajesNoLeidos === 0
              ? 'No hay conversaciones pendientes con pacientes. Todo resuelto.'
              : 'Revisa las conversaciones para mantener la continuidad clínica.'}
          </p>
          <div className="mt-7">
            <Link href="/admin/mensajes">
              <Button variant={mensajesNoLeidos > 0 ? 'primary' : 'surface'} icon="forum">
                {mensajesNoLeidos > 0 ? 'Abrir bandeja' : 'Ver historial'}
              </Button>
            </Link>
          </div>
        </SurfaceCard>
      </section>

      {/* ─── Alertas operativas + notas rápidas ─── */}
      <section className="mt-16 grid gap-6 lg:grid-cols-[1.35fr_1fr] portal-rise portal-rise-delay-3">
        <SurfaceCard>
          <header className="mb-6 flex items-end justify-between">
            <div>
              <p className="font-body text-[0.62rem] uppercase tracking-[0.22em] text-ink-muted">
                Alertas operativas
              </p>
              <h3 className="mt-2 font-display text-[1.375rem] italic text-ink leading-none tracking-[-0.01em]">
                Bonos por agotar · RGPD pendiente
              </h3>
            </div>
            <Chip tone={alertasBonos.length + rgpdList.length > 0 ? 'warning' : 'positive'}>
              {alertasBonos.length + rgpdList.length} eventos
            </Chip>
          </header>

          {alertasBonos.length === 0 && rgpdList.length === 0 ? (
            <p className="font-body text-[0.88rem] text-ink-soft py-6 text-center">
              Sin alertas. Todo bajo control.
            </p>
          ) : (
            <ul className="-mx-2 divide-y divide-ink/5 dark:divide-white/5">
              {alertasBonos.slice(0, 5).map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-4 px-2 py-3">
                  <div className="min-w-0">
                    <p className="font-display text-[1rem] text-ink tabular-nums tracking-[-0.01em]">
                      Bono · {b.restantes} {b.restantes === 1 ? 'sesión restante' : 'sesiones restantes'}
                    </p>
                    <p className="mt-0.5 font-body text-[0.72rem] text-ink-muted">
                      {b.diasRestantes !== null
                        ? `Expira en ${b.diasRestantes} ${b.diasRestantes === 1 ? 'día' : 'días'}`
                        : 'Sin fecha de expiración'}
                    </p>
                  </div>
                  <Link href={`/admin/pacientes/${b.paciente_id}`}>
                    <Button variant="ghost" size="sm" icon="arrow_outward">
                      Paciente
                    </Button>
                  </Link>
                </li>
              ))}
              {rgpdList.slice(0, 5).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-4 px-2 py-3">
                  <div className="min-w-0">
                    <p className="font-display text-[1rem] text-ink tracking-[-0.01em] capitalize">
                      RGPD · {r.tipo.replace(/_/g, ' ')}
                    </p>
                    <p className="mt-0.5 font-body text-[0.72rem] text-ink-muted">
                      Límite: {format(new Date(r.fecha_limite), "d MMM yyyy", { locale: es })} · Estado: {r.estado}
                    </p>
                  </div>
                  <Link href="/admin/configuracion">
                    <Button variant="ghost" size="sm" icon="privacy_tip">
                      Gestionar
                    </Button>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SurfaceCard>

        <SurfaceCard>
          <QuickNotes initial={notaInicial} />
        </SurfaceCard>
      </section>

      <AdminFab />
    </>
  );
}
