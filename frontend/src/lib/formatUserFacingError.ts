/**
 * Convierte cualquier error de red/SDK en texto legible (evita [object Object] en UI).
 */
export function formatUserFacingError(e: unknown): string {
  if (e == null) return 'Error desconocido.';
  if (typeof e === 'string') return e;
  if (e instanceof Error) return e.message || 'Error desconocido.';
  if (typeof e === 'object' && 'message' in e) {
    const m = (e as { message: unknown }).message;
    if (typeof m === 'string' && m.length > 0) return m;
  }
  try {
    return JSON.stringify(e);
  } catch {
    return 'Error desconocido.';
  }
}
