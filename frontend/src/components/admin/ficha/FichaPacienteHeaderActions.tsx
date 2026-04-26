'use client';

/**
 * Acciones de cabecera en la ficha: export PDF (pestaña impresión) y modal nueva cita.
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';

import { Button } from '@/components/portal-shell/ui';
import { adminCrearCitaParaPacienteAction } from '@/services/admin/citas-admin-actions';

export interface ServicioMini {
  readonly id: string;
  readonly nombre: string;
  readonly duracion_minutos: number;
}

const linkSurfaceCls =
  'group relative inline-flex items-center rounded-full font-display font-medium tracking-tight transition-[transform,box-shadow,background-color] duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] pl-5 pr-1.5 py-1.5 text-[0.84rem] gap-2.5 bg-white/75 text-ink ring-1 ring-inset ring-white/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_8px_22px_-10px_rgba(75,100,95,0.18)] hover:bg-white backdrop-blur-md dark:bg-white/[0.06] dark:text-white dark:ring-white/10 dark:hover:bg-white/[0.1]';

const iconPillCls =
  'ml-auto grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-primary transition-[transform,background-color] duration-500 group-hover:translate-x-[2px] group-hover:-translate-y-[1px] dark:bg-primary/30 dark:text-white';

export default function FichaPacienteHeaderActions({
  pacienteId,
  servicios,
}: {
  readonly pacienteId: string;
  readonly servicios: readonly ServicioMini[];
}): JSX.Element {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [servicioId, setServicioId] = useState(servicios[0]?.id ?? '');
  const [localInicio, setLocalInicio] = useState('');
  const [notas, setNotas] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const openModal = () => {
    setError(null);
    if (servicios.length > 0 && !servicioId) {
      setServicioId(servicios[0].id);
    }
    dialogRef.current?.showModal();
  };

  const closeModal = () => {
    dialogRef.current?.close();
  };

  const submitCita = () => {
    if (!servicioId || !localInicio) {
      setError('Elige servicio, fecha y hora.');
      return;
    }
    const parsed = new Date(localInicio);
    if (Number.isNaN(parsed.getTime())) {
      setError('Fecha u hora no válida.');
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await adminCrearCitaParaPacienteAction({
        pacienteId,
        servicioId,
        inicioIso: parsed.toISOString(),
        notasAdmin: notas.trim() || null,
      });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      closeModal();
      setNotas('');
      router.refresh();
    });
  };

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-2">
        <Link
          href={`/admin/pacientes/${pacienteId}/print`}
          target="_blank"
          rel="noopener noreferrer"
          className={linkSurfaceCls}
        >
          <span className="whitespace-nowrap">Exportar PDF</span>
          <span className={iconPillCls} aria-hidden="true">
            <span className="material-symbols-outlined text-[1rem]">download</span>
          </span>
        </Link>
        <Button type="button" variant="primary" icon="event" onClick={openModal}>
          Nueva cita
        </Button>
      </div>

      <dialog
        ref={dialogRef}
        className="max-w-md w-[calc(100%-1.5rem)] rounded-2xl border-0 bg-canvas p-0 text-ink shadow-2xl ring-1 ring-ink/10 backdrop:bg-ink/40 open:flex sm:w-full dark:bg-[#1a1a1a] dark:text-white dark:ring-white/10"
        aria-labelledby="nueva-cita-titulo"
      >
        <div className="flex max-h-[88vh] w-full flex-col overflow-hidden">
          <header className="flex items-start justify-between gap-3 border-b border-ink/8 px-4 py-3 sm:px-5 dark:border-white/10">
            <div className="min-w-0">
              <p className="font-body text-[0.58rem] uppercase tracking-[0.2em] text-ink-muted dark:text-white/55">
                Agenda
              </p>
              <h2
                id="nueva-cita-titulo"
                className="mt-1 font-display text-[1.15rem] italic leading-tight text-ink dark:text-white"
              >
                Nueva cita
              </h2>
              <p className="mt-1 font-body text-[0.72rem] text-ink-muted dark:text-white/55">
                Cita confirmada directamente (sin pago en portal).
              </p>
            </div>
            <button
              type="button"
              onClick={closeModal}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-ink/5 dark:text-white/60 dark:hover:bg-white/10"
              aria-label="Cerrar"
            >
              <span className="material-symbols-outlined text-[1.2rem]" aria-hidden="true">
                close
              </span>
            </button>
          </header>

          <div className="space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
            {servicios.length === 0 ? (
              <p className="font-body text-[0.85rem] text-ink-soft dark:text-white/70">
                No hay servicios activos. Publica uno en la base de datos o desactiva esta acción.
              </p>
            ) : (
              <>
                <label className="block">
                  <span className="font-body text-[0.62rem] uppercase tracking-[0.15em] text-ink-muted dark:text-white/55">
                    Servicio
                  </span>
                  <select
                    className="mt-1.5 w-full rounded-xl border border-ink/12 bg-white/90 px-3 py-2.5 font-body text-[0.88rem] text-ink outline-none focus:ring-2 focus:ring-primary/30 dark:border-white/12 dark:bg-white/[0.06] dark:text-white"
                    value={servicioId}
                    onChange={(e) => setServicioId(e.target.value)}
                  >
                    {servicios.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre} ({s.duracion_minutos} min)
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="font-body text-[0.62rem] uppercase tracking-[0.15em] text-ink-muted dark:text-white/55">
                    Inicio (fecha y hora local)
                  </span>
                  <input
                    type="datetime-local"
                    className="mt-1.5 w-full min-h-[2.75rem] rounded-xl border border-ink/12 bg-white/90 px-3 py-2 font-body text-[0.88rem] text-ink outline-none focus:ring-2 focus:ring-primary/30 dark:border-white/12 dark:bg-white/[0.06] dark:text-white"
                    value={localInicio}
                    onChange={(e) => setLocalInicio(e.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="font-body text-[0.62rem] uppercase tracking-[0.15em] text-ink-muted dark:text-white/55">
                    Notas internas (opcional)
                  </span>
                  <textarea
                    rows={2}
                    maxLength={2000}
                    placeholder="Motivo operativo, enlace videollamada…"
                    className="mt-1.5 w-full resize-y rounded-xl border border-ink/12 bg-white/90 px-3 py-2 font-body text-[0.85rem] text-ink outline-none focus:ring-2 focus:ring-primary/30 dark:border-white/12 dark:bg-white/[0.06] dark:text-white"
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                  />
                </label>
              </>
            )}
            {error ? (
              <p className="font-body text-[0.8rem] text-red-700 dark:text-red-300" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          <footer className="flex flex-col-reverse gap-2 border-t border-ink/8 p-4 sm:flex-row sm:justify-end sm:gap-2 sm:px-5 dark:border-white/10">
            <Button type="button" variant="ghost" onClick={closeModal} disabled={pending}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              icon="check_circle"
              disabled={pending || servicios.length === 0 || !localInicio}
              onClick={submitCita}
            >
              Crear cita
            </Button>
          </footer>
        </div>
      </dialog>
    </>
  );
}
