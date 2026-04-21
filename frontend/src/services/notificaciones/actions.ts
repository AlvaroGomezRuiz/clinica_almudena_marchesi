'use server';

/**
 * Server Actions para preferencias de notificaciones por email del paciente.
 * Los cambios aplican vía RLS (policy "user updates own email prefs").
 */

import { revalidatePath } from 'next/cache';

import { createServerClient } from '@/lib/supabase/server';
import { getSupabaseEnv } from '@/lib/supabase/env';

export type EmailPrefKey =
  | 'welcome'
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'reminder_24h'
  | 'nueva_asignacion';

const VALID_KEYS: readonly EmailPrefKey[] = [
  'welcome',
  'booking_confirmed',
  'booking_cancelled',
  'reminder_24h',
  'nueva_asignacion',
];

export interface EmailPrefs {
  readonly welcome: boolean;
  readonly booking_confirmed: boolean;
  readonly booking_cancelled: boolean;
  readonly reminder_24h: boolean;
  readonly nueva_asignacion: boolean;
}

export type UpdatePrefsResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: string };

export async function updateEmailPrefsAction(
  formData: FormData
): Promise<UpdatePrefsResult> {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'unauthenticated' };

  const patch: Partial<Record<EmailPrefKey, boolean>> = {};
  for (const key of VALID_KEYS) {
    patch[key] = formData.get(key) === 'on';
  }

  try {
    await upsertPrefs(supabase, {
      user_id: user.id,
      ...patch,
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { ok: false, error: msg };
  }

  revalidatePath('/portal/ajustes');
  return { ok: true };
}

async function upsertPrefs(
  supabase: ReturnType<typeof createServerClient>,
  payload: { user_id: string } & Partial<Record<EmailPrefKey, boolean>> & { updated_at: string }
): Promise<void> {
  const { url, anonKey } = getSupabaseEnv();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.access_token) {
    throw new Error('No hay sesión válida para actualizar preferencias.');
  }

  const res = await fetch(`${url}/rest/v1/notificaciones_prefs?on_conflict=user_id`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Upsert notificaciones_prefs falló (${res.status}): ${detail}`);
  }
}
