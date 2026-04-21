'use server';

/**
 * Server Actions para preferencias de notificaciones por email del paciente.
 * Los cambios aplican vía RLS (policy "user updates own email prefs").
 */

import { revalidatePath } from 'next/cache';

import { createServerClient } from '@/lib/supabase/server';

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

  const { error } = await supabase
    .from('notificaciones_prefs')
    .upsert(
      { user_id: user.id, ...patch, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );

  if (error) return { ok: false, error: error.message };

  revalidatePath('/portal/ajustes');
  return { ok: true };
}
