'use client';

/**
 * SlotPicker — selector de slots disponibles con navegación día a día.
 *
 * Arquitectura:
 *   - Servicio y fecha se controlan client-side (useState)
 *   - Al cambiar cualquiera, consulta disponibilidad vía Server Action
 *   - Click en slot → reservarCitaAction. Si ok y confirmada (bono) → toast+redirect
 *     a /portal/citas. Si ok y pre-reserva sin bono → redirect /pagos?cita=id.
 *   - Si slot_ocupado → refresca disponibilidad sin perder scroll.
 */

import { addDays, format, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';

import MonthCalendar from '@/components/booking/MonthCalendar';
import { Chip, SurfaceCard } from '@/components/portal-shell/ui';
import {
  getDisponibilidadAction,
  reservarCitaAction,
  type Slot,
} from '@/services/citas/actions';
import { crearCheckoutCitaAction } from '@/services/pagos/actions';

export interface ServicioOption {
  readonly id: string;
  readonly nombre: string;
  readonly duracion_minutos: number;
  readonly precio_centimos: number;
  readonly descripcion: string | null;
}

interface SlotPickerProps {
  readonly servicios: readonly ServicioOption[];
  readonly tieneBono: boolean;
  readonly preseleccionadoId?: string;
}

const HORIZON_DAYS = 60;

function euro(c: number): string {
  return (c / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

export default function SlotPicker({
  servicios,
  tieneBono,
  preseleccionadoId,
}: SlotPickerProps) {
  const router = useRouter();
  const today = useMemo(() => startOfDay(new Date()), []);
  const maxDate = useMemo(() => addDays(today, HORIZON_DAYS), [today]);

  const [servicioId, setServicioId] = useState<string>(
    preseleccionadoId && servicios.some((s) => s.id === preseleccionadoId)
      ? preseleccionadoId
      : servicios[0]?.id ?? ''
  );
  const [fecha, setFecha] = useState<Date>(today);
  const [slots, setSlots] = useState<readonly Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reservando, startReserva] = useTransition();
  const abortRef = useRef<AbortController | null>(null);

  const servicio = servicios.find((s) => s.id === servicioId) ?? null;

  // Cargar slots cuando cambia servicio o fecha
  useEffect(() => {
    if (!servicioId) {
      setSlots([]);
      return;
    }
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const fechaISO = format(fecha, 'yyyy-MM-dd');
    setLoading(true);
    setError(null);

    getDisponibilidadAction(fechaISO, servicioId)
      .then((data) => {
        if (ctrl.signal.aborted) return;
        setSlots(data);
      })
      .catch(() => {
        if (ctrl.signal.aborted) return;
        setError('No pudimos cargar los huecos. Reintenta.');
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });

    return () => {
      ctrl.abort();
    };
  }, [servicioId, fecha]);

  const handleReservar = (slot: Slot) => {
    if (!servicioId) return;
    setError(null);

    startReserva(async () => {
      const res = await reservarCitaAction(servicioId, slot.slot_inicio);
      if (!res.ok) {
        setError(res.message);
        if (res.code === 'slot_ocupado') {
          getDisponibilidadAction(format(fecha, 'yyyy-MM-dd'), servicioId).then(setSlots);
        }
        return;
      }

      if (res.confirmada) {
        router.push(`/portal/citas?reserva=ok&id=${res.citaId}`);
        return;
      }

      // Sin bono → pre-reserva creada (bloqueo_temporal). Creamos Checkout
      // Session en Stripe y redirigimos al hosted checkout. Si Stripe falla,
      // avisamos y el bloqueo caducará solo (TTL servidor).
      const checkout = await crearCheckoutCitaAction(res.citaId);
      if (!checkout.ok) {
        setError(
          'Hemos reservado tu hueco 15 min, pero no pudimos iniciar el pago. Reintenta desde Bonos y pagos.'
        );
        return;
      }
      window.location.href = checkout.url;
    });
  };

  return (
    <div className="flex flex-col gap-8">
      {/* ── Paso 1: servicio ── */}
      <SurfaceCard>
        <header className="mb-5 flex items-baseline justify-between gap-3">
          <div>
            <p className="font-body text-[0.62rem] uppercase tracking-[0.22em] text-ink-muted">
              Paso 1
            </p>
            <h2 className="mt-1 font-display text-[1.25rem] italic text-ink tracking-[-0.01em]">
              Elige el tipo de sesión
            </h2>
          </div>
        </header>

        <ul className="grid gap-3 md:grid-cols-2">
          {servicios.map((s) => {
            const selected = s.id === servicioId;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setServicioId(s.id)}
                  aria-pressed={selected}
                  className={`group w-full rounded-2xl p-5 text-left transition-[transform,box-shadow,background-color] duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] ${
                    selected
                      ? 'bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_18px_40px_-20px_rgba(75,100,95,0.28)] ring-1 ring-inset ring-primary/30'
                      : 'bg-white/55 hover:bg-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_10px_28px_-16px_rgba(75,100,95,0.14)] hover:-translate-y-[2px] ring-1 ring-inset ring-white/50'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <Chip tone={selected ? 'positive' : 'info'}>{s.duracion_minutos} min</Chip>
                    <p className="font-display text-[1.25rem] italic text-primary tabular-nums tracking-[-0.01em]">
                      {euro(s.precio_centimos)}
                    </p>
                  </div>
                  <h3 className="mt-3 font-display text-[1.1rem] italic text-ink leading-tight tracking-[-0.01em]">
                    {s.nombre}
                  </h3>
                  {s.descripcion ? (
                    <p className="mt-2 font-body text-[0.82rem] text-ink-soft leading-[1.5] line-clamp-2">
                      {s.descripcion}
                    </p>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </SurfaceCard>

      {/* ── Paso 2: día (calendario mensual) ── */}
      <SurfaceCard>
        <header className="mb-4 flex items-baseline justify-between gap-3">
          <div>
            <p className="font-body text-[0.62rem] uppercase tracking-[0.22em] text-ink-muted dark:text-white/55">
              Paso 2
            </p>
            <h2 className="mt-1 font-display text-[1.25rem] italic tracking-[-0.01em] text-ink dark:text-white">
              Escoge el día
            </h2>
            <p className="mt-1 font-body text-[0.78rem] text-ink-soft dark:text-white/60">
              Navega por los próximos {HORIZON_DAYS} días. Selecciona cualquier día y abajo verás los huecos reales.
            </p>
          </div>
        </header>

        <MonthCalendar
          selected={fecha}
          onSelect={(d) => setFecha(d)}
          minDate={today}
          maxDate={maxDate}
        />
      </SurfaceCard>

      {/* ── Paso 3: slots ── */}
      <SurfaceCard>
        <header className="mb-4 flex items-baseline justify-between gap-3">
          <div>
            <p className="font-body text-[0.62rem] uppercase tracking-[0.22em] text-ink-muted">
              Paso 3
            </p>
            <h2 className="mt-1 font-display text-[1.25rem] italic text-ink tracking-[-0.01em]">
              Selecciona hora
            </h2>
            <p className="mt-1 font-body text-[0.82rem] text-ink-soft">
              {format(fecha, "EEEE d 'de' MMMM", { locale: es })}
              {servicio ? ` · ${servicio.nombre}` : ''}
            </p>
          </div>
          {tieneBono ? (
            <Chip tone="positive">Sin pago · bono activo</Chip>
          ) : (
            <Chip tone="info">Requiere pago previo</Chip>
          )}
        </header>

        {loading ? (
          <div className="grid gap-2 grid-cols-3 sm:grid-cols-4 md:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                aria-hidden="true"
                className="h-11 rounded-xl bg-white/45 ring-1 ring-inset ring-white/40 animate-pulse"
              />
            ))}
          </div>
        ) : slots.length === 0 ? (
          <div className="rounded-2xl bg-white/40 ring-1 ring-inset ring-white/50 p-8 text-center">
            <span
              aria-hidden="true"
              className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10"
            >
              <span className="material-symbols-outlined text-[1.2rem] text-primary">
                event_busy
              </span>
            </span>
            <p className="mt-3 font-display text-[1rem] italic text-ink">
              Sin disponibilidad este día
            </p>
            <p className="mt-1 font-body text-[0.82rem] text-ink-soft">
              Prueba otro día o contacta con Almudena por mensaje.
            </p>
          </div>
        ) : (
          <div
            className="grid gap-2 grid-cols-3 sm:grid-cols-4 md:grid-cols-6"
            role="radiogroup"
            aria-label="Horas disponibles"
          >
            {slots.map((s) => (
              <button
                key={s.slot_inicio}
                type="button"
                disabled={reservando}
                onClick={() => handleReservar(s)}
                className="group h-11 rounded-xl bg-white/60 font-body text-[0.88rem] tabular-nums text-ink ring-1 ring-inset ring-white/50 transition-[transform,background-color,box-shadow] duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:bg-primary hover:text-on-primary hover:-translate-y-[2px] hover:shadow-[0_12px_28px_-14px_rgba(75,100,95,0.42)] active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {format(new Date(s.slot_inicio), 'HH:mm')}
              </button>
            ))}
          </div>
        )}

        {error ? (
          <p
            role="alert"
            className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-[#b2675e]/12 ring-1 ring-inset ring-[#b2675e]/22 px-3 py-1.5 font-body text-[0.78rem] text-[#8c4d44]"
          >
            <span className="material-symbols-outlined text-[0.95rem]" aria-hidden="true">
              error
            </span>
            {error}
          </p>
        ) : null}

        {reservando ? (
          <p className="mt-3 inline-flex items-center gap-1.5 font-body text-[0.78rem] text-ink-soft dark:text-white/65">
            <span className="material-symbols-outlined text-[0.95rem] animate-spin" aria-hidden="true">
              sync
            </span>
            Reservando…
          </p>
        ) : null}
      </SurfaceCard>

      {/* ── Resumen de la reserva ── */}
      {servicio ? (
        <SurfaceCard className="bg-white/40 dark:bg-white/[0.03]">
          <header className="mb-3 flex items-baseline justify-between">
            <h2 className="font-display text-[1.05rem] italic text-ink dark:text-white">
              Resumen
            </h2>
            <p className="font-body text-[0.7rem] uppercase tracking-[0.2em] text-ink-muted dark:text-white/55">
              Antes de confirmar
            </p>
          </header>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <dt className="font-body text-[0.68rem] uppercase tracking-[0.15em] text-ink-muted dark:text-white/55">
                Servicio
              </dt>
              <dd className="mt-1 font-display text-[0.95rem] italic text-ink dark:text-white">
                {servicio.nombre}
              </dd>
              <p className="font-body text-[0.75rem] text-ink-soft dark:text-white/65">
                {servicio.duracion_minutos} min
              </p>
            </div>
            <div>
              <dt className="font-body text-[0.68rem] uppercase tracking-[0.15em] text-ink-muted dark:text-white/55">
                Día elegido
              </dt>
              <dd className="mt-1 font-display text-[0.95rem] italic text-ink dark:text-white">
                {format(fecha, "EEEE d 'de' MMMM", { locale: es })}
              </dd>
            </div>
            <div>
              <dt className="font-body text-[0.68rem] uppercase tracking-[0.15em] text-ink-muted dark:text-white/55">
                Importe
              </dt>
              <dd className="mt-1 font-display text-[1.1rem] italic tabular-nums text-primary">
                {tieneBono ? 'Cubierto por tu bono' : euro(servicio.precio_centimos)}
              </dd>
              <p className="font-body text-[0.72rem] text-ink-soft dark:text-white/65">
                {tieneBono
                  ? 'Se descontará 1 sesión al confirmar.'
                  : 'Se reservará el hueco 15 min mientras pagas con tarjeta o wallet.'}
              </p>
            </div>
          </dl>
        </SurfaceCard>
      ) : null}
    </div>
  );
}
