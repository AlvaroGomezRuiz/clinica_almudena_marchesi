/**
 * Fila de cita en agenda admin — campos alineados con `public.v_citas_expandidas`.
 */
export interface AgendaCitaRow {
  readonly id: string;
  readonly inicio: string;
  readonly fin: string;
  readonly estado: string;
  readonly servicio_nombre: string;
  readonly paciente_user_id: string | null;
  readonly paciente_id: string;
  readonly duracion_minutos: number | null;
  readonly precio_centimos: number | null;
}

/** Alias histórico usado por `AgendaClient` y la página server. */
export type CitaRow = AgendaCitaRow;
