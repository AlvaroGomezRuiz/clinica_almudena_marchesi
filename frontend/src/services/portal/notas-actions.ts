'use server';

/**
 * Acciones CRUD sobre public.citas_notas_paciente desde el portal paciente.
 *
 * RLS:
 *   - SELECT sólo propias notas.
 *   - INSERT con autor_user_id = auth.uid() y paciente mío.
 *   - UPDATE / DELETE sólo si autor_user_id = auth.uid().
 *
 * F5 CIFRADO:
 *   - La creación/actualización va por `nota_cita_guardar_cifrada` RPC que
 *     cifra `contenido` (AES-256) + guarda el mirror plaintext para
 *     compatibilidad MVP; este mirror desaparece en la migración 0024.
 */

import { revalidatePath } from 'next/cache';

import { createServerClient } from '@/lib/supabase/server';

interface Result {
  readonly ok: boolean;
  readonly message?: string;
  readonly id?: string;
}

async function requirePaciente(): Promise<{
  supabase: ReturnType<typeof createServerClient>;
  userId: string;
  pacienteId: string;
}> {
  const supabase = createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error('not_authenticated');

  const { data: pac, error: pErr } = await supabase
    .from('pacientes')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle<{ id: string }>();
  if (pErr || !pac) throw new Error('paciente_not_found');

  return { supabase, userId: user.id, pacienteId: pac.id };
}

export async function crearNotaCitaAction(
  citaId: string,
  contenido: string
): Promise<Result> {
  try {
    const texto = contenido.trim().slice(0, 4000);
    if (texto.length === 0) {
      return { ok: false, message: 'contenido_vacio' };
    }
    const { supabase, userId, pacienteId } = await requirePaciente();

    // PACIENTE: inserción directa en plaintext (contenido). La columna
    // `contenido_ciphertext` existe pero `app_encrypt` está restringida
    // a service_role → un trigger BEFORE INSERT/UPDATE (pendiente migración
    // 0024) mirará plaintext y rellenará ciphertext automáticamente. Hasta
    // entonces, sólo las notas de admin (RPC `nota_cita_guardar_cifrada`)
    // quedan cifradas en reposo.
    const { data, error } = await supabase
      .from('citas_notas_paciente')
      .insert({
        cita_id: citaId,
        paciente_id: pacienteId,
        autor_user_id: userId,
        contenido: texto,
      } as never)
      .select('id')
      .single<{ id: string }>();

    if (error) return { ok: false, message: error.message };
    revalidatePath('/portal/citas');
    return { ok: true, id: data.id };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'error_desconocido',
    };
  }
}

export async function actualizarNotaCitaAction(
  notaId: string,
  contenido: string
): Promise<Result> {
  try {
    const texto = contenido.trim().slice(0, 4000);
    if (texto.length === 0) return { ok: false, message: 'contenido_vacio' };
    const { supabase, userId } = await requirePaciente();

    const { error } = await supabase
      .from('citas_notas_paciente')
      .update({ contenido: texto } as never)
      .eq('id', notaId)
      .eq('autor_user_id', userId);

    if (error) return { ok: false, message: error.message };
    revalidatePath('/portal/citas');
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'error_desconocido',
    };
  }
}

export async function eliminarNotaCitaAction(notaId: string): Promise<Result> {
  try {
    const { supabase, userId } = await requirePaciente();
    const { error } = await supabase
      .from('citas_notas_paciente')
      .delete()
      .eq('id', notaId)
      .eq('autor_user_id', userId);
    if (error) return { ok: false, message: error.message };
    revalidatePath('/portal/citas');
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'error_desconocido',
    };
  }
}
