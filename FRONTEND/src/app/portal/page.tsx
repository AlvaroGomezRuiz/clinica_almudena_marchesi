import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

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
import { createServerClient } from '@/lib/supabase/server';

export const metadata = { title: 'Inicio | Portal Paciente' };
export const dynamic = 'force-dynamic';

interface ProximaCita {
  id: string;
  inicio: string;
  fin: string;
  servicio_nombre: string;
  estado: string;
}

interface BonoRow {
  id: string;
  sesiones_totales: number;
  sesiones_consumidas: number;
  estado: 'activo' | 'agotado' | 'expirado' | 'cancelado';
  fecha_expiracion: string | null;
}

interface RecursoAsignado {
  id: string;
  assigned_at: string;
  recurso: { id: string; titulo: string; tipo: string } | null;
}

export default async function PortalInicioPage() {
  const supabase = createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null; // layout ya redirige, pero por tipado

  const now = new Date();

  // RLS filtra por paciente automáticamente (user_id = auth.uid()).
  // La RPC devuelve/crea la conversación del paciente actual.
  const [
    { data: proximaRaw },
    { data: bonoActivoRaw },
    { data: recursosRaw },
    { data: conversacionIdData },
  ] = await Promise.all([
    supabase
      .from('v_citas_expandidas')
      .select('id, inicio, fin, servicio_nombre, estado')
      .eq('paciente_user_id', user.id)
      .eq('estado', 'confirmada')
      .gte('inicio', now.toISOString())
      .order('inicio')
      .limit(1)
      .maybeSingle<ProximaCita>(),
    supabase
      .from('bonos_pacientes')
      .select(
        'id, sesiones_totales, sesiones_consumidas, estado, fecha_expiracion'
      )
      .eq('estado', 'activo')
      .order('fecha_compra', { ascending: false })
      .limit(1)
      .maybeSingle<BonoRow>(),
    supabase
      .from('recurso_asignaciones')
      .select('id, assigned_at, recurso:recursos(id, titulo, tipo)')
      .order('assigned_at', { ascending: false })
      .limit(3),
    supabase.rpc('chat_mi_conversacion'),
  ]);

  const conversacionId =
    typeof conversacionIdData === 'string' ? conversacionIdData : null;

  const unreadMensajes = conversacionId
    ? (await supabase
        .from('conversaciones')
        .select('unread_paciente')
        .eq('id', conversacionId)
        .maybeSingle<{ unread_paciente: number }>()).data?.unread_paciente ?? 0
    : 0;

  const proxima = proximaRaw;
  const bono = bonoActivoRaw;
  const sesionesRestantes = bono
    ? Math.max(0, bono.sesiones_totales - bono.sesiones_consumidas)
    : 0;
  const recursos = (recursosRaw as unknown as RecursoAsignado[] | null) ?? [];

  const displayName =
    user.user_metadata?.full_name?.split(' ')[0] ??
    user.email?.split('@')[0] ??
    '';

  return (
    <>
      <RealtimeRefresh
        channelName={`portal-${user.id}`}
        tables={['citas', 'bonos_pacientes', 'recurso_asignaciones', 'conversaciones']}
      />
      <div className="portal-rise">
        <PageHeader
          eyebrow={format(now, "EEEE d 'de' MMMM", { locale: es })}
          title={`Hola, ${displayName}.`}
          description="Tu espacio seguro. Sesiones, bonos y conversaciones, todo al alcance."
        />
      </div>

      {/* ─── Hero bento: próxima cita (hero bezel) + bono (anillo SVG) ─── */}
      <section className="grid gap-5 lg:grid-cols-[1.6fr_1fr] portal-rise portal-rise-delay-1">
        {proxima ? (
          <SurfaceCard variant="hero" bezel glow="sage" className="relative overflow-hidden">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/8 blur-3xl"
            />
            <Chip tone="positive">Próxima sesión</Chip>
            <h2 className="mt-6 font-display text-[clamp(2.25rem,4.5vw,3.5rem)] italic text-primary leading-[0.98] tracking-[-0.03em] text-balance">
              {format(new Date(proxima.inicio), "EEEE d 'de' MMMM", { locale: es })}
            </h2>
            <p className="mt-3 font-display text-[clamp(1.25rem,2vw,1.625rem)] italic text-primary-dim tabular-nums tracking-[-0.01em]">
              {format(new Date(proxima.inicio), 'HH:mm')} — {format(new Date(proxima.fin), 'HH:mm')}
            </p>

            <div className="mt-6 flex items-center gap-2">
              <span
                aria-hidden="true"
                className="h-1 w-8 rounded-full bg-primary/30"
              />
              <p className="font-body text-[0.92rem] text-ink-soft">
                {proxima.servicio_nombre}
              </p>
            </div>

            <footer className="mt-9 flex flex-wrap items-center gap-4">
              <Link href="/portal/citas">
                <Button variant="primary" icon="arrow_outward" size="lg">
                  Ver detalles
                </Button>
              </Link>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/50 ring-1 ring-inset ring-white/50 px-3 py-1.5 backdrop-blur-md">
                <span className="material-symbols-outlined text-[0.95rem] text-primary" aria-hidden="true">
                  schedule
                </span>
                <p className="font-body text-[0.75rem] text-ink-soft">
                  {formatDistanceToNow(new Date(proxima.inicio), { locale: es, addSuffix: true })}
                </p>
              </div>
            </footer>
          </SurfaceCard>
        ) : (
          <SurfaceCard variant="hero" bezel className="flex flex-col justify-between">
            <div>
              <Chip>Sin sesiones</Chip>
              <h2 className="mt-6 font-display text-[clamp(1.875rem,3.5vw,2.75rem)] italic text-ink leading-[1.02] tracking-[-0.025em] text-balance">
                Sin citas en tu horizonte.
              </h2>
              <p className="mt-4 max-w-[38ch] font-body text-[0.95rem] leading-[1.65] text-ink-soft">
                Cuando estés list{displayName === '' ? 'o' : 'a'}, reserva tu próxima sesión con Almudena.
              </p>
            </div>
            <Link href="/portal/citas/reservar" className="mt-8 self-start">
              <Button variant="primary" icon="arrow_outward" size="lg">
                Reservar sesión
              </Button>
            </Link>
          </SurfaceCard>
        )}

        {/* ── Bono con anillo SVG editorial ── */}
        <SurfaceCard className="flex flex-col justify-between">
          <div>
            <Chip tone="info">Bono activo</Chip>
            {bono ? (
              <div className="mt-6 flex items-center gap-5">
                {/* Anillo SVG */}
                <div className="relative h-24 w-24 flex-shrink-0">
                  <svg viewBox="0 0 96 96" className="h-full w-full -rotate-90" aria-hidden="true">
                    <circle
                      cx="48"
                      cy="48"
                      r="42"
                      fill="none"
                      stroke="rgba(28,28,25,0.08)"
                      strokeWidth="6"
                    />
                    <circle
                      cx="48"
                      cy="48"
                      r="42"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={`${(1 - bono.sesiones_consumidas / bono.sesiones_totales) * 264} 264`}
                      className="text-primary"
                      style={{ transition: 'stroke-dasharray 700ms cubic-bezier(0.16,1,0.3,1)' }}
                    />
                  </svg>
                  <div className="absolute inset-0 grid place-items-center">
                    <p className="font-display text-[1.75rem] italic leading-none text-primary tabular-nums tracking-[-0.02em]">
                      {sesionesRestantes}
                    </p>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="font-display text-[0.95rem] text-ink leading-tight">
                    Sesiones restantes
                  </p>
                  <p className="mt-1 font-body text-[0.8rem] text-ink-soft tabular-nums">
                    de {bono.sesiones_totales} totales
                  </p>
                  {bono.fecha_expiracion ? (
                    <p className="mt-3 font-body text-[0.7rem] text-ink-muted tracking-tight">
                      Vence {format(new Date(bono.fecha_expiracion), "d MMM yyyy", { locale: es })}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="mt-6 font-body text-[0.92rem] leading-[1.6] text-ink-soft">
                Aún no tienes un bono activo. Comprar uno te da descuento por sesión.
              </p>
            )}
          </div>

          <Link href="/portal/pagos" className="mt-7">
            <Button variant="surface" icon={bono ? 'autorenew' : 'add_shopping_cart'}>
              {bono ? 'Renovar bono' : 'Comprar bono'}
            </Button>
          </Link>
        </SurfaceCard>
      </section>

      {/* ─── Stats secundarios ─── */}
      <section className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3 portal-rise portal-rise-delay-2">
        <StatCard
          label="Mensajes sin leer"
          value={unreadMensajes ?? 0}
          icon="mark_chat_unread"
        />
        <StatCard
          label="Recursos asignados"
          value={recursos.length}
          icon="auto_stories"
        />
        <StatCard
          label="Cuenta atrás"
          value={proxima ? Math.max(0, Math.ceil((new Date(proxima.inicio).getTime() - now.getTime()) / 86400000)) : '—'}
          icon="hourglass_top"
          footnote={proxima ? 'Días hasta tu sesión' : 'Sin próximas sesiones'}
        />
      </section>

      {/* ─── Recursos recientes ─── */}
      <section className="mt-16 portal-rise portal-rise-delay-3">
        <SectionTitle
          kicker="Para ti"
          title="Recursos recientes"
          action={
            <Link
              href="/portal/recursos"
              className="group inline-flex items-center gap-1.5 font-body text-[0.82rem] text-ink-soft hover:text-primary transition-colors"
            >
              <span>Biblioteca completa</span>
              <span className="material-symbols-outlined text-[1rem] transition-transform duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5" aria-hidden="true">
                arrow_outward
              </span>
            </Link>
          }
        />

        {recursos.length === 0 ? (
          <EmptyState
            icon="auto_stories"
            title="Aún sin recursos asignados"
            description="Almudena te compartirá guías, audios y ejercicios según avance tu proceso."
          />
        ) : (
          <div className="grid gap-5 md:grid-cols-3">
            {recursos.map((r) =>
              r.recurso ? (
                <SurfaceCard key={r.id} interactive glow="warm">
                  <div className="mb-4 flex items-center gap-2.5">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 ring-1 ring-inset ring-primary/15">
                      <span className="material-symbols-outlined text-[1.05rem] text-primary" aria-hidden="true">
                        {r.recurso.tipo.startsWith('audio') ? 'graphic_eq' : r.recurso.tipo.startsWith('video') ? 'play_circle' : 'description'}
                      </span>
                    </span>
                    <Chip tone="info">{r.recurso.tipo}</Chip>
                  </div>
                  <h3 className="font-display text-[1.1rem] italic text-ink leading-[1.2] tracking-[-0.01em] text-balance">
                    {r.recurso.titulo}
                  </h3>
                  <p className="mt-4 font-body text-[0.7rem] text-ink-muted tracking-tight">
                    Asignado {formatDistanceToNow(new Date(r.assigned_at), { locale: es, addSuffix: true })}
                  </p>
                </SurfaceCard>
              ) : null
            )}
          </div>
        )}
      </section>
    </>
  );
}
