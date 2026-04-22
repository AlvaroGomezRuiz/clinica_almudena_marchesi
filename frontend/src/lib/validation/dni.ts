/**
 * Validación de DNI / NIE español con cálculo oficial de la letra de control.
 *
 * Referencia: https://www.boe.es/buscar/act.php?id=BOE-A-2010-3571
 *
 *   DNI:   8 dígitos + letra        (p.ej.  12345678Z)
 *   NIE:   X|Y|Z + 7 dígitos + letra (p.ej. X1234567L)
 *
 * La letra se obtiene como `LETTERS[numero mod 23]`, donde `numero` es:
 *   - El número puro (8 dígitos) para DNI.
 *   - El número con la X/Y/Z sustituida por 0/1/2 para NIE.
 *
 * Devuelve el documento normalizado (mayúsculas, sin espacios ni guiones)
 * o `null` si es inválido.
 */

const LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE' as const;

const DNI_RE = /^(\d{8})([A-Z])$/;
const NIE_RE = /^([XYZ])(\d{7})([A-Z])$/;

export interface DniValidationResult {
  readonly ok: boolean;
  readonly normalized: string | null;
  readonly kind: 'dni' | 'nie' | null;
  readonly error: string | null;
}

export function validateDniNie(rawInput: string): DniValidationResult {
  const cleaned = (rawInput ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]/g, '');

  if (!cleaned) {
    return { ok: false, normalized: null, kind: null, error: 'DNI/NIE obligatorio.' };
  }

  const dniMatch = cleaned.match(DNI_RE);
  if (dniMatch) {
    const numero = Number.parseInt(dniMatch[1]!, 10);
    const letraEsperada = LETTERS[numero % 23];
    if (letraEsperada !== dniMatch[2]) {
      return {
        ok: false,
        normalized: null,
        kind: 'dni',
        error: 'La letra del DNI no coincide con el número.',
      };
    }
    return { ok: true, normalized: cleaned, kind: 'dni', error: null };
  }

  const nieMatch = cleaned.match(NIE_RE);
  if (nieMatch) {
    const prefix = nieMatch[1]!;
    const prefixDigit = prefix === 'X' ? '0' : prefix === 'Y' ? '1' : '2';
    const numero = Number.parseInt(`${prefixDigit}${nieMatch[2]}`, 10);
    const letraEsperada = LETTERS[numero % 23];
    if (letraEsperada !== nieMatch[3]) {
      return {
        ok: false,
        normalized: null,
        kind: 'nie',
        error: 'La letra del NIE no coincide con el número.',
      };
    }
    return { ok: true, normalized: cleaned, kind: 'nie', error: null };
  }

  return {
    ok: false,
    normalized: null,
    kind: null,
    error: 'Formato no válido. Introduce 8 dígitos + letra (DNI) o X/Y/Z + 7 dígitos + letra (NIE).',
  };
}

/** Atajo boolean para validaciones rápidas. */
export function isValidDniNie(raw: string): boolean {
  return validateDniNie(raw).ok;
}
