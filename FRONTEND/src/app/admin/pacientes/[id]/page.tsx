import { notFound } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import {
  Button,
  Chip,
  PageHeader,
  SurfaceCard,
} from '@/components/portal-shell/ui';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Ficha clínica del paciente.
 *
 * Estrategia de descifrado:
 *   - Para nombre/DNI/notas cifradas, este componente hace una llamada a
 *     FastAPI `GET /admin/pacientes/{id}` con el JWT de Supabase reenviado.
 *     El backend valida el rol admin, descifra con la clave maestra (env var)
 *     y devuelve los valores plaintext.
 *   - Mientras el backend no esté refactorizado (Fase 3), mostramos placeholders.
 */

interface PacienteDetalle {
  id: string;
  user_id: string | null;
  fecha_nacimiento: string | null;
  fecha_alta: string;
  consentimiento_rgpd: boolean;
  experiencia_terapia: string | null;
  activo: boolean;
}

interface CitaResumen {
  id: string;
  inicio: string;
  estado: string;
  servicio_nombre: string;
}

export default async function FichaPacientePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createServerClient();

  const { data: paciente } = await supabase
    .from('pacientes')
    .select('id, user_id, fecha_nacimiento, fecha_alta, consentimiento_rgpd, experiencia_terapia, activo')
    .eq('id', params.id)
    .maybeSingle<PacienteDetalle>();

  if (!paciente) {
    notFound();
  }

  const { data: citasRaw } = await supabase
    .from('v_citas_expandidas')
    .select('id, inicio, estado, servicio_nombre')
    .eq('paciente_id', paciente.id)
    .order('inicio', { ascending: false })
    .limit(10);

  const citas = (citasRaw as CitaResumen[] | null) ?? [];

  return (
    <>
      <PageHeader
        eyebrow={
          <Link href="/admin/pacientes" className="hover:underline">
            ← Volver a pacientes
          </Link>
        }
        title={`Ficha · #${paciente.id.slice(0, 8).toUpperCase()}`}
        description="Vista detallada. Los datos personales se desencriptan al abrir esta pantalla vía backend seguro."
        actions={
          <>
            <Button variant="surface" icon="edit">Editar</Button>
            <Button variant="primary" icon="event">Nueva cita</Button>
          </>
        }
      />

      <section className="grid gap-6 lg:grid-cols-3">
        <SurfaceCard className="lg:col-span-2">
          <h2 className="font-display text-[1.25rem] italic text-ink mb-4">
            Datos personales
          </h2>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nombre completo" value="· · · cifrado · · ·" hint="Backend" />
            <Field label="DNI/NIE" value="· · · cifrado · · ·" hint="Backend" />
            <Field
              label="Fecha de nacimiento"
              value={
                paciente.fecha_nacimiento
                  ? format(new Date(paciente.fecha_nacimiento), 'd MMM yyyy', { locale: es })
                  : '—'
              }
            />
            <Field
              label="Fecha de alta"
              value={format(new Date(paciente.fecha_alta), "d 'de' MMMM yyyy", { locale: es })}
            />
            <Field
              label="Experiencia previa en terapia"
              value={paciente.experiencia_terapia ?? '—'}
            />
            <Field
              label="Consentimiento RGPD"
              value={paciente.consentimiento_rgpd ? 'Firmado' : 'Pendiente'}
            />
          </dl>
        </SurfaceCard>

        <SurfaceCard>
          <h2 className="font-display text-[1.15rem] italic text-ink mb-1">
            Sesiones recientes
          </h2>
          <p className="font-body text-[0.75rem] text-ink-muted mb-4">
            Últimas 10 citas
          </p>
          {citas.length === 0 ? (
            <p className="py-4 font-body text-[0.85rem] text-ink-soft text-center">
              Sin citas registradas.
            </p>
          ) : (
            <ul className="space-y-3">
              {citas.map((c) => (
                <li key={c.id} className="flex items-center justify-between rounded-xl bg-white/50 p-3">
                  <div>
                    <p className="font-body text-[0.85rem] text-ink">
                      {c.servicio_nombre}
                    </p>
                    <p className="font-body text-[0.7rem] text-ink-muted">
                      {format(new Date(c.inicio), "d MMM · HH:mm", { locale: es })}
                    </p>
                  </div>
                  <Chip tone={c.estado === 'completada' ? 'positive' : c.estado === 'cancelada' ? 'critical' : 'info'}>
                    {c.estado}
                  </Chip>
                </li>
              ))}
            </ul>
          )}
        </SurfaceCard>
      </section>
    </>
  );
}

function Field({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <dt className="font-body text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">
        {label}
      </dt>
      <dd className="mt-1 font-display text-[0.95rem] text-ink">
        {value}
        {hint ? (
          <span className="ml-2 font-body text-[0.7rem] text-ink-muted">({hint})</span>
        ) : null}
      </dd>
    </div>
  );
}
