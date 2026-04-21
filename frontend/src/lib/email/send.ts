import 'server-only';

/**
 * Helper server-only para invocar la Edge Function `send-email`.
 *
 * Diseño fire-and-forget con timeout corto — los emails son mejor-esfuerzo,
 * jamás bloquean el flujo principal (reserva, cancelación, asignación).
 *
 * Security:
 *   * Solo se invoca desde Server Actions o Route Handlers.
 *   * Usa anon key pública (válida porque la Edge Function usa service_role
 *     internamente para bypass RLS al insertar en emails_log).
 */

import { getSupabaseEnv } from '@/lib/supabase/env';

export type EmailType =
  | 'welcome'
  | 'booking_confirmed'
  | 'reminder_24h'
  | 'booking_cancelled'
  | 'nueva_asignacion';

interface SendEmailInput {
  readonly type: EmailType;
  readonly toUserId?: string;
  readonly toEmail?: string;
  readonly citaId?: string;
  readonly data?: Readonly<Record<string, unknown>>;
}

interface SendEmailResult {
  readonly ok: boolean;
  readonly deduped?: boolean;
  readonly skipped?: string;
  readonly providerId?: string;
  readonly error?: string;
}

const TIMEOUT_MS = 8_000;

export async function sendTransactionalEmail(
  input: SendEmailInput
): Promise<SendEmailResult> {
  const env = getSupabaseEnv();
  const endpoint = `${env.url}/functions/v1/send-email`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.anonKey}`,
      },
      body: JSON.stringify({
        type: input.type,
        to_user_id: input.toUserId,
        to_email: input.toEmail,
        cita_id: input.citaId,
        data: input.data,
      }),
      signal: controller.signal,
      cache: 'no-store',
    });

    const body = (await res.json().catch(() => ({}))) as SendEmailResult;

    if (!res.ok) {
      return { ok: false, error: body.error ?? `http_${res.status}` };
    }
    return body;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'network_error';
    return { ok: false, error: message };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Wrapper fire-and-forget: nunca lanza, nunca bloquea el flujo principal.
 * Devuelve una promesa que podemos opcionalmente `await` para telemetría.
 */
export function fireEmail(input: SendEmailInput): Promise<SendEmailResult> {
  return sendTransactionalEmail(input).catch((err: unknown) => ({
    ok: false as const,
    error: err instanceof Error ? err.message : 'unknown',
  }));
}
