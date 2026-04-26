'use client';

/**
 * AgendaClient — orquesta las 3 vistas (día / semana / mes) de la agenda admin.
 *
 * Datos:
 *   - citas[]        (v_citas_expandidas, estado != cancelada)
 *   - bloqueos[]     (agenda_bloqueos activos)
 *   - plantillas[]   (horario_plantillas activas)
 *   - aplicaciones[] (agenda_plantilla_aplicaciones activas)
 *
 * Navegación:
 *   - fecha ancla persistida en URL `?d=yyyy-MM-dd&vista=dia|semana|mes`
 *   - replaceState para no romper el historial de navegación
 *
 * Performance: todas las listas son del mes actual ±15 días -> O(n) irrelevante.
 */

import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameDay, isWithinInterval, parse, startOfMonth, startOfWeek, subDays, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useState, useTransition } from 'react';

import CitaResumenSheet from '@/components/admin/agenda/CitaResumenSheet';
import {
  bordeLateralCitaAgenda,
  chipToneCitaEstadoAgenda,
  labelCitaEstadoAgenda,
  puntoCalendarioCitaEstado,
} from '@/components/admin/agenda/cita-estado-agenda';
import type { CitaRow } from '@/components/admin/agenda/types';
import { Button, Chip, SurfaceCard } from '@/components/portal-shell/ui';
import {
  aplicarPlantillaAction,
  cancelarAplicacionPlantillaAction,
  crearBloqueoAction,
  eliminarBloqueoAction,
} from '@/services/admin/agenda-actions';

export type { CitaRow } from '@/components/admin/agenda/types';

function FichaAgendaLink({
  pacienteId,
  compact = false,
}: {
  readonly pacienteId: string;
  readonly compact?: boolean;
}): JSX.Element {
  return (
    <Link
      href={`/admin/pacientes/${pacienteId}`}
      onClick={(e) => {
        e.stopPropagation();
      }}
      className={
        compact
          ? 'grid h-6 w-6 place-items-center rounded-md text-ink/80 ring-1 ring-inset ring-ink/10 transition-[background-color,color] hover:bg-primary/12 hover:text-primary focus-visible:outline focus-visible:ring-2 focus-visible:ring-primary/40 dark:ring-white/12 dark:hover:bg-primary/20 dark:hover:text-primary-fixed-dim'
          : 'grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-muted ring-1 ring-inset ring-ink/8 transition-[background-color,color] hover:bg-primary/10 hover:text-primary focus-visible:outline focus-visible:ring-2 focus-visible:ring-primary/40 dark:ring-white/10 dark:hover:bg-primary/20 dark:hover:text-primary-fixed-dim'
      }
      aria-label="Abrir ficha del paciente"
      title="Ficha"
    >
      <span
        className={`material-symbols-outlined ${compact ? 'text-[0.9rem]' : 'text-[1.05rem]'}`}
        aria-hidden="true"
      >
        contact_page
      </span>
    </Link>
  );
}

export interface BloqueoRow {
  readonly id: string;
  readonly inicio: string;
  readonly fin: string;
  readonly motivo: string | null;
  readonly dia_completo: boolean;
}
export interface PlantillaRow {
  readonly id: string;
  readonly nombre: string;
  readonly descripcion: string | null;
  readonly color: string | null;
  readonly bloquea_dia_completo: boolean;
}
export interface AplicacionRow {
  readonly id: string;
  readonly plantilla_id: string;
  readonly fecha_desde: string;
  readonly fecha_hasta: string;
  readonly nota: string | null;
}

type Vista = 'dia' | 'semana' | 'mes';

interface AgendaClientProps {
  readonly citas: readonly CitaRow[];
  readonly bloqueos: readonly BloqueoRow[];
  readonly plantillas: readonly PlantillaRow[];
  readonly aplicaciones: readonly AplicacionRow[];
  readonly fechaISO: string; // yyyy-MM-dd de referencia
  readonly vista: Vista;
}

const VISTAS: readonly { id: Vista; label: string; icon: string }[] = [
  { id: 'dia',    label: 'Día',    icon: 'today' },
  { id: 'semana', label: 'Semana', icon: 'view_week' },
  { id: 'mes',    label: 'Mes',    icon: 'calendar_month' },
];

