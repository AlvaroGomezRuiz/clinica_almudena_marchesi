/**
 * Geometría compartida de la vista semanal admin (píxeles explícitos = sin desfase rem/border).
 */

export const AGENDA_WEEK_GRID = {
  /** Primera etiqueta de hora (Europe/Madrid). */
  HOUR_FIRST: 9,
  /** Última etiqueta de hora en la columna izquierda (inclusive). */
  HOUR_LAST_LABEL: 21,
  SLOT_MINUTES: 30,
  SLOT_PX: 28,
} as const;

export function agendaWeekSlotCount(): number {
  const hours = AGENDA_WEEK_GRID.HOUR_LAST_LABEL - AGENDA_WEEK_GRID.HOUR_FIRST + 1;
  return (hours * 60) / AGENDA_WEEK_GRID.SLOT_MINUTES;
}

export function agendaWeekGridBodyHeightPx(): number {
  return agendaWeekSlotCount() * AGENDA_WEEK_GRID.SLOT_PX;
}
