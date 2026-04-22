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
import EditableSensitiveField from '@/components/admin/ficha/EditableSensitiveField';
import NotaSesionAdminEditor from '@/components/admin/ficha/NotaSesionAdminEditor';
import DiagnosticosCard from '@/components/admin/ficha/DiagnosticosCard';
import MedicacionCard from '@/components/admin/ficha/MedicacionCard';
import TagsEditor from '@/components/admin/ficha/TagsEditor';
import { createServerClient } from '@/lib/supabase/server';
import type { FichaSensiblesBulk } from '@/services/admin/ficha-actions';
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

interface HistorialSesionRow {
  readonly id: string;
  readonly cita_id: string | null;
  readonly estado_emocional: string | null;
  readonly fecha_registro: string;
  readonly activo: boolean;
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

  // Historia clínica (timeline editorial inspirada en el prototipo).
  const { data: sesionesData } = await supabase
    .from('historial_sesiones')
    .select('id, cita_id, estado_emocional, fecha_registro, activo')
    .eq('paciente_id', id)
    .eq('activo', true)
    .order('fecha_registro', { ascending: false })
    .limit(20);
  const sesiones = (sesionesData as HistorialSesionRow[] | null) ?? [];

  // Mapa cita_id → notaId de `citas_notas_paciente`. Solo metadata, sin
  // descifrar. El admin expande una nota y se descifra on-demand
  // (genera 1 entrada `lectura_nota_admin` en admin_lookups).
  const { data: notasCitaData } = await supabase
    .from('citas_notas_paciente')
    .select('id, cita_id')
    .eq('paciente_id', id);
  const notaIdByCita = new Map<string, string>();
  for (const n of (notasCitaData as { id: string; cita_id: string }[] | null) ?? []) {
    notaIdByCita.set(n.cita_id, n.id);
  }

  // Pre-descifrado de la ficha completa (una sola RPC + una sola
  // entrada de auditoría `acceso_ficha_completa` en admin_lookups).
  // Si el RPC aún no existe en este entorno o hay cualquier error,
  // caemos al modo v1 compat (ojo + RPC por campo) pasando undefined.
  const { data: sensiblesData } = await (supabase.rpc as unknown as (
    fn: 'paciente_ficha_sensibles_bulk',
    args: { p_id: string; p_justificacion: string | null }
  ) => Promise<{ data: FichaSensiblesBulk | null; error: { message: string } | null }>)(
    'paciente_ficha_sensibles_bulk',
    { p_id: paciente.id, p_justificacion: 'acceso_ficha_admin_ui' }
  );
  const sensibles: FichaSensiblesBulk | null = sensiblesData ?? null;

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
  const ultimaSesion = citas.find((c) => c.estado === 'completada');

