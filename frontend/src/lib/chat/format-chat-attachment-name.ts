/**
 * Nombre almacenado (sanitizado) → etiqueta amigable en burbuja, alt y previsualización.
 * No modifica el valor de BD: solo capa de presentación.
 */
export function formatChatAttachmentDisplayName(input: string): string {
  const s = String(input).trim();
  if (s.length === 0) return 'Archivo';

  let leaf = s;
  try {
    leaf = decodeURIComponent(leaf);
  } catch {
    /* dejar tal cual */
  }
  if (leaf.includes('/')) {
    const parts = leaf.split('/').filter((p) => p.length > 0);
    leaf = parts.length > 0 ? parts[parts.length - 1] ?? leaf : leaf;
  }

  if (/^voz-\d+\.(webm|ogg)$/iu.test(leaf)) {
    return 'Nota de voz';
  }

  const withSpaces = leaf.replace(/_+/g, ' ').replace(/\s{2,}/g, ' ').trim() || leaf;
  const max = 50;
  if (withSpaces.length > max) {
    return `${withSpaces.slice(0, 24)}…${withSpaces.slice(-10)}`;
  }
  return withSpaces;
}
