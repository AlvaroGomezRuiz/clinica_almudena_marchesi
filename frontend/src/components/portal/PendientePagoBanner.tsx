import Link from 'next/link';

import { createServerClient } from '@/lib/supabase/server';
import ActivarBonoDialog, { type PendingBonoData } from './pagos/ActivarBonoDialog';

/**
 * PendientePagoBanner — Banner server component que muestra alertas de:
 *   1. Citas pendientes de pago (creadas por admin sin saldo del paciente).
 *   2. Pre-bonos pendientes de activación (asignados por admin, pendientes de pago).
 *
 * Se renderiza en portal/layout.tsx para estar visible en todas las páginas.
 * Solo aparece si hay algo pendiente. No bloquea la navegación.
 */

interface CitaPendiente {
  readonly id: string;
  readonly inicio: string;
  readonly servicio_nombre: string;
}

interface BonoPrePendiente {
  readonly id: string;
  readonly sesiones_totales: number;
  readonly precio_centimos: number;
  readonly servicio: { readonly nombre: string } | { readonly nombre: string }[];
}

export default async function PendientePagoBanner(): Promise<JSX.Element | null> {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Buscar citas pendiente_pago del paciente
  const { data: citasPendientes } = await supabase
    .from('v_citas_expandidas')
    .select('id, inicio, servicio_nombre')
    .eq('paciente_user_id', user.id)
    .eq('estado', 'pendiente_pago')
    .gt('inicio', new Date().toISOString())
    .order('inicio')
    .limit(5);

  // Buscar pre-bonos pendientes de pago
  const { data: bonosPendientes } = await supabase
    .from('bonos_pacientes')
    .select('id, sesiones_totales, precio_centimos, servicio:servicios!inner(nombre)')
    .eq('estado', 'pendiente_pago')
    .eq('activo', false)
    .limit(5);

  const citas = (citasPendientes as CitaPendiente[] | null) ?? [];
  const bonos = (bonosPendientes as BonoPrePendiente[] | null) ?? [];

  if (citas.length === 0 && bonos.length === 0) return null;

  return (
    <div className="mb-6 space-y-3">
      {citas.length > 0 ? (
        <div className="rounded-2xl bg-[#FFF3E9] p-5 ring-1 ring-[#E7B28F]/40 dark:bg-[#2a1f1c] dark:ring-[#5c3d32]">
          <div className="flex items-start gap-3">
            <span
              className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#e5a06e]/20"
              aria-hidden="true"
            >
              <span className="material-symbols-outlined text-[1.1rem] text-[#c67530]">
                payments
              </span>
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-[0.95rem] italic text-[#8A5436] dark:text-[#e8c4a8]">
                {citas.length === 1
                  ? 'Tienes una cita pendiente de pago'
                  : `Tienes ${citas.length} citas pendientes de pago`}
              </h3>
              <p className="mt-1 font-body text-[0.8rem] leading-relaxed text-[#6E4530] dark:text-[#d4b8a8]">
                Almudena te ha reservado una sesión. Completa el pago para confirmarla.
                Puedes pagar una sesión suelta o comprar un bono.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href="/portal/citas/reservar"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#c67530] px-4 py-1.5 font-body text-[0.78rem] font-medium text-white transition-colors hover:bg-[#a85e20]"
                >
                  Pagar sesión suelta
                </Link>
                <Link
                  href="/portal/pagos"
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-4 py-1.5 font-body text-[0.78rem] font-medium text-[#8A5436] ring-1 ring-[#E7B28F]/40 transition-colors hover:bg-white dark:bg-white/10 dark:text-[#e8c4a8] dark:ring-[#5c3d32]"
                >
                  Comprar bono
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {bonos.length > 0 ? (
        <div className="rounded-2xl bg-primary/5 p-5 ring-1 ring-primary/15 dark:bg-primary/10 dark:ring-primary/20">
          <div className="flex items-start gap-3">
            <span
              className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/12"
              aria-hidden="true"
            >
              <span className="material-symbols-outlined text-[1.1rem] text-primary">
                card_membership
              </span>
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-[0.95rem] italic text-ink dark:text-white">
                {bonos.length === 1
                  ? 'Bono pendiente de activación'
                  : `${bonos.length} bonos pendientes de activación`}
              </h3>
              <p className="mt-1 font-body text-[0.8rem] leading-relaxed text-ink-soft dark:text-white/60">
                Almudena te ha asignado un bono. Completa el pago para activarlo y poder usar las sesiones.
              </p>
              <ActivarBonoDialog
                bonos={bonos.map((b) => ({
                  id: b.id,
                  sesiones_totales: b.sesiones_totales,
                  precio_centimos: b.precio_centimos,
                  servicio_nombre: Array.isArray(b.servicio) ? b.servicio[0].nombre : b.servicio.nombre,
                }))}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
