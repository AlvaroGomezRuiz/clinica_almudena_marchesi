/**
 * Nombre visible: `profiles.display_name` (UTF-8), luego
 * `user.user_metadata.full_name`, y (solo en shell/topbar) parte local del email
 * o "Usuario". Las cadenas pueden llegar con secuencias %XX: se normalizan
 * (bucle acotado) para cabecera y saludos.
 */
const PERCENT_BYTE = /%[0-9A-Fa-f]{2}/u;

/** Decodifica `decodeURIComponent` en bucle (p. ej. doble-escape) y recorta. */
export function normalizeDisplayNameText(input: string | null | undefined): string {
  if (input == null) return '';
  let s = String(input).trim();
  if (s.length === 0) return '';
  for (let d = 0; d < 3; d += 1) {
    if (!PERCENT_BYTE.test(s)) break;
    try {
      const next = decodeURIComponent(s);
      if (next === s) break;
      s = next.trim();
    } catch {
      break;
    }
  }
  return s;
}

/**
 * Solo perfil o metadata: sin parte local de email. Para saludos “con nombre
 * real” o copy que no debe sonar a slug de email.
 */
export function getPreferredProfileFullName(
  profileDisplayName: string | null | undefined,
  metadataFullName: string | null | undefined
): string {
  const a = normalizeDisplayNameText(profileDisplayName);
  if (a.length > 0) return a;
  return normalizeDisplayNameText(metadataFullName);
}

/** Nombre en cabecera / topbar: incluye fallback a parte local del email. */
export function resolveProfileDisplayNameForShell(
  profileDisplayName: string | null | undefined,
  metadataFullName: string | null | undefined,
  email: string | null | undefined
): string {
  const preferred = getPreferredProfileFullName(profileDisplayName, metadataFullName);
  if (preferred.length > 0) return preferred;
  const local = email?.split('@')[0];
  const n = normalizeDisplayNameText(local);
  if (n.length > 0) return n;
  return 'Usuario';
}
