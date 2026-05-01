'use client';

/**
 * SlotPicker — selector de slots disponibles con navegación día a día.
 *
 * Arquitectura:
 *   - Servicio y fecha se controlan client-side (useState)
 *   - Al cambiar cualquiera, consulta disponibilidad vía Server Action
 *   - Click en slot → solo selecciona el hueco. «Confirmar hora» abre el diálogo
 *     de política 48h; desde ahí se llama a `reservarCitaAction`.
 *   - Bono: cada fila de `bonos_pacientes` apunta a un `servicio_id`; solo en esas
 *     modalidades se oculta el precio (bono con sesión disponible). El resto paga.
 *   - Sin bono: no se crea cita hasta el pago; se abre el drawer Stripe (PI con slot en metadata).
 *   - Si slot_ocupado → refresca disponibilidad y limpia la selección.
 */

import { format, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';

import MonthCalendar from '@/components/booking/MonthCalendar';
import { Button, Chip, SurfaceCard } from '@/components/portal-shell/ui';
import PaymentElementDrawer from '@/components/portal/pagos/PaymentElementDrawer';
import { inferModalidadServicio } from '@/lib/booking/servicio-modalidad';
import { CLINIC_TARIFAS_SESION_RESUMEN } from '@/lib/clinic';
import {
  getCuadriculaReservaAction,
  reservarCitaAction,
  type SlotCuadricula,
} from '@/services/citas/actions';

export interface ServicioOption {
  readonly id: string;
  readonly nombre: string;
  readonly duracion_minutos: number;
  readonly precio_centimos: number;
  readonly descripcion: string | null;
}

interface SlotPickerProps {
  readonly servicios: readonly ServicioOption[];
  /** Ids de `servicios` con bono activo y al menos una sesión libre (cada bono del paciente cuelga de un servicio). */
  readonly servicioIdsCubiertoBono: readonly string[];
  readonly preseleccionadoId?: string;
}

function euro(c: number): string {
  return (c / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

export default function SlotPicker({
  servicios,
  servicioIdsCubiertoBono,
  preseleccionadoId,
}: SlotPickerProps) {
  const router = useRouter();
  const today = useMemo(() => startOfDay(new Date()), []);

  const [servicioId, setServicioId] = useState<string>(
    preseleccionadoId && servicios.some((s) => s.id === preseleccionadoId)
      ? preseleccionadoId
      : servicios[0]?.id ?? ''
  );
  const [fecha, setFecha] = useState<Date>(today);
  const [slots, setSlots] = useState<readonly SlotCuadricula[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reservando, startReserva] = useTransition();
  const [selectedSlot, setSelectedSlot] = useState<SlotCuadricula | null>(null);
  const policyDialogRef = useRef<HTMLDialogElement>(null);
  const [pendingPagoSlot, setPendingPagoSlot] = useState<{
    servicioId: string;
    slotInicio: string;
    amount: number;
    titulo: string;
  } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const servicio = servicios.find((s) => s.id === servicioId) ?? null;
  const modalidadServicio = useMemo(
    () => (servicio ? inferModalidadServicio(servicio) : 'individual'),
    [servicio]
  );

  const idsBonoCubreServicio = useMemo(
    () => new Set(servicioIdsCubiertoBono),
    [servicioIdsCubiertoBono]
  );

  const servicioSeleccionCubiertoBono =
    servicio !== null && idsBonoCubreServicio.has(servicio.id);

  const ofertaMixtaBonoCobertura = useMemo(() => {
    if (servicios.length === 0) return false;
    const cubreAlguno = servicios.some((s) => idsBonoCubreServicio.has(s.id));
    const cubreTodo = servicios.every((s) => idsBonoCubreServicio.has(s.id));
    return cubreAlguno && !cubreTodo;
  }, [servicios, idsBonoCubreServicio]);

  const alMenosUnServicioCubiertoEnListado = useMemo(
    () => servicios.some((s) => idsBonoCubreServicio.has(s.id)),
    [servicios, idsBonoCubreServicio]
  );

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

    getCuadriculaReservaAction(fechaISO, servicioId)
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

  useEffect(() => {
    setSelectedSlot(null);
  }, [servicioId, fecha]);

  const closePolicyDialog = () => {
    policyDialogRef.current?.close();
  };

  const ejecutarReserva = (slot: SlotCuadricula) => {
    if (!servicioId || !slot.permite_reserva) return;
    setError(null);

    if (!servicioSeleccionCubiertoBono) {
      closePolicyDialog();
      const titulo = servicio
        ? `${servicio.nombre} · ${format(new Date(slot.slot_inicio), "EEEE d MMM HH:mm", { locale: es })}`
        : 'Reserva de sesión';
      setPendingPagoSlot({
        servicioId,
        slotInicio: slot.slot_inicio,
        amount: servicio?.precio_centimos ?? 0,
        titulo,
      });
      return;
    }

    startReserva(async () => {
      const res = await reservarCitaAction(servicioId, slot.slot_inicio);
      if (!res.ok) {
        closePolicyDialog();
        if (res.code === 'slot_ocupado') {
          void getCuadriculaReservaAction(format(fecha, 'yyyy-MM-dd'), servicioId).then(setSlots);
          setSelectedSlot(null);
          setError(null);
          return;
        }
        setError(res.message);
        return;
      }

      closePolicyDialog();

      if (res.confirmada) {
        router.push(`/portal/citas?reserva=ok&id=${res.citaId}`);
        return;
      }

      setError('La reserva con bono debería quedar confirmada. Contacta con la consulta.');
    });
  };

  return (
    <div className="flex flex-col gap-8">
      {/* ── Paso 1: servicio ── */}
      <SurfaceCard>
        <header className="mb-5 flex items-baseline justify-between gap-3">
          <div>
            <p className="font-body text-[0.62rem] uppercase tracking-[0.22em] text-ink-muted dark:text-white/55">
              Paso 1
            </p>
            <h2 className="mt-1 font-display text-[1.25rem] italic tracking-[-0.01em] text-ink dark:text-white">
              Elige el tipo de sesión
            </h2>
            {servicio ? (
              <p className="mt-2 max-w-2xl text-pretty font-body text-[0.78rem] leading-relaxed text-ink-soft dark:text-white/62">
                {modalidadServicio === 'pareja' ? (
                  <>
                    Has elegido un servicio de <strong className="font-medium text-ink dark:text-white/90">pareja</strong>
                    : la franja en agenda suele ser más larga (p. ej. 75 min). El precio mostrado es el del servicio en
                    catálogo, no la tarifa individual.
                  </>
                ) : (
                  <>
                    Servicio en formato habitual de{' '}
                    <strong className="font-medium text-ink dark:text-white/90">sesión individual</strong> u otros
                    formatos breves: la duración mostrada es la publicada en agenda para ese código (típicamente 50 min).
                  </>
                )}
              </p>
            ) : (
              <p className="mt-2 font-body text-[0.78rem] text-ink-muted dark:text-white/55">
                Selecciona un servicio para ver duración, precio o cobertura con bono.
              </p>
            )}
          </div>
        </header>

        <ul className="grid gap-3 md:grid-cols-2">
          {servicios.map((s) => {
            const selected = s.id === servicioId;
            const cubiertoBonoFila = idsBonoCubreServicio.has(s.id);
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setServicioId(s.id)}
                  aria-pressed={selected}
                  className={`group w-full rounded-2xl p-5 text-left transition-[transform,box-shadow,background-color] duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] ${
                    selected
                      ? 'bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_18px_40px_-20px_rgba(75,100,95,0.28)] ring-1 ring-inset ring-primary/30 dark:bg-[#f4f3ef] dark:text-ink dark:shadow-[0_22px_56px_-28px_rgba(0,0,0,0.72)] dark:ring-primary/45'
                      : 'bg-white/55 hover:bg-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_10px_28px_-16px_rgba(75,100,95,0.14)] hover:-translate-y-[2px] ring-1 ring-inset ring-white/50 dark:bg-white/[0.07] dark:hover:bg-white/[0.11] dark:shadow-none dark:ring-white/14 dark:hover:ring-white/22'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <Chip tone={selected ? 'positive' : 'info'}>{s.duracion_minutos} min</Chip>
                    {cubiertoBonoFila ? (
                      <p className="max-w-[55%] text-right font-display text-[0.95rem] italic leading-snug text-primary sm:text-[1.05rem] dark:text-primary-fixed-dim">
                        Incluido en tu bono
                      </p>
                    ) : (
                      <p className="font-display text-[1.25rem] italic text-primary tabular-nums tracking-[-0.01em] dark:text-primary-fixed-dim">
                        {euro(s.precio_centimos)}
                      </p>
                    )}
                  </div>
                  <h3
                    className={`mt-3 font-display text-[1.1rem] italic leading-tight tracking-[-0.01em] ${
                      selected ? 'text-ink' : 'text-ink dark:text-white'
                    }`}
                  >
                    {s.nombre}
                  </h3>
                  {s.descripcion ? (
                    <p
                      className={`mt-2 font-body text-[0.82rem] leading-[1.5] line-clamp-2 ${
                        selected ? 'text-ink-soft dark:text-ink/85' : 'text-ink-soft dark:text-white/72'
                      }`}
                    >
                      {s.descripcion}
                    </p>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 font-body text-[0.72rem] leading-relaxed text-ink-muted dark:text-white/55">
          {!alMenosUnServicioCubiertoEnListado ? (
            <>
              Los importes son los del servicio en agenda (referencia pública{' '}
              <span className="whitespace-nowrap">{CLINIC_TARIFAS_SESION_RESUMEN}</span>). Tras
              aceptar la política de cancelación, el hueco se bloquea unos minutos para completar el
              pago con tarjeta o wallet.
            </>
          ) : ofertaMixtaBonoCobertura ? (
            <>
              En las modalidades con sesión disponible en bono, no verás importe. En el resto, el
              precio es el del servicio en agenda (referencia pública{' '}
              <span className="whitespace-nowrap">{CLINIC_TARIFAS_SESION_RESUMEN}</span>). Con bono, al
              confirmar se descuenta <strong className="font-medium text-ink dark:text-white/90">1 sesión</strong> y
              la cita queda confirmada; con pago, se bloquea el hueco unos minutos para el cobro.
            </>
          ) : (
            <>
              Con bono en estas modalidades no verás importe: al confirmar la hora se descuenta{' '}
              <strong className="font-medium text-ink dark:text-white/90">una sesión</strong> de tu
              bono y la cita queda confirmada.
            </>
          )}
        </p>
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
              Navega por el calendario (mes a mes). Elige un día y abajo verás los huecos reales.
            </p>
          </div>
        </header>

        <MonthCalendar
          selected={fecha}
          onSelect={(d) => setFecha(d)}
          minDate={today}
        />
      </SurfaceCard>

      {/* ── Paso 3: slots ── */}
      <SurfaceCard>
        <header className="mb-4 flex items-baseline justify-between gap-3">
          <div>
            <p className="font-body text-[0.62rem] uppercase tracking-[0.22em] text-ink-muted dark:text-white/55">
              Paso 3
            </p>
            <h2 className="mt-1 font-display text-[1.25rem] italic tracking-[-0.01em] text-ink dark:text-white">
              Selecciona hora
            </h2>
            <p className="mt-1 font-body text-[0.82rem] text-ink-soft dark:text-white/65">
              {format(fecha, "EEEE d 'de' MMMM", { locale: es })}
              {servicio ? ` · ${servicio.nombre}` : ''}
            </p>
            <p className="mt-2 font-body text-[0.74rem] text-ink-muted dark:text-white/55">
              {servicioSeleccionCubiertoBono
                ? 'Elige una hora y pulsa «Confirmar hora» para reservar con tu bono (sin pago online).'
                : 'Elige una hora y pulsa «Confirmar hora»: se aplicará la política de cancelación antes de bloquear el hueco o iniciar el pago.'}
            </p>
          </div>
          {servicioSeleccionCubiertoBono ? (
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
                className="h-11 rounded-xl bg-white/45 ring-1 ring-inset ring-white/40 animate-pulse dark:bg-white/[0.08] dark:ring-white/12"
              />
            ))}
          </div>
        ) : slots.length === 0 ? (
          <div className="rounded-2xl bg-white/40 ring-1 ring-inset ring-white/50 p-8 text-center dark:bg-white/[0.05] dark:ring-white/12">
            <span
              aria-hidden="true"
              className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 dark:bg-primary/25"
            >
              <span className="material-symbols-outlined text-[1.2rem] text-primary dark:text-primary-fixed-dim">
                event_busy
              </span>
            </span>
            <p className="mt-3 font-display text-[1rem] italic text-ink dark:text-white">
              Sin disponibilidad este día
            </p>
            <p className="mt-1 font-body text-[0.82rem] text-ink-soft dark:text-white/65">
              Prueba otro día o contacta con Almudena por mensaje.
            </p>
          </div>
        ) : (
          <div
            className="grid gap-2 grid-cols-3 sm:grid-cols-4 md:grid-cols-6"
            role="group"
            aria-label="Horas disponibles"
          >
            {slots.map((s) => {
              const picked = selectedSlot?.slot_inicio === s.slot_inicio;
              const bloqueado = !s.permite_reserva;
              return (
                <button
                  key={s.slot_inicio}
                  type="button"
                  disabled={reservando || bloqueado}
                  aria-disabled={bloqueado}
                  aria-pressed={picked}
                  title={
                    bloqueado
                      ? 'Horario no disponible'
                      : picked
                        ? 'Pulsa de nuevo para deseleccionar'
                        : 'Seleccionar hora'
                  }
                  onClick={() => {
                    if (bloqueado) return;
                    setSelectedSlot((prev) =>
                      prev?.slot_inicio === s.slot_inicio ? null : s
                    );
                  }}
                  className={`group relative h-11 overflow-hidden rounded-xl font-body text-[0.88rem] tabular-nums transition-[transform,background-color,box-shadow] duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] ${
                    bloqueado
                      ? 'cursor-not-allowed border border-blue-800/90 bg-transparent text-ink/40 ring-0 dark:border-blue-600 dark:bg-transparent dark:text-white/40'
                      : picked
                        ? 'bg-primary text-on-primary shadow-[0_12px_28px_-14px_rgba(75,100,95,0.42)] ring-1 ring-inset ring-primary/50 active:scale-[0.97] dark:bg-primary dark:text-on-primary'
                        : 'bg-white/60 text-ink ring-1 ring-inset ring-white/50 hover:-translate-y-[2px] hover:bg-primary hover:text-on-primary hover:shadow-[0_12px_28px_-14px_rgba(75,100,95,0.42)] active:scale-[0.97] dark:bg-white/[0.08] dark:text-white dark:ring-white/14 dark:hover:bg-primary dark:hover:text-on-primary'
                  } ${reservando && !bloqueado ? 'opacity-40' : ''}`}
                >
                  {bloqueado ? (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 z-[2] overflow-hidden rounded-[inherit]"
                    >
                      {/* Diagonal TL→BR (hueco ya ocupado / no reservable) */}
                      <span className="absolute left-1/2 top-1/2 h-px w-[min(180%,12rem)] max-w-none -translate-x-1/2 -translate-y-1/2 rotate-45 bg-neutral-400/85 dark:bg-white/45" />
                    </span>
                  ) : null}
                  <span className={bloqueado ? 'relative z-[1]' : ''}>
                    {format(new Date(s.slot_inicio), 'HH:mm')}
                  </span>
                </button>
              );
            })}
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

        {selectedSlot && servicio ? (
          <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-white/50 p-4 ring-1 ring-inset ring-white/55 sm:flex-row sm:items-center sm:justify-between dark:bg-white/[0.06] dark:ring-white/12">
            <div className="min-w-0">
              <p className="font-body text-[0.62rem] uppercase tracking-[0.18em] text-ink-muted dark:text-white/55">
                Hora seleccionada
              </p>
              <p className="mt-1 font-display text-[1.05rem] italic text-ink tabular-nums dark:text-white">
                {format(new Date(selectedSlot.slot_inicio), "EEEE d MMM · HH:mm", { locale: es })}
              </p>
            </div>
            <Button
              type="button"
              variant="primary"
              icon="event_available"
              className="w-full shrink-0 sm:w-auto"
              disabled={reservando}
              onClick={() => {
                if (!selectedSlot) return;
                policyDialogRef.current?.showModal();
              }}
            >
              Confirmar hora
            </Button>
          </div>
        ) : null}
      </SurfaceCard>

      <dialog
        ref={policyDialogRef}
        className="max-w-lg w-[calc(100%-1.5rem)] rounded-2xl border-0 bg-canvas p-0 text-ink shadow-2xl ring-1 ring-ink/10 backdrop:bg-ink/45 open:flex sm:w-full dark:bg-[#1a1a1a] dark:text-white dark:ring-white/10"
        aria-labelledby="policy-48h-title"
        aria-describedby="policy-48h-desc"
      >
        <div className="flex max-h-[85vh] w-full flex-col overflow-hidden">
          <header className="flex items-start justify-between gap-3 border-b border-ink/8 px-4 py-3 sm:px-5 sm:py-4 dark:border-white/10">
            <div className="min-w-0">
              <p className="font-body text-[0.58rem] uppercase tracking-[0.2em] text-ink-muted dark:text-white/55">
                Política de cancelación
              </p>
              <h2
                id="policy-48h-title"
                className="mt-1 font-display text-[1.1rem] italic leading-tight tracking-[-0.02em] text-ink sm:text-[1.25rem] dark:text-white"
              >
                Ventana de 48 horas
              </h2>
            </div>
            <button
              type="button"
              onClick={closePolicyDialog}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-ink/5 hover:text-ink dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
              aria-label="Cerrar"
            >
              <span className="material-symbols-outlined text-[1.2rem]" aria-hidden="true">
                close
              </span>
            </button>
          </header>
          <div
            id="policy-48h-desc"
            className="overflow-y-auto px-4 py-3 sm:px-5 sm:py-4"
          >
            <div className="space-y-3 font-body text-[0.84rem] leading-relaxed text-ink-soft sm:text-[0.88rem] dark:text-white/78">
              {selectedSlot &&
              (new Date(selectedSlot.slot_inicio).getTime() - Date.now()) / 3_600_000 <= 48 &&
              (new Date(selectedSlot.slot_inicio).getTime() - Date.now()) > 0 ? (
                <div
                  role="alert"
                  className="rounded-xl border border-amber-300/70 bg-amber-50 px-3 py-2.5 font-body text-[0.82rem] text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/35 dark:text-amber-50"
                >
                  <strong className="font-semibold">Reserva en menos de 48 horas.</strong>{' '}
                  Si confirmas esta hora, la política de la consulta no permite cancelarla después desde el
                  portal (solo por mensaje seguro con la clínica). Asegúrate de poder asistir.
                </div>
              ) : null}
              <p className="text-pretty">
                <strong className="font-medium text-ink dark:text-white">
                  La cancelación online desde el portal solo está disponible si quedan más de 48 horas
                </strong>{' '}
                hasta el inicio de la cita. Si necesitas anular o cambiar con menos margen, escribe a la
                consulta por el mensaje seguro.
              </p>
              <p className="text-pretty">
                {servicioSeleccionCubiertoBono
                  ? 'Al confirmar, la cita quedará fijada y se descontará una sesión de tu bono activo para esta modalidad.'
                  : modalidadServicio === 'pareja'
                    ? 'Al confirmar, el hueco se reserva unos minutos para que completes el pago con tarjeta o wallet. El importe corresponde al servicio de pareja en agenda. Si no pagas a tiempo, el hueco se libera automáticamente.'
                    : 'Al confirmar, el hueco se reserva unos minutos para que completes el pago con tarjeta o wallet. Si no pagas a tiempo, el hueco se libera automáticamente.'}
              </p>
            </div>
            {selectedSlot && servicio ? (
              <p className="mt-4 rounded-xl bg-ink/[0.04] px-3 py-2 font-body text-[0.8rem] text-ink dark:bg-white/[0.06] dark:text-white/85">
                <span className="text-ink-muted dark:text-white/55">Reserva: </span>
                {servicio.nombre}
                <span className="mx-1 text-ink-muted dark:text-white/45">·</span>
                <span className="tabular-nums">
                  {format(new Date(selectedSlot.slot_inicio), "EEEE d MMM yyyy · HH:mm", {
                    locale: es,
                  })}
                </span>
              </p>
            ) : null}
          </div>
          <footer className="flex flex-col-reverse gap-2 border-t border-ink/8 p-4 sm:flex-row sm:justify-end sm:gap-3 sm:px-5 sm:py-4 dark:border-white/10">
            <Button type="button" variant="ghost" onClick={closePolicyDialog} disabled={reservando}>
              Volver
            </Button>
            <Button
              type="button"
              variant="primary"
              icon="check_circle"
              disabled={reservando || !selectedSlot}
              onClick={() => {
                if (!selectedSlot) return;
                ejecutarReserva(selectedSlot);
              }}
            >
              Confirmar hora
            </Button>
          </footer>
        </div>
      </dialog>

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
                Día y hora
              </dt>
              <dd className="mt-1 font-display text-[0.95rem] italic text-ink dark:text-white">
                {format(fecha, "EEEE d 'de' MMMM", { locale: es })}
              </dd>
              {selectedSlot ? (
                <p className="mt-1 font-body text-[0.8rem] tabular-nums text-ink-soft dark:text-white/65">
                  Hora: {format(new Date(selectedSlot.slot_inicio), 'HH:mm')}
                </p>
              ) : (
                <p className="mt-1 font-body text-[0.75rem] text-ink-muted dark:text-white/45">
                  Selecciona un hueco en el paso 3.
                </p>
              )}
            </div>
            <div>
              <dt className="font-body text-[0.68rem] uppercase tracking-[0.15em] text-ink-muted dark:text-white/55">
                Importe
              </dt>
              <dd className="mt-1 font-display text-[1.1rem] italic tabular-nums text-primary">
                {servicioSeleccionCubiertoBono ? 'Cubierto por tu bono' : euro(servicio.precio_centimos)}
              </dd>
              <p className="font-body text-[0.72rem] text-ink-soft dark:text-white/65">
                {servicioSeleccionCubiertoBono
                  ? 'Se descontará 1 sesión al confirmar.'
                  : modalidadServicio === 'pareja'
                    ? 'Importe del servicio de pareja en catálogo. La cita se registra solo cuando el pago se completa en Stripe (tarjeta, Bizum, Link, SEPA o Klarna).'
                    : 'La cita se registra solo cuando el pago se completa en Stripe (tarjeta, Bizum, Link, SEPA o Klarna, o wallets).'}
              </p>
            </div>
          </dl>
        </SurfaceCard>
      ) : null}

      {pendingPagoSlot ? (
        <PaymentElementDrawer
          open
          onClose={() => {
            setPendingPagoSlot(null);
            router.refresh();
          }}
          target={{
            kind: 'cita_slot',
            servicioId: pendingPagoSlot.servicioId,
            slotInicio: pendingPagoSlot.slotInicio,
          }}
          amountHint={pendingPagoSlot.amount}
          titleHint={pendingPagoSlot.titulo}
        />
      ) : null}
    </div>
  );
}
