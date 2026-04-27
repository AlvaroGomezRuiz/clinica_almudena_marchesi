'use client';

/**
 * Panel modal (HTML dialog) con resumen de cita para admin.
 * A11y: nativo <dialog>, cierre con Esc, foco al abrir.
 */

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { labelCitaEstadoAgenda, chipToneCitaEstadoAgenda } from '@/components/admin/agenda/cita-estado-agenda';
import type { CitaRow } from '@/components/admin/agenda/types';
import { CitaCancelButton } from '@/components/citas/CitaCancelButton';
import { Button, Chip } from '@/components/portal-shell/ui';

function euroLabel(centimos: number | null): string {
  if (centimos == null || Number.isNaN(centimos)) return '—';
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(centimos / 100);
}

function puedeCancelarDesdeAgendaAdmin(estado: string): boolean {
  return estado === 'confirmada' || estado === 'bloqueo_temporal';
}

export default function CitaResumenSheet({
  cita,
  onClose,
}: {
  readonly cita: CitaRow | null;
  readonly onClose: () => void;
}): JSX.Element {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (cita) {
      if (!el.open) el.showModal();
    } else if (el.open) {
      el.close();
    }
  }, [cita]);

  const handleClose = () => {
    ref.current?.close();
    onClose();
  };

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="max-w-md w-[calc(100%-2rem)] rounded-2xl border-0 bg-canvas p-0 text-ink shadow-2xl ring-1 ring-ink/10 backdrop:bg-ink/40 open:flex dark:bg-[#1a1a1a] dark:text-white dark:ring-white/10"
      aria-labelledby="cita-resumen-titulo"
    >
      {cita ? (
        <div className="flex max-h-[85vh] flex-col">
          <header className="flex items-start justify-between gap-3 border-b border-ink/8 px-5 py-4 dark:border-white/10">
            <div className="min-w-0">
              <p className="font-body text-[0.62rem] uppercase tracking-[0.2em] text-ink-muted dark:text-white/55">
                Resumen de cita
              </p>
              <h2
                id="cita-resumen-titulo"
                className="mt-1 font-display text-[1.25rem] italic leading-tight tracking-[-0.02em] text-ink dark:text-white"
              >
                {cita.servicio_nombre}
              </h2>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-ink/5 hover:text-ink dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
              aria-label="Cerrar"
            >
              <span className="material-symbols-outlined text-[1.2rem]" aria-hidden="true">
                close
              </span>
            </button>
          </header>

          <div className="overflow-y-auto px-5 py-4 font-body text-[0.88rem] leading-relaxed">
            <dl className="grid gap-3">
              <div>
                <dt className="text-[0.62rem] uppercase tracking-[0.15em] text-ink-muted dark:text-white/50">
                  Inicio
                </dt>
                <dd className="mt-0.5 tabular-nums text-ink dark:text-white">
                  {format(new Date(cita.inicio), "EEEE d MMM yyyy · HH:mm", { locale: es })}
                </dd>
              </div>
              <div>
                <dt className="text-[0.62rem] uppercase tracking-[0.15em] text-ink-muted dark:text-white/50">
                  Fin
                </dt>
                <dd className="mt-0.5 tabular-nums text-ink dark:text-white">
                  {format(new Date(cita.fin), 'HH:mm', { locale: es })}
                  {cita.duracion_minutos != null ? (
                    <span className="text-ink-muted dark:text-white/55">
                      {' '}
                      ({cita.duracion_minutos} min)
                    </span>
                  ) : null}
                </dd>
              </div>
              <div>
                <dt className="text-[0.62rem] uppercase tracking-[0.15em] text-ink-muted dark:text-white/50">
                  Estado
                </dt>
                <dd className="mt-0.5">
                  <Chip tone={chipToneCitaEstadoAgenda(cita.estado)}>
                    {labelCitaEstadoAgenda(cita.estado)}
                  </Chip>
                </dd>
              </div>
              <div>
                <dt className="text-[0.62rem] uppercase tracking-[0.15em] text-ink-muted dark:text-white/50">
                  Tarifa servicio
                </dt>
                <dd className="mt-0.5 tabular-nums text-ink dark:text-white">{euroLabel(cita.precio_centimos)}</dd>
              </div>
              <div>
                <dt className="text-[0.62rem] uppercase tracking-[0.15em] text-ink-muted dark:text-white/50">
                  Paciente
                </dt>
                <dd className="mt-0.5 text-ink dark:text-white">
                  {cita.paciente_display_name?.trim() ||
                    (cita.paciente_user_id ? 'Cuenta portal (sin nombre público)' : 'Solo ficha clínica')}
                </dd>
              </div>
              <div>
                <dt className="text-[0.62rem] uppercase tracking-[0.15em] text-ink-muted dark:text-white/50">
                  Portal paciente
                </dt>
                <dd className="mt-0.5 text-ink dark:text-white">
                  {cita.paciente_user_id ? 'Cuenta vinculada' : 'Sin cuenta portal (solo ficha)'}
                </dd>
              </div>
            </dl>
            {puedeCancelarDesdeAgendaAdmin(cita.estado) ? (
              <p className="mt-4 rounded-xl bg-ink/[0.04] px-3 py-2 font-body text-[0.78rem] leading-relaxed text-ink-soft ring-1 ring-inset ring-ink/8 dark:bg-white/[0.04] dark:text-white/65 dark:ring-white/10">
                Si cancelas desde aquí, la cita queda anulada y el hueco vuelve a estar disponible en reservas
                (según política de reembolso y bonos).
              </p>
            ) : null}
          </div>

          <footer className="flex flex-col gap-2 border-t border-ink/8 px-5 py-4 dark:border-white/10 sm:flex-row sm:flex-wrap sm:justify-end sm:items-center">
            {puedeCancelarDesdeAgendaAdmin(cita.estado) ? (
              <div className="order-last flex w-full justify-start sm:order-first sm:mr-auto sm:w-auto">
                <CitaCancelButton
                  citaId={cita.id}
                  inicioISO={cita.inicio}
                  compact
                  isAdmin
                  servicioNombre={cita.servicio_nombre}
                  onCancelled={() => {
                    handleClose();
                  }}
                />
              </div>
            ) : null}
            <Button variant="ghost" size="sm" onClick={handleClose}>
              Cerrar
            </Button>
            <Button
              variant="surface"
              size="sm"
              icon="menu_book"
              onClick={() => {
                handleClose();
                router.push(`/admin/pacientes/${cita.paciente_id}#historia-clinica`);
              }}
            >
              Historia clínica
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon="person"
              onClick={() => {
                handleClose();
                router.push(`/admin/pacientes/${cita.paciente_id}`);
              }}
            >
              Abrir ficha
            </Button>
          </footer>
        </div>
      ) : null}
    </dialog>
  );
}