  // Edad calculada desde fecha_nacimiento.
  let edadAnios: number | null = null;
  if (paciente.fecha_nacimiento) {
    const fn = new Date(paciente.fecha_nacimiento);
    const now = new Date();
    let age = now.getFullYear() - fn.getFullYear();
    const m = now.getMonth() - fn.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < fn.getDate())) age--;
    if (age >= 0 && age < 130) edadAnios = age;
  }

  const diagnosticoPrincipal =
    diagnosticos.find((d) => d.activo)?.titulo ?? null;
  const medicacionActiva = medicaciones.filter((m) => m.activo).length;

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

      {/* ─── Chips editoriales de resumen (inspirado prototipo) ─── */}
      <section className="mb-8 flex flex-wrap gap-x-10 gap-y-4 text-ink-soft dark:text-white/70 portal-rise">
        <HeaderChip
          label="Edad"
          value={edadAnios !== null ? `${edadAnios} años` : '—'}
        />
        <HeaderChip
          label="Última sesión"
          value={
            ultimaSesion
              ? format(new Date(ultimaSesion.inicio), "d MMM yyyy", {
                  locale: es,
                })
              : 'Ninguna'
          }
        />
        <HeaderChip
          label="Diagnóstico principal"
          value={diagnosticoPrincipal ?? 'Sin diagnóstico activo'}
        />
        <HeaderChip
          label="Medicación"
          value={
            medicacionActiva === 0
              ? 'Ninguna activa'
              : `${medicacionActiva} activa${medicacionActiva === 1 ? '' : 's'}`
          }
        />
      </section>

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
              <EditableSensitiveField
                label="DNI / NIE"
                pacienteId={paciente.id}
                campo="dni_nie"
                campoEdit="dni_nie"
                value={sensibles?.dni_nie ?? null}
                keepShape
                placeholder="12345678A"
              />
              <EditableSensitiveField
                label="Teléfono"
                pacienteId={paciente.id}
                campo="telefono"
                campoEdit="telefono"
                value={sensibles?.telefono ?? null}
                keepShape
                inputType="tel"
                placeholder="+34 600 00 00 00"
              />
              <EditableSensitiveField
                label="Email"
                pacienteId={paciente.id}
                campo="email"
                campoEdit="email"
                value={sensibles?.email ?? profile?.email ?? null}
                inputType="email"
                placeholder="paciente@email.com"
              />
              <EditableSensitiveField
                label="Dirección"
                pacienteId={paciente.id}
                campo="direccion"
                campoEdit="direccion"
                value={sensibles?.direccion ?? null}
                multiline
                placeholder="Calle, número, CP, ciudad"
              />
              <EditableSensitiveField
                label="Contacto emergencia (teléfono)"
                pacienteId={paciente.id}
                campo="contacto_emergencia_telefono"
                campoEdit="contacto_emergencia_telefono"
                value={sensibles?.contacto_emergencia_telefono ?? null}
                keepShape
                inputType="tel"
                placeholder="+34 600 00 00 00"
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
              <EditableSensitiveField
                label="Alergias"
                pacienteId={paciente.id}
                campo="alergias"
                campoEdit="alergias"
                value={sensibles?.alergias ?? null}
                multiline
                placeholder="Alergias conocidas, intolerancias..."
              />
              <EditableSensitiveField
                label="Medicación base"
                pacienteId={paciente.id}
                campo="medicacion_base"
                campoEdit="medicacion_base"
                value={sensibles?.medicacion_base ?? null}
                multiline
                placeholder="Medicación habitual actual"
              />
              <EditableSensitiveField
                label="Objetivos terapéuticos"
                pacienteId={paciente.id}
                campo="objetivos"
                campoEdit="objetivos"
                value={sensibles?.objetivos ?? null}
                multiline
                placeholder="Objetivos acordados con el paciente"
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

      <SectionDivider label="Historia clínica" />

      <SurfaceCard>
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-[1.5rem] italic text-ink dark:text-white">
              Sesiones registradas
            </h2>
            <p className="mt-1 font-body text-[0.85rem] text-ink-soft dark:text-white/60">
              Línea temporal editorial. Las notas clínicas están cifradas
              (ver auditoría lateral).
            </p>
          </div>
          <span className="font-body text-[0.7rem] uppercase tracking-[0.22em] font-bold text-ink-muted dark:text-white/55">
            {sesiones.length} sesión{sesiones.length === 1 ? '' : 'es'}
          </span>
        </div>

        {sesiones.length === 0 && citas.length === 0 ? (
          <p className="py-8 text-center font-body text-[0.88rem] text-ink-soft dark:text-white/55">
            Todavía no hay sesiones registradas para este paciente.
          </p>
        ) : (
          <ol className="relative space-y-6 pl-8">
            <span
              aria-hidden="true"
              className="absolute left-[3px] top-2 bottom-2 w-px bg-ink/15 dark:bg-white/15"
            />
            {citas.slice(0, 12).map((c, idx) => {
              const active = idx === 0;
              const fecha = new Date(c.inicio);
              const modalidad = c.servicio_nombre ?? 'Sesión clínica';
              return (
                <li key={c.id} className="relative">
                  <span
                    aria-hidden="true"
                    className={`absolute -left-[33px] top-3 h-2.5 w-2.5 rounded-full ring-4 ring-canvas dark:ring-[#1a1a1a] ${
                      active ? 'bg-primary' : 'bg-ink/30 dark:bg-white/30'
                    }`}
                  />
                  <div
                    className={`rounded-3xl p-6 transition ${
                      active
                        ? 'bg-white/80 ring-1 ring-inset ring-ink/10 dark:bg-white/[0.05] dark:ring-white/10'
                        : 'bg-white/40 dark:bg-white/[0.025]'
                    }`}
                  >
                    <div className="mb-3 flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-display text-[1.05rem] italic text-ink dark:text-white">
                          {modalidad}
                        </h3>
                        <div className="mt-1 flex items-center gap-2 font-body text-[0.7rem] font-bold uppercase tracking-[0.18em] text-ink-muted dark:text-white/55">
                          <span>
                            {format(fecha, "d MMMM yyyy", { locale: es })}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {format(fecha, 'HH:mm', { locale: es })}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{c.estado}</span>
                        </div>
                      </div>
                      <span
                        className={`font-body text-[0.75rem] font-bold tracking-tight ${
                          active
                            ? 'text-primary dark:text-primary-fixed-dim'
                            : 'text-ink-muted dark:text-white/45'
                        }`}
                      >
                        #{citas.length - idx}
                      </span>
                    </div>
                    {/* Las notas clínicas están cifradas en reposo y solo
                         se descifran al expandir el editor (una entrada
                         `lectura_nota_admin` por apertura). */}
                    {(() => {
                      const notaId = notaIdByCita.get(c.id) ?? null;
                      const hasNota = notaId !== null;
                      return (
                        <>
                          <p className="font-body text-[0.82rem] leading-[1.6] text-ink-soft dark:text-white/65">
                            {hasNota
                              ? 'Nota clínica cifrada registrada para esta cita.'
                              : 'Sin nota clínica todavía para esta sesión.'}
                          </p>
                          <NotaSesionAdminEditor
                            citaId={c.id}
                            pacienteId={paciente.id}
                            notaId={notaId}
                            hasNota={hasNota}
                          />
                        </>
                      );
                    })()}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </SurfaceCard>

      <SectionDivider />
    </>
  );
}

function HeaderChip({
  label,
  value,
}: {
  label: string;
  value: string;
}): JSX.Element {
  return (
    <div className="flex items-center gap-2.5">
      <span className="font-body text-[0.62rem] uppercase tracking-[0.22em] font-bold text-ink-muted dark:text-white/55">
        {label}
      </span>
      <span className="font-body text-[0.86rem] font-semibold text-ink dark:text-white">
        {value}
      </span>
    </div>
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
