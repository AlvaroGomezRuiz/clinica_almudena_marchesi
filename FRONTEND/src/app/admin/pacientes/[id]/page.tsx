import { notFound } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import {
  Button,
  Chip,
  PageHeader,
  SurfaceCard,
  SectionDivider,
} from '@/components/portal-shell/ui';
import SensitiveField from '@/components/admin/ficha/SensitiveField';
import DiagnosticosCard from '@/components/admin/ficha/DiagnosticosCard';
import MedicacionCard from '@/components/admin/ficha/MedicacionCard';
import TagsEditor from '@/components/admin/ficha/TagsEditor';
import { createServerClient } from '@/lib/supabase/server';
import type {
  PacienteDiagnostico,
  PacienteMedicacion,
  PacienteAdjunto,
  AdminLookup,
  Profile,
} from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<{ title: string }> {
  const { id } = await params;
  return { title: `Ficha #${id.slice(0, 6)} | Panel Almudena` };
}

interface PacienteFichaRow {
  id: string;
  user_id: string | null;
  fecha_nacimiento: string | null;
  fecha_alta: string;
  consentimiento_rgpd: boolean;
  experiencia_terapia: string | null;
  activo: boolean;
  avatar_url: string | null;
  color_etiqueta: string | null;
  tags: readonly string[];
  dni_nie_ciphertext: string | null;
  telefono_ciphertext: string | null;
  email_ciphertext: string | null;
  direccion_ciphertext: string | null;
  contacto_emergencia_nombre_ciphertext: string | null;
  contacto_emergencia_telefono_ciphertext: string | null;
  alergias_ciphertext: string | null;
  medicacion_base_ciphertext: string | null;
  objetivos_ciphertext: string | null;
}

interface CitaRow {
  id: string;
  inicio: string;
  estado: string;
  servicio_nombre: string;
}

