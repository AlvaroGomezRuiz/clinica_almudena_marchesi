// ============================================================================
// Helpers de Sentry para call sites clínicos
// ----------------------------------------------------------------------------
// Usa estos helpers SIEMPRE en vez de `Sentry.captureException` directamente.
// Garantizan:
//   1. Tags consistentes (`area`, `severity`, `user_kind`).
//   2. Zero PII: nunca pasamos email, nombre ni contenido sensible.
//   3. Fingerprint agrupado → Sentry agrupa bien errores relacionados.
// ============================================================================

import * as Sentry from "@sentry/nextjs";

export type ClinicalArea =
  | "auth"
  | "booking"
  | "payments"
  | "stripe-webhook"
  | "invoice-pdf"
  | "rgpd"
  | "chat"
  | "storage"
  | "admin-sensitive"
  | "edge-function";

export type Severity = "fatal" | "error" | "warning" | "info";

export interface ClinicalContext {
  area: ClinicalArea;
  /** Opcional: UUID opaco del paciente (NUNCA email ni nombre) */
  patient_id?: string;
  /** Opcional: UUID opaco de la cita/pago/recurso relacionado */
  entity_id?: string;
  /** Etiqueta libre, solo valores enum (nada de texto libre con PII) */
  operation?: string;
  /** fingerprint explícito para agrupar (opcional) */
  fingerprint?: string[];
}

/**
 * Captura una excepción con contexto clínico, sin enviar PII.
 *
 * @example
 *   try { await procesarPago(pagoId); }
 *   catch (err) {
 *     captureClinicalError(err, { area: "payments", entity_id: pagoId });
 *     throw err;
 *   }
 */
export function captureClinicalError(
  err: unknown,
  ctx: ClinicalContext,
  severity: Severity = "error"
): void {
  Sentry.withScope((scope) => {
    scope.setLevel(severity);
    scope.setTag("area", ctx.area);
    if (ctx.operation) scope.setTag("operation", ctx.operation);
    if (ctx.patient_id) scope.setTag("patient_id", ctx.patient_id);
    if (ctx.entity_id) scope.setTag("entity_id", ctx.entity_id);
    if (ctx.fingerprint) scope.setFingerprint(ctx.fingerprint);

    if (err instanceof Error) {
      Sentry.captureException(err);
    } else {
      Sentry.captureMessage(String(err), severity);
    }
  });
}

/**
 * Mensaje informativo estructurado (no excepción). Úsalo para eventos
 * críticos del dominio que NO son errores pero deben quedar registrados:
 *   - "pago completado sin numero_factura" (inconsistencia recuperable)
 *   - "rgpd export generado" (audit trail secundario)
 */
export function captureClinicalMessage(
  message: string,
  ctx: ClinicalContext,
  severity: Severity = "info"
): void {
  Sentry.withScope((scope) => {
    scope.setLevel(severity);
    scope.setTag("area", ctx.area);
    if (ctx.operation) scope.setTag("operation", ctx.operation);
    if (ctx.patient_id) scope.setTag("patient_id", ctx.patient_id);
    if (ctx.entity_id) scope.setTag("entity_id", ctx.entity_id);
    Sentry.captureMessage(message, severity);
  });
}

/**
 * Identifica al usuario actual con un ID opaco (UUID de Supabase Auth).
 * NUNCA pasamos email ni nombre. Si algún día hace falta revertir una
 * sesión a un paciente concreto, se consulta el UUID en Supabase con
 * auditoría en `admin_lookups`.
 */
export function setUserContext(userId: string | null, role?: string): void {
  if (!userId) {
    Sentry.setUser(null);
    return;
  }
  Sentry.setUser({ id: userId, segment: role ?? "unknown" });
}
