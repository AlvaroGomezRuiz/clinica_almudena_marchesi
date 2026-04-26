/**
 * Resuelve URL de avatar para una fila de `v_conversaciones_admin`: primero
 * `profiles.avatar_url` del paciente, luego `pacientes.avatar_url`, color de ficha.
 */
export interface PacienteRowLite {
  readonly id: string;
  readonly user_id: string | null;
  readonly avatar_url: string | null;
  readonly color_etiqueta: string | null;
}

export function initialsConversacionList(display: string, fallbackEmail: string | null): string {
  const source = display.trim() || (fallbackEmail ?? '?');
  const parts = source.split(/[\s@]+/).filter(Boolean).slice(0, 2);
  const s =
    parts.map((w) => w[0]?.toUpperCase() ?? '').join('') || source.slice(0, 1).toUpperCase();
  return s || '?';
}

export function imageUrlConversacionList(
  pacienteId: string,
  pacienteUserId: string | null,
  pacById: ReadonlyMap<string, PacienteRowLite>,
  profileAvatarByUserId: ReadonlyMap<string, string | null>
): string | null {
  if (pacienteUserId) {
    const pAv = profileAvatarByUserId.get(pacienteUserId)?.trim();
    if (pAv) {
      return pAv;
    }
  }
  const p = pacById.get(pacienteId);
  return p?.avatar_url?.trim() && p.avatar_url.length > 0 ? p.avatar_url : null;
}

export function colorEtiquetaConversacionList(
  pacienteId: string,
  pacById: ReadonlyMap<string, PacienteRowLite>
): string | null {
  return pacById.get(pacienteId)?.color_etiqueta ?? null;
}