export default async function FichaPacientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<JSX.Element> {
  const { id } = await params;
  const supabase = createServerClient();

  // Carga paralela de todo lo necesario
  const [pacienteRes, citasRes, diagRes, medRes, adjRes, lookupRes] =
    await Promise.all([
      supabase
        .from('pacientes')
        .select(
          'id, user_id, fecha_nacimiento, fecha_alta, consentimiento_rgpd, experiencia_terapia, activo, avatar_url, color_etiqueta, tags, dni_nie_ciphertext, telefono_ciphertext, email_ciphertext, direccion_ciphertext, contacto_emergencia_nombre_ciphertext, contacto_emergencia_telefono_ciphertext, alergias_ciphertext, medicacion_base_ciphertext, objetivos_ciphertext'
        )
        .eq('id', id)
        .maybeSingle(),
      supabase
        .from('v_citas_expandidas')
        .select('id, inicio, estado, servicio_nombre')
        .eq('paciente_id', id)
        .order('inicio', { ascending: false })
        .limit(20),
      supabase
        .from('paciente_diagnosticos')
        .select('*')
        .eq('paciente_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('paciente_medicacion')
        .select('*')
        .eq('paciente_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('paciente_adjuntos')
        .select('*')
        .eq('paciente_id', id)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('admin_lookups')
        .select('*')
        .eq('paciente_id', id)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

  const paciente = pacienteRes.data as PacienteFichaRow | null;
  if (!paciente) notFound();

  const citas = ((citasRes.data as CitaRow[] | null) ?? []).slice();
  const diagnosticos = (diagRes.data as PacienteDiagnostico[] | null) ?? [];
  const medicaciones = (medRes.data as PacienteMedicacion[] | null) ?? [];
  const adjuntos = (adjRes.data as PacienteAdjunto[] | null) ?? [];
  const lookups = (lookupRes.data as AdminLookup[] | null) ?? [];

  type ProfileLite = Pick<Profile, 'display_name' | 'email' | 'avatar_url'>;
  let profile: ProfileLite | null = null;
  if (paciente.user_id) {
    const { data } = await supabase
      .from('profiles')
      .select('display_name, email, avatar_url')
      .eq('id', paciente.user_id)
      .maybeSingle();
    profile = (data as unknown as ProfileLite | null) ?? null;
  }

  const displayName = profile?.display_name ?? 'Paciente';
  const initials =
    displayName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w: string) => w[0]?.toUpperCase() ?? '')
      .join('') || 'P';

  const sesionesCompletadas = citas.filter((c) => c.estado === 'completada').length;
  const proximaCita = citas.find(
    (c) => new Date(c.inicio).getTime() > Date.now() && c.estado === 'confirmada'
  );

  return (
    <>
      <PageHeader
        eyebrow={
          <Link
            href="/admin/pacientes"
            className="inline-flex items-center gap-1 hover:underline"
          >
            <span
              className="material-symbols-outlined text-[1rem]"
              aria-hidden="true"
            >
              chevron_left
            </span>
            Volver a pacientes
          </Link>
        }
        title={displayName}
        description={`Alta ${format(new Date(paciente.fecha_alta), "d 'de' MMMM yyyy", { locale: es })} · ${sesionesCompletadas} sesiones completadas`}
        actions={
          <>
            <Button variant="surface" icon="download">Exportar PDF</Button>
            <Button variant="primary" icon="event">Nueva cita</Button>
          </>
        }
      />

      {/* ─── Cabecera identidad + métricas rápidas ─── */}
      <section className="grid gap-6 lg:grid-cols-[auto_1fr_1fr_1fr] mb-6 portal-rise">
        <div className="flex items-center gap-4">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl font-display text-[1.5rem] text-canvas ring-1 ring-inset ring-ink/10 dark:text-ink dark:ring-white/10"
            style={{
              background:
                paciente.color_etiqueta ??
                'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
            }}
            aria-hidden="true"
          >
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt=""
                className="h-full w-full rounded-2xl object-cover"
              />
            ) : (
              initials
            )}
          </div>
          <div>
            <p className="font-body text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted dark:text-white/55">
              Estado
            </p>
            <p className="font-display text-[0.95rem] text-ink dark:text-white">
              {paciente.activo ? 'Activo' : 'Baja'}
            </p>
          </div>
        </div>

        <MetricPill
          icon="event_available"
          label="Próxima cita"
          value={
            proximaCita
              ? format(new Date(proximaCita.inicio), "d MMM · HH:mm", { locale: es })
              : 'Sin cita agendada'
          }
        />
        <MetricPill
          icon="task_alt"
          label="Sesiones"
          value={`${sesionesCompletadas} completadas`}
        />
        <MetricPill
          icon="verified_user"
          label="RGPD"
          value={paciente.consentimiento_rgpd ? 'Firmado' : 'Pendiente'}
          tone={paciente.consentimiento_rgpd ? 'positive' : 'warning'}
        />
      </section>

      {/* ─── Grid principal: sensibles + clínico ─── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Col izquierda: datos personales sensibles */}
        <div className="lg:col-span-2 space-y-6">
          <SurfaceCard>
            <div className="mb-2 flex items-start justify-between">
              <div>
                <h2 className="font-display text-[1.25rem] italic text-ink dark:text-white">
                  Datos personales
                </h2>
                <p className="font-body text-[0.72rem] text-ink-muted dark:text-white/55">
                  Pulsar el ojo registra el acceso en admin_lookups (RGPD art. 30).
                </p>
              </div>
              <Chip tone="info">
                {lookups.length} acceso{lookups.length === 1 ? '' : 's'}
              </Chip>
            </div>

            <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <SensitiveField
                label="DNI / NIE"
                pacienteId={paciente.id}
                campo="dni_nie"
                hasValue={Boolean(paciente.dni_nie_ciphertext)}
                requireReason
              />
              <SensitiveField
                label="Teléfono"
                pacienteId={paciente.id}
                campo="telefono"
                hasValue={Boolean(paciente.telefono_ciphertext)}
              />
              <SensitiveField
                label="Email"
                pacienteId={paciente.id}
                campo="email"
                hasValue={Boolean(paciente.email_ciphertext)}
                plaintext={profile?.email ?? null}
              />
              <SensitiveField
                label="Dirección"
                pacienteId={paciente.id}
                campo="direccion"
                hasValue={Boolean(paciente.direccion_ciphertext)}
                requireReason
              />
              <SensitiveField
                label="Contacto emergencia"
                pacienteId={paciente.id}
                campo="contacto_emergencia"
                hasValue={Boolean(
                  paciente.contacto_emergencia_telefono_ciphertext
                )}
              />
              <div>
                <dt className="font-body text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted dark:text-white/55">
                  Fecha de nacimiento
                </dt>
                <dd className="mt-1 font-display text-[0.95rem] text-ink dark:text-white">
                  {paciente.fecha_nacimiento
                    ? format(new Date(paciente.fecha_nacimiento), "d MMM yyyy", {
                        locale: es,
                      })
                    : '—'}
                </dd>
              </div>
            </dl>
          </SurfaceCard>

          <SurfaceCard>
            <h2 className="font-display text-[1.15rem] italic text-ink dark:text-white mb-3">
              Etiquetas
            </h2>
            <p className="font-body text-[0.72rem] text-ink-muted dark:text-white/55 mb-3">
              Uso interno (segmentación, flags clínicos).
            </p>
            <TagsEditor pacienteId={paciente.id} initialTags={paciente.tags} />
          </SurfaceCard>

          <SurfaceCard>
            <DiagnosticosCard
              pacienteId={paciente.id}
              diagnosticos={diagnosticos}
            />
          </SurfaceCard>

          <SurfaceCard>
            <MedicacionCard
              pacienteId={paciente.id}
              medicaciones={medicaciones}
            />
          </SurfaceCard>

          <SurfaceCard>
            <h2 className="font-display text-[1.15rem] italic text-ink dark:text-white mb-1">
              Información clínica sensible
            </h2>
            <p className="font-body text-[0.72rem] text-ink-muted dark:text-white/55 mb-4">
              Campos cifrados. Pulsa el ojo (queda auditado) para revelarlos.
            </p>
            <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <SensitiveField
                label="Alergias"
                pacienteId={paciente.id}
                campo="alergias"
                hasValue={Boolean(paciente.alergias_ciphertext)}
              />
              <SensitiveField
                label="Medicación base"
                pacienteId={paciente.id}
                campo="medicacion_base"
                hasValue={Boolean(paciente.medicacion_base_ciphertext)}
              />
              <SensitiveField
                label="Objetivos terapéuticos"
                pacienteId={paciente.id}
                campo="objetivos"
                hasValue={Boolean(paciente.objetivos_ciphertext)}
                requireReason
              />
              <div>
                <dt className="font-body text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted dark:text-white/55">
                  Experiencia previa en terapia
                </dt>
                <dd className="mt-1 font-display text-[0.95rem] text-ink dark:text-white">
                  {paciente.experiencia_terapia ?? '—'}
                </dd>
              </div>
            </dl>
          </SurfaceCard>
        </div>

        {/* Col derecha: timeline + adjuntos + lookups */}
        <aside className="space-y-6">
          <SurfaceCard>
            <h2 className="font-display text-[1.15rem] italic text-ink dark:text-white mb-3">
              Timeline
            </h2>
            {citas.length === 0 ? (
              <p className="py-4 text-center font-body text-[0.85rem] text-ink-soft dark:text-white/45">
                Sin citas registradas.
              </p>
            ) : (
              <ol className="relative border-l border-ink/10 pl-4 dark:border-white/10">
                {citas.slice(0, 10).map((c) => (
                  <li key={c.id} className="mb-4 last:mb-0">
                    <span
                      className="absolute -left-1.5 flex h-3 w-3 items-center justify-center rounded-full ring-4 ring-canvas dark:ring-[#1a1a1a]"
                      style={{
                        background:
                          c.estado === 'completada'
                            ? 'var(--color-primary)'
                            : c.estado === 'cancelada'
                              ? '#c14c4c'
                              : 'var(--color-primary-dark)',
                      }}
                      aria-hidden="true"
                    />
                    <p className="font-body text-[0.82rem] text-ink dark:text-white">
                      {c.servicio_nombre}
                    </p>
                    <p className="font-body text-[0.7rem] text-ink-muted dark:text-white/55">
                      {format(new Date(c.inicio), "d MMM yyyy · HH:mm", {
                        locale: es,
                      })}{' '}
                      · {c.estado}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </SurfaceCard>

          <SurfaceCard>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-[1.15rem] italic text-ink dark:text-white">
                Adjuntos
              </h2>
              <Chip tone="neutral">{adjuntos.length}</Chip>
            </div>
            {adjuntos.length === 0 ? (
              <p className="py-4 text-center font-body text-[0.85rem] text-ink-soft dark:text-white/45">
                Sin adjuntos.
                <br />
                <span className="text-[0.72rem]">
                  La subida se habilita en F5 (storage: paciente-adjuntos).
                </span>
              </p>
            ) : (
              <ul className="space-y-2">
                {adjuntos.slice(0, 5).map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center gap-2 rounded-xl bg-white/50 p-2 dark:bg-white/5"
                  >
                    <span
                      className="material-symbols-outlined text-ink-muted dark:text-white/55"
                      aria-hidden="true"
                    >
                      attach_file
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-body text-[0.8rem] text-ink dark:text-white">
                        {a.nombre}
                      </p>
                      <p className="font-body text-[0.7rem] text-ink-muted dark:text-white/55">
                        {format(new Date(a.created_at), "d MMM yyyy", {
                          locale: es,
                        })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SurfaceCard>

          <SurfaceCard>
            <h2 className="font-display text-[1.15rem] italic text-ink dark:text-white mb-1">
              Auditoría
            </h2>
            <p className="font-body text-[0.7rem] text-ink-muted dark:text-white/55 mb-3">
              Últimos accesos a campos sensibles.
            </p>
            {lookups.length === 0 ? (
              <p className="py-2 text-center font-body text-[0.78rem] text-ink-soft dark:text-white/45">
                Sin accesos registrados.
              </p>
            ) : (
              <ul className="space-y-2">
                {lookups.map((l) => (
                  <li key={l.id} className="text-[0.72rem] font-body">
                    <p className="text-ink dark:text-white">
                      <span className="font-medium">{l.campo}</span>
                      {l.justificacion ? (
                        <span className="text-ink-muted dark:text-white/55">
                          {' '}
                          — {l.justificacion}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-ink-muted dark:text-white/55">
                      {format(new Date(l.created_at), "d MMM · HH:mm", {
                        locale: es,
                      })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </SurfaceCard>
        </aside>
      </div>

      <SectionDivider />
    </>
  );
}

function MetricPill({
  icon,
  label,
  value,
  tone = 'neutral',
}: {
  icon: string;
  label: string;
  value: string;
  tone?: 'neutral' | 'positive' | 'warning';
}): JSX.Element {
  const toneCls =
    tone === 'positive'
      ? 'text-primary dark:text-white'
      : tone === 'warning'
        ? 'text-[#8a6530] dark:text-[#e9c88a]'
        : 'text-ink dark:text-white';
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/50 px-4 py-3 ring-1 ring-inset ring-ink/8 dark:bg-white/5 dark:ring-white/10">
      <span
        className="material-symbols-outlined text-[1.4rem] text-ink-muted dark:text-white/55"
        aria-hidden="true"
      >
        {icon}
      </span>
      <div>
        <p className="font-body text-[0.68rem] uppercase tracking-[0.15em] text-ink-muted dark:text-white/55">
          {label}
        </p>
        <p className={`font-display text-[0.92rem] ${toneCls}`}>{value}</p>
      </div>
    </div>
  );
}
