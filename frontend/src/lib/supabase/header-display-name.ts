/**
 * Los valores de cabecera HTTP suelen limitarse a ISO-8859-1 en la práctica;
 * Next/Edge puede exponer UTF-8 como secuencias %XX (p. ej. Á → %C3%81).
 * Empaquetamos display_name en base64url con prefijo para round-trip seguro.
 */
import { normalizeDisplayNameText } from '@/lib/profile-display-name';

const PREFIX = 'dn1:';

function utf8ToB64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    const b = bytes[i];
    if (b === undefined) break;
    binary += String.fromCharCode(b);
  }
  const b64 = btoa(binary);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64UrlToUtf8(b64url: string): string {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = (4 - (b64.length % 4)) % 4;
  const padded = b64 + '='.repeat(pad);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder('utf-8').decode(bytes);
}

/** Middleware: valor seguro para `x-ss-user-name`. */
export function packDisplayNameForRequestHeader(name: string): string {
  const t = normalizeDisplayNameText(name);
  if (!t) return '';
  return PREFIX + utf8ToB64Url(t);
}

/** Layouts RSC: recuperar el nombre mostrable. */
export function unpackDisplayNameFromRequestHeader(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const s = raw.trim();
  if (!s) return null;
  let plain: string;
  if (s.startsWith(PREFIX)) {
    try {
      plain = b64UrlToUtf8(s.slice(PREFIX.length));
    } catch {
      return null;
    }
  } else if (/%[0-9A-Fa-f]{2}/u.test(s)) {
    try {
      plain = decodeURIComponent(s);
    } catch {
      plain = s;
    }
  } else {
    plain = s;
  }
  const n = normalizeDisplayNameText(plain);
  return n.length > 0 ? n : null;
}
