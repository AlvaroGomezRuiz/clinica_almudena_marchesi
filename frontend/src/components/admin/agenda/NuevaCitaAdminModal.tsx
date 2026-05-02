'use client';

/**
 * NuevaCitaAdminModal — Modal multi-step para que Almudena asigne citas.
 *
 * Steps:
 *   1. Buscar y seleccionar paciente
 *   2. Seleccionar servicio
 *   3. Seleccionar fecha
 *   4. Seleccionar hora (cuadrícula de huecos)
 *   5. Resumen + confirmación (muestra si tiene bono o necesita pagar)
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { Button } from '@/components/portal-shell/ui';
import { useNuevaCitaAdmin } from '@/components/admin/NuevaCitaAdminContext';
import { listarPacientesQuickAction, listarServiciosCatalogoAction } from '@/services/admin/actions';
import type { ServicioCatalogo } from '@/services/admin/actions';
import {
  crearCitaAdminAction,
  obtenerDisponibilidadAdminAction,
  verificarSaldoPacienteAction,
  type SaldoPaciente,
  type SlotAdmin,
} from '@/services/admin/admin-cita-actions';

type Step = 'paciente' | 'servicio' | 'fecha' | 'hora' | 'resumen';

interface PacienteOption {
  readonly id: string;
  readonly display_name: string;
  readonly email: string;
}

export default function NuevaCitaAdminModal(): JSX.Element | null {
  const { isOpen, fechaInicial, close } = useNuevaCitaAdmin();
  const router = useRouter();
  const dialogTitleId = useId();

  const [step, setStep] = useState<Step>('paciente');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Step 1: Paciente
  const [query, setQuery] = useState('');
  const [pacientes, setPacientes] = useState<readonly PacienteOption[]>([]);
  const [selectedPaciente, setSelectedPaciente] = useState<PacienteOption | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Step 2: Servicio
  const [servicios, setServicios] = useState<readonly ServicioCatalogo[]>([]);
  const [selectedServicio, setSelectedServicio] = useState<ServicioCatalogo | null>(null);

  // Step 3: Fecha
  const [fecha, setFecha] = useState(fechaInicial ?? format(new Date(), 'yyyy-MM-dd'));

  // Step 4: Hora
  const [slots, setSlots] = useState<readonly SlotAdmin[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Step 5: Resumen
  const [saldo, setSaldo] = useState<SaldoPaciente | null>(null);
  const [resultado, setResultado] = useState<{ citaId: string; estado: string } | null>(null);

  // Reset al cerrar
  useEffect(() => {
    if (!isOpen) {
      setStep('paciente');
      setQuery('');
      setPacientes([]);
      setSelectedPaciente(null);
      setServicios([]);
      setSelectedServicio(null);
      setFecha(format(new Date(), 'yyyy-MM-dd'));
      setSlots([]);
      setSelectedSlot(null);
      setSaldo(null);
      setResultado(null);
      setError(null);
    } else if (fechaInicial) {
      setFecha(fechaInicial);
    }
  }, [isOpen, fechaInicial]);

  // Buscar pacientes con debounce
  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (q.trim().length < 2) { setPacientes([]); return; }
    searchTimerRef.current = setTimeout(() => {
      void listarPacientesQuickAction(q).then(setPacientes);
    }, 300);
  }, []);

  // Cargar servicios al entrar en step 2
  useEffect(() => {
    if (step !== 'servicio' || servicios.length > 0) return;
    startTransition(async () => {
      const cat = await listarServiciosCatalogoAction();
      setServicios(cat);
    });
  }, [step, servicios.length]);

  // Cargar slots al entrar en step 4
  useEffect(() => {
    if (step !== 'hora' || !selectedServicio) return;
    setSlots([]);
    setSelectedSlot(null);
    startTransition(async () => {
      const data = await obtenerDisponibilidadAdminAction(fecha, selectedServicio.id);
      setSlots(data);
    });
  }, [step, fecha, selectedServicio]);

  // Verificar saldo al entrar en step 5
  useEffect(() => {
    if (step !== 'resumen' || !selectedPaciente || !selectedServicio) return;
    startTransition(async () => {
      const s = await verificarSaldoPacienteAction(selectedPaciente.id, selectedServicio.id);
      setSaldo(s);
    });
  }, [step, selectedPaciente, selectedServicio]);

  const handleConfirm = useCallback(() => {
    if (!selectedPaciente || !selectedServicio || !selectedSlot) return;
    setError(null);
    startTransition(async () => {
      const res = await crearCitaAdminAction(
        selectedPaciente.id,
        selectedServicio.id,
        selectedSlot
      );
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setResultado({ citaId: res.citaId, estado: res.estado });
    });
  }, [selectedPaciente, selectedServicio, selectedSlot]);

  const handleClose = useCallback(() => {
    if (resultado) router.refresh();
    close();
  }, [close, resultado, router]);

  const slotsDisponibles = useMemo(() => slots.filter((s) => s.permite_reserva), [slots]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={dialogTitleId}
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
    >
      <button
        type="button"
        aria-label="Cerrar"
        onClick={() => !pending && handleClose()}
        className="absolute inset-0 bg-ink/35 backdrop-blur-[6px]"
      />

      <div className="relative w-full max-w-xl rounded-[1.75rem] bg-canvas p-7 shadow-[0_40px_80px_-24px_rgba(28,28,25,0.35)] ring-1 ring-ink/10 max-h-[85vh] overflow-y-auto dark:bg-[#1a1a1a] dark:ring-white/10">
        <h2
          id={dialogTitleId}
          className="font-display text-[1.5rem] italic leading-tight tracking-[-0.015em] text-ink dark:text-white"
        >
          {resultado ? 'Cita creada' : 'Nueva cita'}
        </h2>

        {/* Step indicators */}
        {!resultado ? (
          <div className="mt-3 mb-6 flex items-center gap-1.5">
            {(['paciente', 'servicio', 'fecha', 'hora', 'resumen'] as const).map((s, i) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                  i <= ['paciente', 'servicio', 'fecha', 'hora', 'resumen'].indexOf(step)
                    ? 'bg-primary dark:bg-primary-fixed'
                    : 'bg-ink/10 dark:bg-white/10'
                }`}
              />
            ))}
          </div>
        ) : null}

        {/* ── Step 1: Paciente ── */}
        {step === 'paciente' && !resultado ? (
          <div>
            <label className="block font-body text-[0.72rem] uppercase tracking-[0.15em] text-ink-muted dark:text-white/50">
              Buscar paciente
            </label>
            <input
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Nombre o email…"
              className="mt-2 w-full rounded-2xl bg-white/70 px-4 py-3 font-body text-[0.9rem] text-ink ring-1 ring-ink/10 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/40 dark:bg-white/5 dark:text-white dark:ring-white/10"
              autoFocus
            />
            {pacientes.length > 0 ? (
              <ul className="mt-3 max-h-48 overflow-y-auto space-y-1">
                {pacientes.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPaciente(p);
                        setStep('servicio');
                      }}
                      className="w-full rounded-xl px-4 py-3 text-left transition-colors hover:bg-primary/8 dark:hover:bg-white/5"
                    >
                      <span className="font-body text-[0.88rem] font-medium text-ink dark:text-white">
                        {p.display_name}
                      </span>
                      <span className="ml-2 font-body text-[0.75rem] text-ink-muted dark:text-white/50">
                        {p.email}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {/* ── Step 2: Servicio ── */}
        {step === 'servicio' && !resultado ? (
          <div>
            <p className="font-body text-[0.82rem] text-ink-soft dark:text-white/60">
              Paciente: <strong className="text-ink dark:text-white">{selectedPaciente?.display_name}</strong>
            </p>
            <label className="mt-4 block font-body text-[0.72rem] uppercase tracking-[0.15em] text-ink-muted dark:text-white/50">
              Servicio
            </label>
            <div className="mt-2 space-y-2">
              {servicios.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSelectedServicio(s);
                    setStep('fecha');
                  }}
                  className="w-full rounded-xl px-4 py-3 text-left ring-1 ring-ink/8 transition-colors hover:bg-primary/8 dark:ring-white/10 dark:hover:bg-white/5"
                >
                  <span className="font-body text-[0.88rem] font-medium text-ink dark:text-white">
                    {s.nombre}
                  </span>
                  <span className="ml-2 font-body text-[0.75rem] text-ink-muted dark:text-white/50">
                    {(s.precio_centimos / 100).toFixed(2)} € · {s.duracion_minutos} min
                  </span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setStep('paciente')}
              className="mt-4 font-body text-[0.8rem] text-primary underline underline-offset-2"
            >
              ← Cambiar paciente
            </button>
          </div>
        ) : null}

        {/* ── Step 3: Fecha ── */}
        {step === 'fecha' && !resultado ? (
          <div>
            <p className="font-body text-[0.82rem] text-ink-soft dark:text-white/60">
              {selectedPaciente?.display_name} · {selectedServicio?.nombre}
            </p>
            <label className="mt-4 block font-body text-[0.72rem] uppercase tracking-[0.15em] text-ink-muted dark:text-white/50">
              Fecha
            </label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              min={format(new Date(), 'yyyy-MM-dd')}
              className="mt-2 w-full rounded-2xl bg-white/70 px-4 py-3 font-body text-[0.9rem] text-ink ring-1 ring-ink/10 focus:outline-none focus:ring-2 focus:ring-primary/40 dark:bg-white/5 dark:text-white dark:ring-white/10"
            />
            <div className="mt-6 flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={() => setStep('servicio')}>Atrás</Button>
              <Button variant="primary" onClick={() => setStep('hora')}>Siguiente</Button>
            </div>
          </div>
        ) : null}

        {/* ── Step 4: Hora ── */}
        {step === 'hora' && !resultado ? (
          <div>
            <p className="font-body text-[0.82rem] text-ink-soft dark:text-white/60">
              {selectedPaciente?.display_name} · {selectedServicio?.nombre} ·{' '}
              {format(new Date(`${fecha}T12:00:00`), "EEEE d 'de' MMMM", { locale: es })}
            </p>
            <label className="mt-4 block font-body text-[0.72rem] uppercase tracking-[0.15em] text-ink-muted dark:text-white/50">
              Hora disponible
            </label>
            {pending ? (
              <p className="mt-4 font-body text-[0.85rem] text-ink-muted dark:text-white/50">Cargando huecos…</p>
            ) : slotsDisponibles.length === 0 ? (
              <p className="mt-4 font-body text-[0.85rem] text-ink-muted dark:text-white/50">
                No hay huecos disponibles este día. Prueba otra fecha.
              </p>
            ) : (
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slotsDisponibles.map((s) => {
                  const hora = format(new Date(s.slot_inicio), 'HH:mm');
                  const isSelected = selectedSlot === s.slot_inicio;
                  return (
                    <button
                      key={s.slot_inicio}
                      type="button"
                      onClick={() => setSelectedSlot(s.slot_inicio)}
                      className={`rounded-xl px-3 py-2.5 font-body text-[0.85rem] tabular-nums transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                        isSelected
                          ? 'bg-primary text-on-primary ring-2 ring-primary/40 dark:bg-primary-fixed dark:text-[#1C1C19]'
                          : 'bg-ink/5 text-ink hover:bg-primary/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10'
                      }`}
                    >
                      {hora}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="mt-6 flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={() => setStep('fecha')}>Atrás</Button>
              <Button
                variant="primary"
                disabled={!selectedSlot}
                onClick={() => setStep('resumen')}
              >
                Siguiente
              </Button>
            </div>
          </div>
        ) : null}

        {/* ── Step 5: Resumen ── */}
        {step === 'resumen' && !resultado ? (
          <div>
            <div className="rounded-2xl bg-ink/[0.03] p-5 ring-1 ring-ink/8 dark:bg-white/[0.03] dark:ring-white/10">
              <dl className="space-y-2 font-body text-[0.85rem]">
                <div className="flex justify-between">
                  <dt className="text-ink-muted dark:text-white/50">Paciente</dt>
                  <dd className="font-medium text-ink dark:text-white">{selectedPaciente?.display_name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-muted dark:text-white/50">Servicio</dt>
                  <dd className="font-medium text-ink dark:text-white">{selectedServicio?.nombre}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-muted dark:text-white/50">Fecha y hora</dt>
                  <dd className="font-medium text-ink dark:text-white">
                    {selectedSlot
                      ? format(new Date(selectedSlot), "d MMM yyyy · HH:mm", { locale: es })
                      : '—'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-muted dark:text-white/50">Saldo</dt>
                  <dd className="font-medium text-ink dark:text-white">
                    {saldo === null
                      ? 'Verificando…'
                      : saldo.tieneSaldo
                        ? `${saldo.total} sesión(es) disponible(s)`
                        : 'Sin saldo — se enviará email de pago'}
                  </dd>
                </div>
              </dl>
            </div>

            {saldo && !saldo.tieneSaldo ? (
              <div className="mt-4 rounded-2xl bg-[#FFF3E9] p-4 ring-1 ring-[#E7B28F]/40 dark:bg-[#2a1f1c] dark:ring-[#5c3d32]">
                <p className="font-body text-[0.8rem] leading-relaxed text-[#6E4530] dark:text-[#d4b8a8]">
                  El paciente no tiene saldo. La cita quedará como <strong>pendiente de pago</strong> y
                  se le enviará un email para que pague (sesión suelta o bono).
                </p>
              </div>
            ) : null}

            {error ? (
              <p role="alert" className="mt-4 font-body text-[0.85rem] text-[#b2675e]">
                {error}
              </p>
            ) : null}

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={() => setStep('hora')} disabled={pending}>Atrás</Button>
              <Button
                variant="primary"
                icon={pending ? 'progress_activity' : 'check'}
                onClick={handleConfirm}
                disabled={pending || saldo === null}
              >
                {pending ? 'Creando…' : 'Confirmar cita'}
              </Button>
            </div>
          </div>
        ) : null}

        {/* ── Resultado ── */}
        {resultado ? (
          <div className="mt-4">
            <div className="flex items-start gap-4">
              <span
                aria-hidden="true"
                className={`mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-full ${
                  resultado.estado === 'confirmada'
                    ? 'bg-primary/15'
                    : 'bg-[#FFF3E9]'
                }`}
              >
                <span className={`material-symbols-outlined text-[1.3rem] ${
                  resultado.estado === 'confirmada' ? 'text-primary' : 'text-[#c67530]'
                }`}>
                  {resultado.estado === 'confirmada' ? 'check_circle' : 'schedule'}
                </span>
              </span>
              <div>
                <h3 className="font-display text-[1.15rem] italic text-ink dark:text-white">
                  {resultado.estado === 'confirmada'
                    ? '¡Cita confirmada!'
                    : 'Cita pendiente de pago'}
                </h3>
                <p className="mt-1 font-body text-[0.85rem] text-ink-soft dark:text-white/60">
                  {resultado.estado === 'confirmada'
                    ? `Se ha consumido una sesión del saldo de ${selectedPaciente?.display_name}. Email de confirmación enviado.`
                    : `Se ha enviado un email a ${selectedPaciente?.display_name} para que complete el pago.`}
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button variant="primary" onClick={handleClose}>Cerrar</Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
