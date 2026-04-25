/**
 * Headers para invocar otra Edge Function del mismo proyecto con service_role.
 * El gateway de Supabase valida `Authorization: Bearer <jwt>` y, en la práctica,
 * también espera `apikey` con la misma clave; sin él, la petición puede fallar
 * antes de ejecutar la función (y Resend no verá nunca la llamada).
 */
export function edgeServiceRoleHeaders(serviceRoleKey: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${serviceRoleKey}`,
    apikey: serviceRoleKey,
  };
}
