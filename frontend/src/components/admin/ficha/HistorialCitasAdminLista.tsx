'use client';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useCallback, useState, type JSX } from 'react';

import {
  chipToneCitaEstadoAgenda,
  labelCitaEstadoAgenda,
} from '@/components/admin/agenda/cita-estado-agenda';
import { lineaTarifaCitaFicha } from '@/components/admin/ficha/ficha-cita-pago';
import NotaSesionAdminEditor from '@/components/admin/ficha/NotaSesionAdminEditor';
import { Chip } from '@/components/portal-shell/ui';

export interface CitaListaItem {
  readonly id: string;
  readonly inicio: string;
  readonly estado: string;
  readonly servicio_nombre: string;
  readonly precio_centimos: number;
  readonly duracion_minutos: number;
}

interface Props {
  readonly pacienteId: string;
  readonly citas: readonly CitaListaItem[];
  readonly notaIdByCita: Readonly<Record<string, string>>;
  /** Cuántas citas mostrar antes de "Ver más". */
  readonly initialVisible?: number;
  readonly maxVisible?: number;
}

/**
 * Lista de citas con expansión progresiva (menos DOM inicial, mejor TTI en ficha).
 */
export default function HistorialCitasAdminLista({
  pacienteId,
  citas,
  notaIdByCita,
  initialVisible = 5,
  maxVisible = 12,
}: Props): JSX.Element {
  const [visible, setVisible] = useState(() => Math.min(initialVisible, citas.length));

  const onMore = useCallback((): void => {
    setVisible((v) => Math.min(v + initialVisible, maxVisible, citas.length));
  }, [citas.length, initialVisible, maxVisible]);

  const slice = citas.slice(0, visible);
  const canMore = visible < citas.length && visible < maxVisible;

  if (citas.length === 0) {
    return (
      <p className="py-8 text-center font-body text-[0.88rem] text-ink-soft dark:text-white/55">
        Todavía no hay sesiones registradas para este paciente.
      </p>
    );
  }

  return (
    <>
      <ol className="relative space-y-5 pl-6 sm:space-y-6 sm:pl-8">
        <span
          aria-hidden="true"
          className="absolute left-[2px] top-2 bottom-2 w-px bg-ink/15 sm:left-[3px] dark:bg-white/15"
        />
        {slice.map((c, idx) => {
          const globalIdx = citas.findIndex((x) => x.id === c.id);
          const displayNum = globalIdx >= 0 ? citas.length - globalIdx : citas.length - idx;
          const active = globalIdx === 0;
          const fecha = new Date(c.inicio);
          const modalidad = c.servicio_nombre ?? 'Sesión clínica';
          const notaId = notaIdByCita[c.id] ?? null;
          const hasNota = notaId !== null;
          return (
            <li key={c.id} className="relative">
              <span
                aria-hidden="true"
                className={`absolute -left-[25px] top-3 h-2.5 w-2.5 rounded-full ring-4 ring-canvas sm:-left-[33px] dark:ring-[#1a1a1a] ${
                  active ? 'bg-primary' : 'bg-ink/30 dark:bg-white/30'
                }`}
              />
              <div
                className={`rounded-2xl p-4 transition sm:rounded-3xl sm:p-6 ${
                  active
                    ? 'bg-white/80 ring-1 ring-inset ring-ink/10 dark:bg-white/[0.05] dark:ring-white/10'
                    : 'bg-white/40 dark:bg-white/[0.025]'
                }`}
              >
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    <h3 className="font-display text-[1.02rem] italic text-ink sm:text-[1.05rem] dark:text-white">
                      {modalidad}
                    </h3>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className="font-body text-[0.7rem] font-bold uppercase tracking-[0.18em] text-ink-muted dark:text-white/55">
                        {format(fecha, "d MMM yyyy", { locale: es })} ·{' '}
                        {format(fecha, 'HH:mm', { locale: es })} · {c.duracion_minutos} min
                      </span>
                      <Chip tone={chipToneCitaEstadoAgenda(c.estado)}>
                        {labelCitaEstadoAgenda(c.estado)}
                      </Chip>
                    </div>
                    <p className="mt-2 font-body text-[0.75rem] leading-relaxed text-ink-muted dark:text-white/60">
                      {lineaTarifaCitaFicha(c.estado, c.precio_centimos)}
                    </p>
                  </div>
                  <span
                    className={`font-body text-[0.75rem] font-bold tracking-tight ${
                      active
                        ? 'text-primary dark:text-primary-fixed-dim'
                        : 'text-ink-muted dark:text-white/45'
                    }`}
                  >
                    #{displayNum}
                  </span>
                </div>
                <p className="font-body text-[0.82rem] leading-[1.6] text-ink-soft dark:text-white/65">
                  {hasNota
                    ? 'Nota clínica cifrada registrada para esta cita.'
                    : 'Sin nota clínica todavía para esta sesión.'}
                </p>
                <NotaSesionAdminEditor
                  citaId={c.id}
                  pacienteId={pacienteId}
                  notaId={notaId}
                  hasNota={hasNota}
                />
              </div>
            </li>
          );
        })}
      </ol>
      {canMore ? (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={onMore}
            className="inline-flex items-center gap-2 rounded-full bg-white/70 px-5 py-2.5 font-body text-[0.8rem] text-ink ring-1 ring-inset ring-ink/10 transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/40 dark:bg-white/10 dark:text-white dark:ring-white/15 dark:hover:bg-white/15"
          >
            <span className="material-symbols-outlined text-[1.1rem]" aria-hidden="true">
              expand_more
            </span>
            Ver más citas ({citas.length - visible} restantes)
          </button>
        </div>
      ) : null}
    </>
  );
}
