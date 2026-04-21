import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import BonoCompraCard, {
  type BonoConfigItem,
} from '@/components/pagos/BonoCompraCard';
import {
  Chip,
  EmptyState,
  PageHeader,
  SectionDivider,
  StatCard,
  SurfaceCard,
} from '@/components/portal-shell/ui';
import { createServerClient } from '@/lib/supabase/server';

export const metadata = { title: 'Bonos y pagos | Portal Paciente' };
export const dynamic = 'force-dynamic';

interface PacienteRow {
  id: string;
}

interface BonoPacienteRow {
  id: string;
  servicio_id: string;
  sesiones_totales: number;
  sesiones_consumidas: number;
  estado: 'activo' | 'agotado' | 'expirado' | 'cancelado';
  fecha_compra: string;
  fecha_expiracion: string | null;
  activo: boolean;
}

interface PagoRow {
  id: string;
  importe_centimos: number;
  moneda: string;
  estado: 'pendiente' | 'procesando' | 'completado' | 'fallido' | 'reembolsado';
  metodo: string | null;
  fecha_pago: string;
  descripcion: string | null;
}

interface ServicioRef {
  id: string;
  nombre: string;
}

function euro(c: number): string {
  return (c / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

function chipToneFromEstado(
  estado: PagoRow['estado']
): 'positive' | 'critical' | 'warning' | 'neutral' {
  if (estado === 'completado') return 'positive';
  if (estado === 'fallido') return 'critical';
  if (estado === 'reembolsado') return 'neutral';
  return 'warning';
}

export default async function PortalPagosPage() {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // 1. Resolver paciente_id del usuario (RLS permite solo el propio)
  const { data: paciente } = await supabase
    .from('pacientes')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle<PacienteRow>();

  // 2. En paralelo: bonos del paciente, pagos, catálogo de bonos, servicios
  const [
    { data: bonosRaw },
    { data: pagosRaw },
    { data: configRaw },
    { data: serviciosRaw },
  ] = await Promise.all([
    paciente
      ? supabase
          .from('bonos_pacientes')
          .select(
            'id, servicio_id, sesiones_totales, sesiones_consumidas, estado, fecha_compra, fecha_expiracion, activo'
          )
          .eq('paciente_id', paciente.id)
          .order('fecha_compra', { ascending: false })
      : Promise.resolve({ data: [] as BonoPacienteRow[] }),
    paciente
      ? supabase
          .from('pagos')
          .select('id, importe_centimos, moneda, estado, metodo, fecha_pago, descripcion')
          .eq('paciente_id', paciente.id)
          .order('fecha_pago', { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] as PagoRow[] }),
    supabase
      .from('bonos_config')
      .select(
        'id, nombre, descripcion, sesiones, precio_centimos, validez_dias, destacado, orden'
      )
      .eq('activo', true)
      .order('orden', { ascending: true }),
    supabase.from('servicios').select('id, nombre'),
  ]);

  const bonos = (bonosRaw as BonoPacienteRow[] | null) ?? [];
  const pagos = (pagosRaw as PagoRow[] | null) ?? [];
  const bonosConfig = (configRaw as BonoConfigItem[] | null) ?? [];
  const servicios = (serviciosRaw as ServicioRef[] | null) ?? [];

  const servicioNombre = (id: string): string =>
    servicios.find((s) => s.id === id)?.nombre ?? 'Servicio';

  const bonoActivo = bonos.find(
    (b) => b.activo && b.estado === 'activo' && b.sesiones_consumidas < b.sesiones_totales
  );
  const sesionesDisponibles = bonoActivo
    ? bonoActivo.sesiones_totales - bonoActivo.sesiones_consumidas
    : 0;

  const totalGastado = pagos
    .filter((p) => p.estado === 'completado')
    .reduce((acc, p) => acc + p.importe_centimos, 0);

  return (
    <>
      <PageHeader
        eyebrow="Bonos y pagos"
        title="Tu cuenta"
        description="Compra sesiones con Stripe, consulta tus bonos activos y revisa el historial de pagos."
      />

      <section className="mb-10 grid gap-5 md:grid-cols-3">
        <StatCard
          label="Sesiones disponibles"
          value={sesionesDisponibles}
          icon="account_balance_wallet"
          footnote={
            bonoActivo
              ? `${bonoActivo.sesiones_totales} totales · ${servicioNombre(bonoActivo.servicio_id)}`
              : 'Sin bono activo'
          }
        />
        <StatCard label="Total invertido" value={euro(totalGastado)} icon="euro" />
        <StatCard
          label="Pagos completados"
          value={pagos.filter((p) => p.estado === 'completado').length}
          icon="receipt_long"
        />
      </section>

      <SectionDivider label="Comprar sesiones" />

      {bonosConfig.length === 0 ? (
        <EmptyState
          icon="card_membership"
          title="Catálogo no disponible"
          description="Contacta con Almudena si necesitas reservar una sesión."
        />
      ) : (
        <div className="mb-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {bonosConfig.map((bono) => (
            <BonoCompraCard key={bono.id} bono={bono} />
          ))}
        </div>
      )}

      <SectionDivider label="Mis bonos" />

      {bonos.length === 0 ? (
        <EmptyState
          icon="confirmation_number"
          title="Todavía no tienes bonos"
          description="Cuando compres uno aparecerá aquí con su progreso."
        />
      ) : (
        <div className="mb-10 grid gap-4 md:grid-cols-2">
          {bonos.map((b) => {
            const restantes = b.sesiones_totales - b.sesiones_consumidas;
            const pct = Math.round((b.sesiones_consumidas / b.sesiones_totales) * 100);
            const activo =
              b.activo && b.estado === 'activo' && restantes > 0;
            return (
              <SurfaceCard key={b.id}>
                <header className="mb-4 flex items-start justify-between">
                  <div>
                    <Chip tone={activo ? 'positive' : 'neutral'}>
                      {activo ? 'Activo' : b.estado}
                    </Chip>
                    <h3 className="mt-3 font-display text-[1.35rem] italic text-ink">
                      Bono · {b.sesiones_totales} sesiones
                    </h3>
                    <p className="mt-1 font-body text-[0.78rem] text-ink-muted">
                      {servicioNombre(b.servicio_id)}
                    </p>
                  </div>
                </header>

                <div className="mb-3 flex items-baseline justify-between">
                  <span className="font-body text-[0.8rem] text-ink-soft">
                    {restantes} restantes de {b.sesiones_totales}
                  </span>
                  <span className="font-body text-[0.75rem] text-ink-muted tabular-nums">
                    {pct}%
                  </span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-ink/5">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <footer className="mt-4 flex items-center justify-between font-body text-[0.72rem] text-ink-muted">
                  <span>
                    Comprado el{' '}
                    {format(new Date(b.fecha_compra), 'd MMM yyyy', { locale: es })}
                  </span>
                  {b.fecha_expiracion ? (
                    <span>
                      Vence{' '}
                      {format(new Date(b.fecha_expiracion), 'd MMM yyyy', { locale: es })}
                    </span>
                  ) : null}
                </footer>
              </SurfaceCard>
            );
          })}
        </div>
      )}

      <SectionDivider label="Historial de pagos" />

      {pagos.length === 0 ? (
        <p className="font-body text-[0.85rem] text-ink-muted">Sin pagos registrados.</p>
      ) : (
        <SurfaceCard className="p-0 overflow-hidden">
          <ul className="divide-y divide-ink/5">
            {pagos.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="font-body text-[0.88rem] text-ink tabular-nums">
                    {euro(p.importe_centimos)}
                  </p>
                  <p className="font-body text-[0.7rem] text-ink-muted">
                    {format(new Date(p.fecha_pago), "d MMM yyyy · HH:mm", { locale: es })}
                    {p.metodo ? ` · ${p.metodo}` : ''}
                    {p.descripcion ? ` · ${p.descripcion}` : ''}
                  </p>
                </div>
                <Chip tone={chipToneFromEstado(p.estado)}>{p.estado}</Chip>
              </li>
            ))}
          </ul>
        </SurfaceCard>
      )}
    </>
  );
}
