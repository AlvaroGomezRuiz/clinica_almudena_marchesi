import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import {
  Button,
  Chip,
  EmptyState,
  PageHeader,
  SurfaceCard,
} from '@/components/portal-shell/ui';
import { createServerClient } from '@/lib/supabase/server';

export const metadata = { title: 'Pacientes | Panel Almudena' };
export const dynamic = 'force-dynamic';

/**
 * Nota sobre PII:
 *   Los campos nombre_completo_ciphertext / dni_nie_ciphertext están cifrados AES-GCM.
 *   Aquí mostramos campos NO sensibles + un hash truncado como identificador.
 *   La ficha clínica [id]/page.tsx hace la request a FastAPI para obtener el plaintext
 *   vía service_role + descifrado con la clave maestra (defense-in-depth).
 */

interface PacienteListRow {
  id: string;
  user_id: string | null;
  fecha_alta: string;
  consentimiento_rgpd: boolean;
  activo: boolean;
  nombre_completo_bidx: string;
}

export default async function AdminPacientesPage() {
  const supabase = createServerClient();

  const { data: pacientesRaw, count } = await supabase
    .from('pacientes')
    .select('id, user_id, fecha_alta, consentimiento_rgpd, activo, nombre_completo_bidx', {
      count: 'exact',
    })
    .eq('activo', true)
    .order('fecha_alta', { ascending: false })
    .limit(100);

  const pacientes = (pacientesRaw as PacienteListRow[] | null) ?? [];

  return (
    <>
      <PageHeader
        eyebrow={`${count ?? 0} pacientes activos`}
        title="Gestión de pacientes"
        description="Acceso completo a fichas clínicas. Los nombres y DNI se desencriptan en la ficha individual."
        actions={
          <Button variant="primary" icon="person_add">
            Alta manual
          </Button>
        }
      />

      {pacientes.length === 0 ? (
        <EmptyState
          icon="group_off"
          title="Aún no hay pacientes"
          description="Cuando un paciente se registre o le des de alta manualmente, aparecerá aquí."
        />
      ) : (
        <SurfaceCard className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-ink/5">
                  <th className="px-6 py-4 font-body text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">
                    Identificador
                  </th>
                  <th className="px-6 py-4 font-body text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">
                    Fecha de alta
                  </th>
                  <th className="px-6 py-4 font-body text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">
                    Estado
                  </th>
                  <th className="px-6 py-4 font-body text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">
                    RGPD
                  </th>
                  <th className="px-6 py-4" />
                </tr>
              </thead>
              <tbody>
                {pacientes.map((p) => (
                  <tr key={p.id} className="border-b border-ink/5 hover:bg-white/40 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-display text-[0.9rem] text-ink font-medium">
                        #{p.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="mt-0.5 font-mono text-[0.7rem] text-ink-muted">
                        {p.nombre_completo_bidx.slice(0, 16)}…
                      </p>
                    </td>
                    <td className="px-6 py-4 font-body text-[0.85rem] text-ink-soft">
                      {format(new Date(p.fecha_alta), "d MMM yyyy", { locale: es })}
                    </td>
                    <td className="px-6 py-4">
                      <Chip tone={p.activo ? 'positive' : 'neutral'}>
                        {p.activo ? 'Activo' : 'Inactivo'}
                      </Chip>
                    </td>
                    <td className="px-6 py-4">
                      <Chip tone={p.consentimiento_rgpd ? 'positive' : 'warning'}>
                        {p.consentimiento_rgpd ? 'Firmado' : 'Pendiente'}
                      </Chip>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/admin/pacientes/${p.id}`}>
                        <Button variant="ghost" size="sm" icon="arrow_forward">
                          Ficha
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SurfaceCard>
      )}
    </>
  );
}
