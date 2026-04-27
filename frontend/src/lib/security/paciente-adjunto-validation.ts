/**
 * Validación de adjuntos de ficha clínica (bucket `paciente-adjuntos`).
 *
 * Combina magic-bytes (`file-validation`) para PDF/imagen con heurísticas
 * para OOXML (ZIP + fragmentos típicos) y OLE compuesto (.doc/.xls antiguos).
 */

import {
  detectFileKind,
  kindFromMime,
  type AllowedFileKind,
} from '@/lib/security/file-validation';

export const PACIENTE_ADJUNTO_MAX_BYTES = 52_428_800; /* 50 MiB (bucket) */

function mimeBase(mime: string): string {
  return mime.split(';')[0]?.trim().toLowerCase() ?? '';
}

/** Tipos estándar validados por firma binaria (alineados con chat/mensajes). */
const STANDARD_KINDS: readonly AllowedFileKind[] = [
  'png',
  'jpeg',
  'webp',
  'heic',
  'gif',
  'avif',
  'pdf',
];

const STANDARD_MIME_BASE = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/gif',
  'image/avif',
  'application/pdf',
]);

const OOXML_MIME_BASE = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

const LEGACY_OLE_MIME_BASE = new Set([
  'application/msword',
  'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint',
]);

function isPkZipLocalHeader(head: Uint8Array): boolean {
  return (
    head.length >= 4 &&
    head[0] === 0x50 &&
    head[1] === 0x4b &&
    (head[2] === 0x03 || head[2] === 0x05 || head[2] === 0x07) &&
    (head[3] === 0x04 || head[3] === 0x06 || head[3] === 0x08)
  );
}

/**
 * OOXML: ZIP con indicios de paquete Office en los primeros 64 KiB.
 */
function looksLikeOoxmlZip(bytes: Uint8Array): boolean {
  if (!isPkZipLocalHeader(bytes)) return false;
  const n = Math.min(bytes.length, 65536);
  const scan = bytes.subarray(0, n);
  let ascii = '';
  for (let i = 0; i < scan.length; i += 1) {
    ascii += String.fromCharCode(scan[i] ?? 0);
  }
  return (
    ascii.includes('[Content_Types].xml') &&
    (ascii.includes('word/') || ascii.includes('xl/') || ascii.includes('ppt/'))
  );
}

function isOleCompoundDocument(head: Uint8Array): boolean {
  return (
    head.length >= 8 &&
    head[0] === 0xd0 &&
    head[1] === 0xcf &&
    head[2] === 0x11 &&
    head[3] === 0xe0 &&
    head[4] === 0xa1 &&
    head[5] === 0xb1 &&
    head[6] === 0x1a &&
    head[7] === 0xe1
  );
}

export type PacienteAdjuntoValidateResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly code: string };

/**
 * Valida tamaño declarado + coherencia MIME ↔ bytes.
 */
export function validatePacienteAdjuntoBytes(params: {
  readonly declaredMime: string;
  readonly bytes: Uint8Array;
  readonly sizeBytes: number;
}): PacienteAdjuntoValidateResult {
  if (params.sizeBytes > PACIENTE_ADJUNTO_MAX_BYTES) {
    return { ok: false, code: 'file_demasiado_grande' };
  }

  const base = mimeBase(params.declaredMime);

  if (STANDARD_MIME_BASE.has(base)) {
    const declaredKind = kindFromMime(base);
    if (!declaredKind || !STANDARD_KINDS.includes(declaredKind)) {
      return { ok: false, code: 'mime_no_soportado' };
    }
    const detected = detectFileKind(params.bytes, STANDARD_KINDS);
    if (!detected || detected !== declaredKind) {
      return { ok: false, code: 'file_signature_mismatch' };
    }
    return { ok: true };
  }

  if (OOXML_MIME_BASE.has(base) || base === 'application/zip') {
    if (!looksLikeOoxmlZip(params.bytes)) {
      return { ok: false, code: 'ooxml_invalido' };
    }
    return { ok: true };
  }

  if (LEGACY_OLE_MIME_BASE.has(base)) {
    if (!isOleCompoundDocument(params.bytes)) {
      return { ok: false, code: 'ole_invalido' };
    }
    return { ok: true };
  }

  return { ok: false, code: 'mime_no_soportado' };
}

export function sanitizePacienteAdjuntoNombre(name: string): string {
  const clean = name.normalize('NFKD').replace(/[^\w.\- ]/g, '_').trim();
  return clean.slice(0, 120) || 'archivo';
}
