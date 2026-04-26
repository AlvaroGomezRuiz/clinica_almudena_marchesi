/**
 * Etiquetas en castellano para `admin_lookups.campo` en la ficha (RGPD / auditoría).
 */
import type { AdminLookupCampo } from '@/lib/supabase/types';

const POR_CAMPO: { readonly [K in AdminLookupCampo]: string } = {
  dni_nie: 'DNI / NIE',
  telefono: 'Teléfono',
  email: 'Email',
  direccion: 'Dirección',
  contacto_emergencia: 'Contacto de emergencia',
  alergias: 'Alergias',
  medicacion_base: 'Medicación base',
  objetivos: 'Objetivos terapéuticos',
  preferencias_clinicas: 'Preferencias clínicas',
  historial_clinico: 'Historial clínico',
  diagnostico: 'Diagnóstico (detalle)',
  bulk_export: 'Descarga / export (bloque)',
};

function esAdminLookupCampo(s: string): s is AdminLookupCampo {
  return Object.hasOwn(POR_CAMPO, s);
}

export function labelAdminLookupCampo(campo: string): string {
  if (esAdminLookupCampo(campo)) {
    return POR_CAMPO[campo];
  }
  return campo;
}
