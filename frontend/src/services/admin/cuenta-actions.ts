'use server';

/**
 * Acciones de cuenta (perfil + preferencias) para admin y paciente.
 *
 * - actualizarPerfilAction: cambia display_name en profiles.
 * - actualizarPreferenciasAction: toggles de notificaciones y tema.
 *
 * Ambas sólo requieren sesión válida (cada usuario toca sus propios datos).
 */

import { revalidatePath } from 'next/cache';

import { createServerClient } from '@/lib/supabase/server';
import { getSupabaseEnv } from '@/lib/supabase/env';
import type { PreferenciaTema } from '@/lib/supabase/types';

async function fireRgpdAck(
  requestId: string,
  accessToken: string
): Promise<void> {
  try {
    const { url } = getSupabaseEnv();
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 5000);
    await fetch(`${url}/functions/v1/rgpd-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ request_id: requestId, mode: 'ack' }),
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(t);
  } catch {
    // Fire-and-forget: si falla el email no bloqueamos al usuario.
  }
}

interface Result {
  readonly ok: boolean;
  readonly message?: string;
}

async function requireUser(): Promise<{
  supabase: ReturnType<typeof createServerClient>;
  userId: string;
}> {
  const supabase = createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('not_authenticated');
  }
  return { supabase, userId: user.id };
}

export async function actualizarPerfilAction(
  displayName: string
): Promise<Result> {
  try {
    const nombre = displayName.trim().slice(0, 120);
    if (nombre.length < 2) {
      return { ok: false, message: 'nombre_demasiado_corto' };
    }
    const { supabase, userId } = await requireUser();

    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: nombre,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) return { ok: false, message: error.message };
    revalidatePath('/admin/configuracion');
    revalidatePath('/portal/ajustes');
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'error_desconocido',
    };
  }
}

export interface PreferenciasPatch {
  readonly tema?: PreferenciaTema;
  readonly privacy_mode_default?: boolean;
  readonly sound?: boolean;
  readonly desktop_notifications?: boolean;
  readonly chat_nuevo_mensaje?: boolean;
  readonly marketing?: boolean;
  readonly welcome?: boolean;
  readonly booking_confirmed?: boolean;
  readonly booking_cancelled?: boolean;
  readonly reminder_24h?: boolean;
  readonly reminder_48h?: boolean;
  readonly nueva_asignacion?: boolean;
}

export async function actualizarPreferenciasAction(
  patch: PreferenciasPatch
): Promise<Result> {
  try {
    const { supabase, userId } = await requireUser();

    const clean: Record<string, string | boolean> = {};
    for (const [k, v] of Object.entries(patch)) {
      if (v !== undefined) clean[k] = v as string | boolean;
    }
    if (Object.keys(clean).length === 0) {
      return { ok: true };
    }

    clean.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('notificaciones_prefs')
      .upsert({
        user_id: userId,
        ...clean,
      } as never);

    if (error) return { ok: false, message: error.message };
    revalidatePath('/admin/configuracion');
    revalidatePath('/portal/ajustes');
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'error_desconocido',
    };
  }
}

export type RgpdDerecho =
  | 'exportar'
  | 'rectificar'
  | 'portabilidad'
  | 'limitacion';

/**
 * Crea una solicitud RGPD (acceso/exportar/rectificar/portabilidad/limitación).
 * La resolución se procesa offline por la Edge Function rgpd-request (F5).
 */
export async function solicitarDerechoRgpdAction(
  derecho: RgpdDerecho,
  motivo: string
): Promise<Result> {
  try {
    const { supabase, userId } = await requireUser();
    const texto = motivo.trim().slice(0, 2000);

    const { data: inserted, error } = await supabase
      .from('rgpd_requests')
      .insert({
        user_id: userId,
        tipo: derecho,
        estado: 'pendiente',
        motivo: texto.length > 0 ? texto : null,
      } as never)
      .select('id')
      .single<{ id: string }>();

    if (error) return { ok: false, message: error.message };

    const { data: { session } } = await supabase.auth.getSession();
    if (inserted?.id && session?.access_token) {
      await fireRgpdAck(inserted.id, session.access_token);
    }

    revalidatePath('/admin/configuracion');
    revalidatePath('/portal/ajustes');
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'error_desconocido',
    };
  }
}

export async function solicitarBajaCuentaAction(
  motivo: string
): Promise<Result> {
  try {
    const { supabase, userId } = await requireUser();
    const texto = motivo.trim().slice(0, 2000);

    const { data: inserted, error } = await supabase
      .from('rgpd_requests')
      .insert({
        user_id: userId,
        tipo: 'borrado',
        estado: 'pendiente',
        motivo: texto.length > 0 ? texto : null,
      } as never)
      .select('id')
      .single<{ id: string }>();

    if (error) return { ok: false, message: error.message };

    const { data: { session } } = await supabase.auth.getSession();
    if (inserted?.id && session?.access_token) {
      await fireRgpdAck(inserted.id, session.access_token);
    }

    revalidatePath('/admin/configuracion');
    revalidatePath('/portal/ajustes');
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'error_desconocido',
    };
  }
}