export default function AgendaClient({
  citas,
  bloqueos,
  plantillas,
  aplicaciones,
  fechaISO,
  vista,
}: AgendaClientProps): JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [citaDetalle, setCitaDetalle] = useState<CitaRow | null>(null);

  const fechaAncla = useMemo(
    () => parse(fechaISO, 'yyyy-MM-dd', new Date()),
    [fechaISO]
  );

  // ─── Navegación por URL ─────────────────────────────────────────────────
  const pushParams = useCallback(
    (nextDate: Date, nextVista: Vista) => {
      const sp = new URLSearchParams(searchParams.toString());
      sp.set('d', format(nextDate, 'yyyy-MM-dd'));
      sp.set('vista', nextVista);
      router.push(`${pathname}?${sp.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const shift = useCallback(
    (delta: -1 | 1) => {
      const next =
        vista === 'mes'
          ? (delta === 1 ? addMonths(fechaAncla, 1) : subMonths(fechaAncla, 1))
          : vista === 'semana'
            ? (delta === 1 ? addDays(fechaAncla, 7) : subDays(fechaAncla, 7))
            : (delta === 1 ? addDays(fechaAncla, 1) : subDays(fechaAncla, 1));
      pushParams(next, vista);
    },
    [vista, fechaAncla, pushParams]
  );

  const eyebrow = useMemo(() => {
    if (vista === 'dia') return format(fechaAncla, "EEEE d 'de' MMMM yyyy", { locale: es });
    if (vista === 'semana') {
      const ini = startOfWeek(fechaAncla, { weekStartsOn: 1 });
      const fin = endOfWeek(fechaAncla, { weekStartsOn: 1 });
      return `Semana ${format(ini, "d MMM", { locale: es })} – ${format(fin, "d MMM yyyy", { locale: es })}`;
    }
    return format(fechaAncla, "LLLL yyyy", { locale: es });
  }, [vista, fechaAncla]);

  return (
    <>
      {/* ─── Toolbar: vista + navegación + hoy ─── */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div
          role="tablist"
          aria-label="Cambiar vista de agenda"
          className="inline-flex rounded-full bg-white/60 p-1 ring-1 ring-inset ring-ink/8 dark:bg-white/5 dark:ring-white/10"
        >
          {VISTAS.map((v) => {
            const active = v.id === vista;
            return (
              <button
                key={v.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => pushParams(fechaAncla, v.id)}
                className={`group inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-body text-[0.78rem] font-medium tracking-tight transition-[background-color,color] duration-300 ${
                  active
                    ? 'bg-ink text-canvas dark:bg-white dark:text-[#111]'
                    : 'text-ink-soft hover:text-ink dark:text-white/65 dark:hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[1.05rem]" aria-hidden="true">
                  {v.icon}
                </span>
                {v.label}
              </button>
            );
          })}
        </div>

        <div className="inline-flex items-center gap-1 ml-1">
          <button
            type="button"
            onClick={() => shift(-1)}
            aria-label="Anterior"
            className="grid h-9 w-9 place-items-center rounded-full bg-white/60 ring-1 ring-inset ring-ink/8 text-ink-soft hover:text-ink transition-colors dark:bg-white/5 dark:ring-white/10 dark:text-white/65 dark:hover:text-white"
          >
            <span className="material-symbols-outlined text-[1.15rem]" aria-hidden="true">chevron_left</span>
          </button>
          <button
            type="button"
            onClick={() => pushParams(new Date(), vista)}
            className="px-3.5 py-1.5 rounded-full bg-white/60 ring-1 ring-inset ring-ink/8 font-body text-[0.78rem] text-ink hover:bg-white transition-colors dark:bg-white/5 dark:ring-white/10 dark:text-white/80 dark:hover:bg-white/10"
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={() => shift(1)}
            aria-label="Siguiente"
            className="grid h-9 w-9 place-items-center rounded-full bg-white/60 ring-1 ring-inset ring-ink/8 text-ink-soft hover:text-ink transition-colors dark:bg-white/5 dark:ring-white/10 dark:text-white/65 dark:hover:text-white"
          >
            <span className="material-symbols-outlined text-[1.15rem]" aria-hidden="true">chevron_right</span>
          </button>
        </div>

        <div className="flex-1 text-right">
          <p className="font-body text-[0.62rem] uppercase tracking-[0.22em] text-ink-muted dark:text-white/55">
            Rango visible
          </p>
          <p className="font-display text-[1.05rem] italic text-ink tracking-[-0.01em] dark:text-white">
            {eyebrow}
          </p>
        </div>
      </div>

      {/* ─── Plantillas reutilizables ─── */}
      <TemplateBar
        plantillas={plantillas}
        aplicaciones={aplicaciones}
        fechaAncla={fechaAncla}
      />

      {/* ─── Vista dinámica ─── */}
      {vista === 'dia' ? (
        <DayView
          fecha={fechaAncla}
          citas={citas}
          bloqueos={bloqueos}
          aplicaciones={aplicaciones}
          plantillas={plantillas}
          onSelectCita={setCitaDetalle}
        />
      ) : vista === 'semana' ? (
        <WeekGrid
          fechaAncla={fechaAncla}
          citas={citas}
          bloqueos={bloqueos}
          aplicaciones={aplicaciones}
          plantillas={plantillas}
          onSelectDay={(d) => pushParams(d, 'dia')}
          onSelectCita={setCitaDetalle}
        />
      ) : (
        <MonthOverview fechaAncla={fechaAncla} citas={citas} bloqueos={bloqueos} aplicaciones={aplicaciones} plantillas={plantillas} onSelectDay={(d) => pushParams(d, 'dia')} />
      )}

      <CitaResumenSheet cita={citaDetalle} onClose={() => setCitaDetalle(null)} />
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Template Bar — plantillas disponibles + aplicaciones activas
// ═════════════════════════════════════════════════════════════════════════════
function TemplateBar({
  plantillas,
  aplicaciones,
  fechaAncla,
}: {
  readonly plantillas: readonly PlantillaRow[];
  readonly aplicaciones: readonly AplicacionRow[];
  readonly fechaAncla: Date;
}): JSX.Element {
  const [plantillaSel, setPlantillaSel] = useState<string>('');
  const [desde, setDesde] = useState<string>(format(fechaAncla, 'yyyy-MM-dd'));
  const [hasta, setHasta] = useState<string>(format(addDays(fechaAncla, 7), 'yyyy-MM-dd'));
  const [nota, setNota] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const apply = () => {
    if (!plantillaSel) {
      setError('Selecciona una plantilla');
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await aplicarPlantillaAction({
        plantillaId: plantillaSel,
        fechaInicio: desde,
        fechaFin: hasta,
        observaciones: nota || null,
      });
      if (!res.ok) setError(res.message);
      else {
        setNota('');
      }
    });
  };

  const cancel = (id: string) => {
    startTransition(async () => {
      await cancelarAplicacionPlantillaAction(id);
    });
  };

  const plantillaById = useMemo(
    () => new Map(plantillas.map((p) => [p.id, p])),
    [plantillas]
  );

  return (
    <SurfaceCard className="mb-8">
      <header className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="font-body text-[0.62rem] uppercase tracking-[0.22em] text-ink-muted dark:text-white/55">
            Plantillas de horario
          </p>
          <h3 className="mt-1.5 font-display text-[1.25rem] italic text-ink leading-none tracking-[-0.01em] dark:text-white">
            Aplicar una plantilla a un rango de fechas
          </h3>
        </div>
        <Chip tone={aplicaciones.length > 0 ? 'positive' : 'neutral'}>
          {aplicaciones.length} activa{aplicaciones.length === 1 ? '' : 's'}
        </Chip>
      </header>

      <div className="grid gap-3 sm:grid-cols-[1.5fr_1fr_1fr_auto] items-end">
        <label className="flex flex-col gap-1">
          <span className="font-body text-[0.68rem] uppercase tracking-[0.18em] text-ink-muted dark:text-white/55">
            Plantilla
          </span>
          <select
            value={plantillaSel}
            onChange={(e) => setPlantillaSel(e.target.value)}
            className="rounded-xl bg-white/80 px-3 py-2 font-body text-[0.88rem] text-ink ring-1 ring-inset ring-ink/8 outline-none focus:ring-primary/40 dark:bg-white/5 dark:text-white dark:ring-white/10"
          >
            <option value="">— Selecciona —</option>
            {plantillas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}{p.bloquea_dia_completo ? ' · día completo' : ''}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-body text-[0.68rem] uppercase tracking-[0.18em] text-ink-muted dark:text-white/55">
            Desde
          </span>
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="rounded-xl bg-white/80 px-3 py-2 font-body text-[0.88rem] text-ink ring-1 ring-inset ring-ink/8 outline-none focus:ring-primary/40 dark:bg-white/5 dark:text-white dark:ring-white/10"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-body text-[0.68rem] uppercase tracking-[0.18em] text-ink-muted dark:text-white/55">
            Hasta
          </span>
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="rounded-xl bg-white/80 px-3 py-2 font-body text-[0.88rem] text-ink ring-1 ring-inset ring-ink/8 outline-none focus:ring-primary/40 dark:bg-white/5 dark:text-white dark:ring-white/10"
          />
        </label>

        <Button
          variant="primary"
          icon="auto_awesome_motion"
          onClick={apply}
          disabled={isPending}
        >
          {isPending ? 'Aplicando…' : 'Aplicar plantilla'}
        </Button>
      </div>

      <label className="mt-3 flex flex-col gap-1">
        <span className="font-body text-[0.68rem] uppercase tracking-[0.18em] text-ink-muted dark:text-white/55">
          Nota (opcional)
        </span>
        <input
          type="text"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Ej: vacaciones agosto, congreso Madrid…"
          maxLength={240}
          className="rounded-xl bg-white/80 px-3 py-2 font-body text-[0.88rem] text-ink ring-1 ring-inset ring-ink/8 outline-none focus:ring-primary/40 dark:bg-white/5 dark:text-white dark:ring-white/10"
        />
      </label>

      {error ? (
        <p className="mt-3 font-body text-[0.8rem] text-[#8c4d44] dark:text-[#f3b3aa]">
          Error: {error}
        </p>
      ) : null}

      {aplicaciones.length > 0 ? (
        <ul className="mt-5 divide-y divide-ink/5 dark:divide-white/5">
          {aplicaciones.map((a) => {
            const p = plantillaById.get(a.plantilla_id);
            return (
              <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="h-9 w-1.5 rounded-full"
                    style={{ background: p?.color ?? '#889' }}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="font-display text-[1rem] text-ink tracking-[-0.01em] dark:text-white">
                      {p?.nombre ?? 'Plantilla'}
                    </p>
                    <p className="mt-0.5 font-body text-[0.72rem] text-ink-muted dark:text-white/55">
                      {format(new Date(a.fecha_desde), "d MMM", { locale: es })}
                      {' → '}
                      {format(new Date(a.fecha_hasta), "d MMM yyyy", { locale: es })}
                      {a.nota ? ` · ${a.nota}` : ''}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => cancel(a.id)}
                  disabled={isPending}
                  className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 font-body text-[0.72rem] text-ink-soft hover:text-[#8c4d44] hover:bg-[#8c4d44]/10 transition-colors dark:text-white/60 dark:hover:text-[#f3b3aa] dark:hover:bg-[#f3b3aa]/10"
                >
                  <span className="material-symbols-outlined text-[1rem]" aria-hidden="true">
                    undo
                  </span>
                  Desactivar
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </SurfaceCard>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Helpers compartidos — estado de un día
// ═════════════════════════════════════════════════════════════════════════════

interface DiaEstado {
  readonly citasDia: readonly CitaRow[];
  readonly bloqueosDia: readonly BloqueoRow[];
  readonly bloqueadoPorPlantilla: boolean;
  readonly plantillaActiva: PlantillaRow | null;
}

function computeDiaEstado(
  dia: Date,
  citas: readonly CitaRow[],
  bloqueos: readonly BloqueoRow[],
  aplicaciones: readonly AplicacionRow[],
  plantillas: readonly PlantillaRow[]
): DiaEstado {
  const iniDia = new Date(dia);
  iniDia.setHours(0, 0, 0, 0);
  const finDia = new Date(dia);
  finDia.setHours(23, 59, 59, 999);

  const citasDia = citas.filter((c) => {
    const t = new Date(c.inicio).getTime();
    return t >= iniDia.getTime() && t <= finDia.getTime();
  });

  const bloqueosDia = bloqueos.filter((b) => {
    const ini = new Date(b.inicio).getTime();
    const fin = new Date(b.fin).getTime();
    return ini <= finDia.getTime() && fin >= iniDia.getTime();
  });

  const aplicablesHoy = aplicaciones.filter((a) =>
    isWithinInterval(dia, {
      start: new Date(a.fecha_desde),
      end: new Date(a.fecha_hasta),
    })
  );

  const plantillaActiva =
    aplicablesHoy
      .map((a) => plantillas.find((p) => p.id === a.plantilla_id))
      .find((p): p is PlantillaRow => Boolean(p)) ?? null;

  const bloqueadoPorPlantilla = aplicablesHoy.some((a) => {
    const p = plantillas.find((pp) => pp.id === a.plantilla_id);
    return p?.bloquea_dia_completo ?? false;
  });

  return { citasDia, bloqueosDia, bloqueadoPorPlantilla, plantillaActiva };
}

// ═════════════════════════════════════════════════════════════════════════════
// DayView — vista día con acciones inline (bloquear día completo)
// ═════════════════════════════════════════════════════════════════════════════
function DayView({
  fecha,
  citas,
  bloqueos,
  aplicaciones,
  plantillas,
  onSelectCita,
}: {
  readonly fecha: Date;
  readonly citas: readonly CitaRow[];
  readonly bloqueos: readonly BloqueoRow[];
  readonly aplicaciones: readonly AplicacionRow[];
  readonly plantillas: readonly PlantillaRow[];
  readonly onSelectCita: (c: CitaRow) => void;
}): JSX.Element {
  const estado = computeDiaEstado(fecha, citas, bloqueos, aplicaciones, plantillas);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const bloquearDiaCompleto = () => {
    const ini = new Date(fecha); ini.setHours(0, 0, 0, 0);
    const fin = new Date(fecha); fin.setHours(23, 59, 59, 999);
    startTransition(async () => {
      const res = await crearBloqueoAction({
        inicioISO: ini.toISOString(),
        finISO: fin.toISOString(),
        motivo: 'Día completo bloqueado',
        diaCompleto: true,
      });
      if (!res.ok) setError(res.message);
    });
  };

  const eliminarBloqueo = (id: string) => {
    startTransition(async () => {
      await eliminarBloqueoAction(id);
    });
  };

  const items = [
    ...estado.citasDia.map((c) => ({ kind: 'cita' as const, item: c, time: new Date(c.inicio).getTime() })),
    ...estado.bloqueosDia.map((b) => ({ kind: 'bloqueo' as const, item: b, time: new Date(b.inicio).getTime() })),
  ].sort((a, b) => a.time - b.time);

  return (
    <SurfaceCard>
      <header className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="font-body text-[0.62rem] uppercase tracking-[0.22em] text-ink-muted dark:text-white/55">
            {format(fecha, "EEEE", { locale: es })}
          </p>
          <h3 className="mt-1 font-display text-[1.7rem] italic text-ink leading-none tracking-[-0.02em] dark:text-white">
            {format(fecha, "d 'de' MMMM", { locale: es })}
          </h3>
          {estado.plantillaActiva ? (
            <p className="mt-2 inline-flex items-center gap-1.5 font-body text-[0.72rem] text-ink-muted dark:text-white/55">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: estado.plantillaActiva.color ?? '#889' }}
                aria-hidden="true"
              />
              Plantilla activa: {estado.plantillaActiva.nombre}
            </p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon="event_busy"
            onClick={bloquearDiaCompleto}
            disabled={isPending || estado.bloqueadoPorPlantilla}
          >
            Bloquear día
          </Button>
          <Link href={`/admin/agenda?nuevo=1&d=${format(fecha, 'yyyy-MM-dd')}`}>
            <Button variant="primary" size="sm" icon="add">Nueva cita</Button>
          </Link>
        </div>
      </header>

      {estado.bloqueadoPorPlantilla ? (
        <div className="mb-4 rounded-xl bg-[#c89b5a]/10 px-4 py-3 font-body text-[0.82rem] text-ink-soft ring-1 ring-inset ring-[#c89b5a]/25 dark:text-white/75 dark:bg-[#c89b5a]/15 dark:ring-[#c89b5a]/30">
          Este día está bloqueado por una plantilla activa. Las citas programadas deben gestionarse manualmente.
        </div>
      ) : null}

      {error ? (
        <p className="mb-3 font-body text-[0.8rem] text-[#8c4d44] dark:text-[#f3b3aa]">
          Error: {error}
        </p>
      ) : null}

      {items.length === 0 ? (
        <p className="py-8 text-center font-body text-[0.9rem] text-ink-soft dark:text-white/55">
          Sin eventos en este día. Hueco libre.
        </p>
      ) : (
        <ul className="divide-y divide-ink/5 dark:divide-white/5">
          {items.map((it) => (
            <li key={`${it.kind}-${it.item.id}`} className="flex items-center gap-2 py-3 sm:gap-3">
              {it.kind === 'cita' ? (
                <>
                  <button
                    type="button"
                    onClick={() => onSelectCita(it.item)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left outline-none ring-primary/40 focus-visible:ring-2 sm:gap-4"
                  >
                    <span className="w-14 shrink-0 font-display text-[1.1rem] text-ink tabular-nums tracking-[-0.01em] sm:w-16 dark:text-white">
                      {format(new Date(it.item.inicio), 'HH:mm')}
                    </span>
                    <span className="h-10 w-px shrink-0 bg-ink/10 dark:bg-white/10" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="font-body text-[0.92rem] text-ink dark:text-white">
                        {it.item.servicio_nombre}
                      </p>
                      <p className="mt-0.5 line-clamp-1 font-body text-[0.72rem] text-ink-muted dark:text-white/55">
                        {it.item.paciente_display_name?.trim() || 'Paciente'}
                        <span className="text-ink-muted/80 dark:text-white/40"> · </span>
                        Hasta {format(new Date(it.item.fin), 'HH:mm')}
                      </p>
                    </div>
                    <Chip tone={chipToneCitaEstadoAgenda(it.item.estado)}>
                      {labelCitaEstadoAgenda(it.item.estado)}
                    </Chip>
                  </button>
                  {it.item.paciente_id ? <FichaAgendaLink pacienteId={it.item.paciente_id} /> : null}
                </>
              ) : (
                <>
                  <span className="w-16 font-display text-[1.1rem] text-ink tabular-nums tracking-[-0.01em] dark:text-white">
                    {format(new Date(it.item.inicio), 'HH:mm')}
                  </span>
                  <span className="h-10 w-px bg-ink/10 dark:bg-white/10" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="font-body text-[0.92rem] text-ink dark:text-white">
                      {it.item.motivo ?? 'Bloqueo'}
                    </p>
                    <p className="mt-0.5 font-body text-[0.72rem] text-ink-muted dark:text-white/55">
                      Hasta {format(new Date(it.item.fin), 'HH:mm')}
                      {it.item.dia_completo ? ' · día completo' : ''}
                    </p>
                  </div>
                  <Chip tone="warning">Bloqueo</Chip>
                  <button
                    type="button"
                    onClick={() => eliminarBloqueo(it.item.id)}
                    disabled={isPending}
                    aria-label="Eliminar bloqueo"
                    className="grid h-8 w-8 place-items-center rounded-full text-ink-muted hover:text-[#8c4d44] hover:bg-[#8c4d44]/10 transition-colors dark:text-white/60 dark:hover:text-[#f3b3aa] dark:hover:bg-[#f3b3aa]/10"
                  >
                    <span className="material-symbols-outlined text-[1.1rem]" aria-hidden="true">close</span>
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </SurfaceCard>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// WeekGrid — 7 columnas × slots 30 min
// ═════════════════════════════════════════════════════════════════════════════
function WeekGrid({
  fechaAncla,
  citas,
  bloqueos,
  aplicaciones,
  plantillas,
  onSelectDay,
  onSelectCita,
}: {
  readonly fechaAncla: Date;
  readonly citas: readonly CitaRow[];
  readonly bloqueos: readonly BloqueoRow[];
  readonly aplicaciones: readonly AplicacionRow[];
  readonly plantillas: readonly PlantillaRow[];
  readonly onSelectDay: (d: Date) => void;
  readonly onSelectCita: (c: CitaRow) => void;
}): JSX.Element {
  const inicioSemana = startOfWeek(fechaAncla, { weekStartsOn: 1 });
  const dias = Array.from({ length: 7 }, (_, i) => addDays(inicioSemana, i));

  // Rango horario visual: 08:00–20:00 (24 medias horas). Simétrico al día laboral clínico.
  const hourStart = 8;
  const hourEnd = 20;
  const slotMin = 30;
  const totalSlots = ((hourEnd - hourStart) * 60) / slotMin;
  const pxPorMediaHora = 28; // h-7; debe coincidir con EventoBlock
  const gridBodyHeightPx = totalSlots * pxPorMediaHora;

  return (
    <SurfaceCard className="overflow-hidden">
      <div className="-mx-1 overflow-x-auto px-1 sm:mx-0 sm:px-0">
        <div className="min-w-0 w-full min-[720px]:min-w-[44rem]">
      <div className="grid grid-cols-[3rem_repeat(7,minmax(0,1fr))] border-b border-ink/8 dark:border-white/8">
        <div className="min-w-12 shrink-0" aria-hidden="true" />
        {dias.map((d) => {
          const esHoy = isSameDay(d, new Date());
          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => onSelectDay(d)}
              className={`min-w-0 border-l border-ink/6 py-2 text-left px-1.5 transition-colors hover:bg-white/40 dark:border-white/6 dark:hover:bg-white/5 sm:px-2 ${
                esHoy ? 'bg-primary/5 dark:bg-primary/10' : ''
              }`}
            >
              <p className="font-body text-[0.62rem] uppercase tracking-[0.22em] text-ink-muted dark:text-white/55">
                {format(d, 'EEE', { locale: es })}
              </p>
              <p
                className={`mt-0.5 font-display text-[1.05rem] tabular-nums tracking-[-0.01em] ${
                  esHoy ? 'text-primary dark:text-primary-fixed-dim' : 'text-ink dark:text-white'
                }`}
              >
                {format(d, 'd')}
              </p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-[3rem_repeat(7,minmax(0,1fr))]">
        {/* Columna de horas (alineada con la cabecera) */}
        <div className="min-w-12 shrink-0">
          {Array.from({ length: hourEnd - hourStart }, (_, i) => (
            <div
              key={`h-${i}`}
              className="h-14 border-b border-ink/[0.06] px-0.5 text-right font-body text-[0.6rem] tabular-nums text-ink-muted dark:border-white/[0.06] dark:text-white/40 sm:px-1 sm:text-[0.62rem]"
            >
              {String(hourStart + i).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {dias.map((dia) => {
          const estado = computeDiaEstado(dia, citas, bloqueos, aplicaciones, plantillas);
          return (
            <div
              key={`col-${dia.toISOString()}`}
              className="relative min-w-0 overflow-hidden border-l border-ink/[0.06] dark:border-white/[0.06]"
              style={{ height: `${gridBodyHeightPx}px` }}
            >
              {/* Overlay día bloqueado */}
              {estado.bloqueadoPorPlantilla ? (
                <div
                  className="absolute inset-0 z-10 grid place-items-center bg-[#c89b5a]/12 backdrop-blur-[1px]"
                  aria-label="Día bloqueado"
                >
                  <div className="rotate-[-8deg] rounded-xl bg-[#c89b5a]/20 px-3 py-1.5 font-body text-[0.72rem] uppercase tracking-[0.2em] text-[#8a6530] ring-1 ring-[#c89b5a]/30 dark:text-[#e9c88a] dark:bg-[#c89b5a]/25 dark:ring-[#c89b5a]/35">
                    {estado.plantillaActiva?.nombre ?? 'Bloqueado'}
                  </div>
                </div>
              ) : null}

              {/* Guías: solo línea en cada hora en punto (menos ruido que cada 30 min). */}
              {Array.from({ length: totalSlots }, (_, s) => (
                <div
                  key={`s-${s}`}
                  className={`h-7 ${s % 2 === 0 ? 'border-t border-ink/[0.07] dark:border-white/[0.07]' : ''}`}
                />
              ))}

              {/* Eventos: citas + bloqueos */}
              {estado.citasDia.map((c) => (
                <EventoBlock
                  key={c.id}
                  inicio={new Date(c.inicio)}
                  fin={new Date(c.fin)}
                  hourStart={hourStart}
                  tone="cita"
                  title={c.servicio_nombre}
                  estadoCita={c.estado}
                  nombrePaciente={c.paciente_display_name?.trim() || null}
                  pacienteId={c.paciente_id}
                  onActivate={() => onSelectCita(c)}
                />
              ))}
              {estado.bloqueosDia.map((b) => (
                <EventoBlock
                  key={b.id}
                  inicio={new Date(b.inicio)}
                  fin={new Date(b.fin)}
                  hourStart={hourStart}
                  tone="bloqueo"
                  title={b.motivo ?? 'Bloqueo'}
                  bloqueoExtra={b.dia_completo ? 'Día completo' : null}
                />
              ))}
            </div>
          );
        })}
      </div>
        </div>
      </div>
    </SurfaceCard>
  );
}

function EventoBlock(
  props:
    | {
        readonly inicio: Date;
        readonly fin: Date;
        readonly hourStart: number;
        readonly tone: 'cita';
        readonly title: string;
        readonly estadoCita: string;
        readonly nombrePaciente: string | null;
        readonly pacienteId: string;
        readonly onActivate: () => void;
      }
    | {
        readonly inicio: Date;
        readonly fin: Date;
        readonly hourStart: number;
        readonly tone: 'bloqueo';
        readonly title: string;
        readonly bloqueoExtra: string | null;
        readonly onActivate?: undefined;
      }
): JSX.Element | null {
  const { inicio, fin, hourStart, tone, title } = props;
  const minutosDesdeInicio =
    (inicio.getHours() - hourStart) * 60 + inicio.getMinutes();
  const duracionMin = Math.max(
    15,
    (fin.getTime() - inicio.getTime()) / 60000
  );
  if (minutosDesdeInicio < 0) return null;

  const slotPx = 28;
  const top = (minutosDesdeInicio / 30) * slotPx;
  const height = (duracionMin / 30) * slotPx;

  const estiloPos = { top: `${top}px`, height: `${height}px`, minHeight: '20px' } as const;

  const capaBloqueo = `bg-[#c89b5a]/15 ring-1 ring-inset ring-[#c89b5a]/30 text-[#8a6530] dark:bg-[#c89b5a]/30 dark:ring-[#c89b5a]/35 dark:text-[#e9c88a]`;

  if (tone === 'bloqueo') {
    return (
      <div
        className={`absolute left-1 right-1 overflow-hidden rounded-lg px-1.5 py-1 text-left ${capaBloqueo}`}
        style={estiloPos}
        title={`${title}${
          props.bloqueoExtra ? ` · ${props.bloqueoExtra}` : ''
        }`}
      >
        <p className="font-body text-[0.68rem] font-semibold leading-tight tabular-nums">
          {format(inicio, 'HH:mm')}
        </p>
        <p className="font-body text-[0.7rem] leading-tight truncate">
          {title}
        </p>
        {props.bloqueoExtra ? (
          <p className="mt-0.5 font-body text-[0.6rem] leading-tight text-[#6b5025] dark:text-[#c9a76a]">
            {props.bloqueoExtra}
          </p>
        ) : null}
      </div>
    );
  }

  const { estadoCita, nombrePaciente, pacienteId, onActivate } = props;
  const bordeCita = `border-l-2 ${bordeLateralCitaAgenda(estadoCita)}`;
  const capaCita = `bg-primary/12 text-primary-dim ring-1 ring-inset ring-primary/25 dark:bg-primary/30 dark:ring-primary-fixed/35 dark:text-white`;
  const sublinea =
    (nombrePaciente ? `${nombrePaciente} · ` : '') + labelCitaEstadoAgenda(estadoCita);

  return (
    <div className="absolute left-1 right-1" style={estiloPos}>
      <div className="relative h-full w-full min-h-0">
        <button
          type="button"
          onClick={onActivate}
          className={`h-full w-full overflow-hidden rounded-lg py-0.5 pl-1.5 pr-5 text-left outline-none transition hover:brightness-[1.02] focus-visible:ring-2 focus-visible:ring-primary/40 dark:hover:brightness-110 ${bordeCita} ${capaCita}`}
          title={`${title} · ${sublinea}`}
          aria-label={`Cita: ${title}, ${format(inicio, 'HH:mm')}, ${sublinea}`}
        >
          <p className="font-body text-[0.65rem] font-semibold leading-tight tabular-nums">
            {format(inicio, 'HH:mm')}
          </p>
          <p className="line-clamp-1 font-body text-[0.68rem] font-medium leading-tight text-ink/90 dark:text-white">
            {title}
          </p>
          <p className="line-clamp-2 min-h-0 font-body text-[0.55rem] leading-tight text-primary-dim/95 dark:text-white/82">
            {sublinea}
          </p>
        </button>
        <div className="absolute right-0.5 top-0.5 z-10">
          <FichaAgendaLink compact pacienteId={pacienteId} />
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MonthOverview — vista calendario (6 semanas × 7 días)
// ═════════════════════════════════════════════════════════════════════════════
function MonthOverview({
  fechaAncla,
  citas,
  bloqueos,
  aplicaciones,
  plantillas,
  onSelectDay,
}: {
  readonly fechaAncla: Date;
  readonly citas: readonly CitaRow[];
  readonly bloqueos: readonly BloqueoRow[];
  readonly aplicaciones: readonly AplicacionRow[];
  readonly plantillas: readonly PlantillaRow[];
  readonly onSelectDay: (d: Date) => void;
}): JSX.Element {
  const inicio = startOfWeek(startOfMonth(fechaAncla), { weekStartsOn: 1 });
  const fin = endOfWeek(endOfMonth(fechaAncla), { weekStartsOn: 1 });
  const total = Math.round((fin.getTime() - inicio.getTime()) / (24 * 3600 * 1000)) + 1;
  const dias = Array.from({ length: total }, (_, i) => addDays(inicio, i));

  return (
    <SurfaceCard className="overflow-hidden">
      <div className="grid grid-cols-7 border-b border-ink/8 pb-2 mb-2 dark:border-white/8">
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
          <p
            key={d}
            className="font-body text-[0.62rem] uppercase tracking-[0.22em] text-ink-muted text-center dark:text-white/55"
          >
            {d}
          </p>
        ))}
      </div>

      <div className="grid auto-rows-[minmax(5.5rem,1fr)] grid-cols-7 gap-1">
        {dias.map((dia) => {
          const estado = computeDiaEstado(dia, citas, bloqueos, aplicaciones, plantillas);
          const esHoy = isSameDay(dia, new Date());
          const esOtroMes = dia.getMonth() !== fechaAncla.getMonth();
          const tieneEventos =
            estado.citasDia.length > 0 || estado.bloqueosDia.length > 0;

          return (
            <button
              key={dia.toISOString()}
              type="button"
              onClick={() => onSelectDay(dia)}
              className={`min-h-0 rounded-xl p-2 text-left transition-colors ring-1 ring-inset ${
                estado.bloqueadoPorPlantilla
                  ? 'bg-[#c89b5a]/12 ring-[#c89b5a]/25 dark:bg-[#c89b5a]/20 dark:ring-[#c89b5a]/30'
                  : esHoy
                    ? 'bg-primary/8 ring-primary/20 dark:bg-primary/20 dark:ring-primary-fixed/30'
                    : 'bg-white/50 ring-ink/5 hover:bg-white dark:bg-white/3 dark:ring-white/5 dark:hover:bg-white/6'
              } ${esOtroMes ? 'opacity-40' : ''}`}
            >
              <p
                className={`font-display text-[0.95rem] tabular-nums tracking-[-0.01em] ${
                  esHoy
                    ? 'text-primary dark:text-primary-fixed-dim font-semibold'
                    : 'text-ink dark:text-white'
                }`}
              >
                {format(dia, 'd')}
              </p>
              {tieneEventos ? (
                <div className="mt-1 flex flex-wrap gap-0.5">
                  {estado.citasDia.slice(0, 3).map((c) => (
                    <span
                      key={c.id}
                      className={`inline-block h-1.5 w-1.5 rounded-full ${puntoCalendarioCitaEstado(
                        c.estado
                      )}`}
                      aria-hidden="true"
                    />
                  ))}
                  {estado.bloqueosDia.length > 0 ? (
                    <span
                      className="inline-block h-1.5 w-1.5 rounded-full bg-[#c89b5a]"
                      aria-hidden="true"
                    />
                  ) : null}
                </div>
              ) : null}
              {estado.citasDia.length > 0 ? (
                <p className="mt-1 font-body text-[0.65rem] text-ink-muted tabular-nums dark:text-white/50">
                  {estado.citasDia.length} cita{estado.citasDia.length === 1 ? '' : 's'}
                </p>
              ) : null}
              {estado.plantillaActiva && estado.bloqueadoPorPlantilla ? (
                <p className="mt-0.5 font-body text-[0.6rem] text-[#8a6530] truncate dark:text-[#e9c88a]">
                  {estado.plantillaActiva.nombre}
                </p>
              ) : null}
            </button>
          );
        })}
      </div>
    </SurfaceCard>
  );
}
