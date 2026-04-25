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
import EditableSensitiveField from '@/components/admin/ficha/EditableSensitiveField';
import FichaSectionEditGate from '@/components/admin/ficha/FichaSectionEditGate';
import HistorialCitasAdminLista from '@/components/admin/ficha/HistorialCitasAdminLista';
import SensitiveField from '@/components/admin/ficha/SensitiveField';
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
  /** Reservas sin pago (bloqueo_temporal) no entran en timeline / historia clínica. */
  const citasSinBloqueoTemporal = citas.filter((c) => c.estado !== 'bloqueo_temporal');
  const diagnosticosRows = (diagRes.data as PacienteDiagnostico[] | null) ?? [];
  const medicacionesRows = (medRes.data as PacienteMedicacion[] | null) ?? [];
  const adjuntos = (adjRes.data as PacienteAdjunto[] | null) ?? [];
  const lookups = (lookupRes.data as AdminLookup[] | null) ?? [];

  // Descifrado bulk de DX + medicación (titulo/notas cifrados en ciphertext).
  // Genera UNA entrada de auditoría `bulk_export/ficha_admin_ui_dx_med`.
  type DxMedBulk = {
    diagnosticos: readonly {
      id: string;
      titulo: string | null;
      notas: string | null;
      cie_code: string | null;
      severidad: 'leve' | 'moderado' | 'severo' | null;
      estado: string | null;
      fecha_inicio: string | null;
      fecha_fin: string | null;
      activo: boolean;
      created_at: string;
    }[];
    medicacion: readonly {
      id: string;
      nombre: string;
      dosis: string | null;
      frecuencia: string | null;
      via: string | null;
      prescrita_por: string | null;
      notas: string | null;
      fecha_inicio: string | null;
      fecha_fin: string | null;
      activo: boolean;
      created_at: string;
    }[];
  };
  const { data: dxMedBulk } = await (supabase.rpc as unknown as (
    fn: 'paciente_dx_med_bulk_descifrar',
    args: { p_paciente_id: string }
  ) => Promise<{ data: DxMedBulk | null; error: { message: string } | null }>)(
    'paciente_dx_med_bulk_descifrar',
    { p_paciente_id: paciente.id }
  );

  // Fusiona columnas plaintext (null tras 0034) con los valores descifrados
  // para mantener compatibilidad con los componentes hijos.
  const dxDescifradoById = new Map(
    (dxMedBulk?.diagnosticos ?? []).map((d) => [d.id, d])
  );
  const medDescifradoById = new Map(
    (dxMedBulk?.medicacion ?? []).map((m) => [m.id, m])
  );
  const diagnosticos: PacienteDiagnostico[] = diagnosticosRows.map((d) => ({
    ...d,
    titulo: dxDescifradoById.get(d.id)?.titulo ?? d.titulo ?? null,
    descripcion: dxDescifradoById.get(d.id)?.notas ?? d.descripcion ?? null,
  }));
  const medicaciones: PacienteMedicacion[] = medicacionesRows.map((m) => ({
    ...m,
    notas: medDescifradoById.get(m.id)?.notas ?? m.notas ?? null,
  }));

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
  const notaIdByCitaRecord: Readonly<Record<string, string>> =
    Object.fromEntries(notaIdByCita.entries());

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

      {/* ─── Identidad (métricas duplicadas eliminadas: ya están en chips de cabecera) ─── */}
      <section className="mb-6 flex flex-wrap items-center gap-6 portal-rise">
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
      </section>

      {/* ─── Grid principal: sensibles + clínico ─── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Col izquierda: datos personales sensibles */}
        <div className="lg:col-span-2 space-y-6">
          <SurfaceCard>
            <FichaSectionEditGate
              title="Datos personales"
              description="Pulsar el ojo registra el acceso en admin_lookups (RGPD art. 30). Usa “Editar sección” para mostrar los lápices por campo."
            >
              <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
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
            </FichaSectionEditGate>
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
            <FichaSectionEditGate
              title="Información clínica sensible"
              description="Campos cifrados. Pulsa el ojo (queda auditado) para revelarlos. “Editar sección” activa los lápices por campo."
            >
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
            </FichaSectionEditGate>
          </SurfaceCard>
        </div>

        {/* Col derecha: timeline + adjuntos + lookups */}
        <aside className="space-y-6">
          <SurfaceCard>
            <h2 className="font-display text-[1.15rem] italic text-ink dark:text-white mb-3">
              Timeline
            </h2>
            {citasSinBloqueoTemporal.length === 0 ? (
              <p className="py-4 text-center font-body text-[0.85rem] text-ink-soft dark:text-white/45">
                Sin citas confirmadas en el historial.
              </p>
            ) : (
              <ol className="relative border-l border-ink/10 pl-4 dark:border-white/10">
                {citasSinBloqueoTemporal.slice(0, 10).map((c) => (
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

      <div id="historia-clinica">
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
            {citasSinBloqueoTemporal.length} cita{citasSinBloqueoTemporal.length === 1 ? '' : 's'}
          </span>
        </div>

        <HistorialCitasAdminLista
          pacienteId={paciente.id}
          citas={citasSinBloqueoTemporal}
          notaIdByCita={notaIdByCitaRecord}
        />
      </SurfaceCard>
      </div>

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

