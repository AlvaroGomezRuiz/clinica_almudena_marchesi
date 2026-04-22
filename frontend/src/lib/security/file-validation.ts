/**
 * Validación de archivos por magic bytes (firma binaria).
 *
 * ¿Por qué? `Content-Type` y `file.name` vienen del cliente y son triviales de
 * falsificar. Un atacante puede renombrar `malware.exe` a `foto.png` con
 * `Content-Type: image/png`. Si solo confiamos en el MIME declarado, subimos
 * el ejecutable a nuestro bucket y potencialmente lo servimos con un
 * `Content-Type` que navegadores antiguos pueden interpretar mal.
 *
 * Esta función revisa las primeras bytes del buffer contra las firmas conocidas
 * de los formatos que aceptamos. Es un cinturón de seguridad adicional al MIME.
 */

export type AllowedFileKind =
  | 'png'
  | 'jpeg'
  | 'webp'
  | 'heic'
  | 'pdf'
  | 'gif'
  | 'avif'
  | 'webm'
  | 'ogg'
  | 'mpeg'
  | 'm4a';

interface Signature {
  kind: AllowedFileKind;
  /** Offset donde empieza la firma. */
  offset: number;
  /** Bytes esperados (hex). */
  bytes: readonly number[];
}

/* Firmas binarias oficiales. Fuente: https://en.wikipedia.org/wiki/List_of_file_signatures */
const SIGNATURES: readonly Signature[] = [
  { kind: 'png', offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { kind: 'jpeg', offset: 0, bytes: [0xff, 0xd8, 0xff] },
  { kind: 'gif', offset: 0, bytes: [0x47, 0x49, 0x46, 0x38] },
  { kind: 'pdf', offset: 0, bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] }, // %PDF-
  /* WEBP es un contenedor RIFF: los bytes 8-11 son "WEBP". */
  { kind: 'webp', offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] },
  /* HEIC/HEIF/AVIF usan ISOBMFF: bytes 4-7 son "ftyp", 8-11 indica sub-tipo. */
  { kind: 'heic', offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] },
  { kind: 'avif', offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] },
  /* WebM / Matroska (EBML) */
  { kind: 'webm', offset: 0, bytes: [0x1a, 0x45, 0xdf, 0xa3] },
  /* Ogg (OggS) */
  { kind: 'ogg', offset: 0, bytes: [0x4f, 0x67, 0x67, 0x53] },
  /* ISO base media (MP4 / M4A) — requiere comprobación de ftyp (ver detectFileKind) */
  { kind: 'm4a', offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] },
];

function matchesSignature(buf: Uint8Array, sig: Signature): boolean {
  if (buf.length < sig.offset + sig.bytes.length) return false;
  for (let i = 0; i < sig.bytes.length; i += 1) {
    if (buf[sig.offset + i] !== sig.bytes[i]) return false;
  }
  return true;
}

/**
 * Devuelve el tipo detectado o null si el buffer no coincide con ningún tipo
 * permitido. Solo examina los primeros 32 bytes: barato y suficiente.
 */
export function detectFileKind(
  buffer: Uint8Array,
  allowed: readonly AllowedFileKind[]
): AllowedFileKind | null {
  const head = buffer.subarray(0, 32);
  for (const sig of SIGNATURES) {
    if (!allowed.includes(sig.kind)) continue;
    if (matchesSignature(head, sig)) {
      /* Para HEIC/AVIF necesitamos verificar el sub-tipo en bytes 8-11.
         Evitamos `String.fromCharCode(...buf)` (spread sobre Uint8Array requiere
         downlevelIteration en TS). Iteramos manualmente, es idéntico y portable. */
      const readSubType = (): string => {
        let out = '';
        for (let i = 8; i < 12 && i < head.length; i += 1) {
          out += String.fromCharCode(head[i] ?? 0);
        }
        return out;
      };
      if (sig.kind === 'heic') {
        const sub = readSubType();
        if (['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].includes(sub)) {
          return 'heic';
        }
        continue;
      }
      if (sig.kind === 'avif') {
        const sub = readSubType();
        if (['avif', 'avis'].includes(sub)) return 'avif';
        continue;
      }
      if (sig.kind === 'm4a') {
        const sub = readSubType();
        /* Candidatos audio/vídeo en contenedor ISOBMFF; aceptamos marcas de audio típicas. */
        if (['M4A ', 'M4B ', 'mp42'].includes(sub)) {
          return 'm4a';
        }
        continue;
      }
      return sig.kind;
    }
  }

  /* MPEG-1/2 layer audio (MP3) — sync 0xFF y siguiente byte con bits altos 111xxxxx. */
  if (allowed.includes('mpeg') && head.length >= 2) {
    if (head[0] === 0xff && (head[1] & 0xe0) === 0xe0) {
      return 'mpeg';
    }
    /* ID3v2 (metadatos delante de frames MP3) */
    if (head[0] === 0x49 && head[1] === 0x44 && head[2] === 0x33) {
      return 'mpeg';
    }
  }

  return null;
}

/**
 * Mapa MIME → kind para checks cruzados (evitar que `image/png` con bytes `.exe`
 * pasen como PNG).
 */
export function kindFromMime(mime: string): AllowedFileKind | null {
  switch (mime) {
    case 'image/png':
      return 'png';
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpeg';
    case 'image/webp':
      return 'webp';
    case 'image/heic':
    case 'image/heif':
      return 'heic';
    case 'image/avif':
      return 'avif';
    case 'image/gif':
      return 'gif';
    case 'application/pdf':
      return 'pdf';
    case 'audio/webm':
      return 'webm';
    case 'audio/ogg':
    case 'application/ogg':
      return 'ogg';
    case 'audio/mpeg':
    case 'audio/mp3':
      return 'mpeg';
    case 'audio/mp4':
    case 'audio/x-m4a':
    case 'audio/aac':
      return 'm4a';
    default:
      return null;
  }
}
