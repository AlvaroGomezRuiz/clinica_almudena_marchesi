import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/supabase/types';

/**
 * Rutas permitidas sin “portal desbloqueado” (pago, bono con sesión o cita
 * confirmada; ver `isPortalUnlocked` en middleware). Operativas durante el primer
 * flujo económico/clínico. La bienvenida obligatoria (una vez) se controla con
 * `profiles.portal_welcome_completed_at` en layout + middleware (`x-ss-portal-welcome-done`).
 */
export function isPortalGateBypassPath(pathname: string): boolean {
  if (pathname === '/portal/bienvenida') return true;
  if (pathname.startsWith('/portal/pagos')) return true;
  if (pathname.startsWith('/portal/citas')) return true;
  return false;
}

/**
 * Portal “desbloqueado” = ya hay relación económica o clínica establecida.
 * - Al menos un pago completado, o
 * - Bono activo con sesiones disponibles, o
 * - Alguna cita confirmada o completada.
 *
 * Sin fila `pacientes` → no bloqueamos (caso borde / registro incompleto).
 */
export async function isPortalUnlocked(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<boolean> {
  const { data: pac, error: pacErr } = await supabase
    .from('pacientes')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (pacErr || !pac?.id) return true;

  const pacienteId = pac.id;

  const { count: pagosOk } = await supabase
    .from('pagos')
    .select('id', { count: 'exact', head: true })
    .eq('paciente_id', pacienteId)
    .eq('estado', 'completado');

  if ((pagosOk ?? 0) >= 1) return true;

  const { data: bonos } = await supabase
    .from('bonos_pacientes')
    .select('sesiones_totales, sesiones_consumidas, estado, activo')
    .eq('paciente_id', pacienteId)
    .eq('activo', true)
    .eq('estado', 'activo');

  if (
    bonos?.some(
      (b) =>
        typeof b.sesiones_totales === 'number' &&
        typeof b.sesiones_consumidas === 'number' &&
        b.sesiones_consumidas < b.sesiones_totales
    )
  ) {
    return true;
  }

  const { data: cita } = await supabase
    .from('citas')
    .select('id')
    .eq('paciente_id', pacienteId)
    .in('estado', ['confirmada', 'completada'])
    .limit(1)
    .maybeSingle();

  return Boolean(cita?.id);
}
