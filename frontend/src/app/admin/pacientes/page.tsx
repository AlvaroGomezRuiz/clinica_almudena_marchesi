import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

import {
  Button,
  Chip,
  EmptyState,
  PageHeader,
  StatCard,
  SurfaceCard,
} from '@/components/portal-shell/ui';
import { createServerClient } from '@/lib/supabase/server';

export const metadata = { title: 'Pacientes | Panel Almudena' };
export const dynamic = 'force-dynamic';

/**
 * Nota sobre PII:
 *   - Los nombres y DNIs viven en columnas _ciphertext (AES-256-GCM backend).
 *   - Esta vista usa `v_pacientes_resumen_admin` que SOLO expone flags booleanos
 *     (has_dni, has_telefono…) + métricas agregadas. El plaintext sólo se sirve
 *     desde la ficha individual vía RPC auditado (migración 0012).
 *   - Búsqueda:
 *       · display_name / email → match en `profiles` (join por user_id).
 *       · DNI/NIE, teléfono y email RGPD → lookup via RPC
 *         `paciente_buscar_por_campo` (blind index HMAC, no se envía
 *         plaintext al cliente).
 */

function detectarCampoBlind(
  query: string
): 'dni_nie' | 'telefono' | 'email' | null {
  const trimmed = query.trim();
  if (trimmed.length < 3) return null;
  // Email: contiene exactamente una '@' con algo a cada lado.
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'email';
  // DNI español: 8 dígitos + letra ó NIE (X/Y/Z) + 7 dígitos + letra.
  if (/^([XYZ]\d{7}|\d{8})[A-Z]$/i.test(trimmed.replace(/\s/g, '')))
    return 'dni_nie';
  // Teléfono: sólo dígitos, +, espacios, guiones; al menos 7 dígitos.
  if (
    /^[+\d][\d\s\-()]{6,24}$/.test(trimmed) &&
    trimmed.replace(/\D/g, '').length >= 7
  )
    return 'telefono';
  return null;
}

const PAGE_SIZE = 25;

interface PacienteResumen {
  id: string;
  user_id: string | null;
  fecha_alta: string;
  fecha_nacimiento: string | null;
  activo: boolean;
  tags: readonly string[];
  color_etiqueta: string | null;
  avatar_url: string | null;
  consentimiento_rgpd: boolean;
  created_at: string;
  has_dni: boolean;
  has_telefono: boolean;
  has_email: boolean;
  has_contacto_emergencia: boolean;
  has_alergias: boolean;
  sesiones_completadas: number;
  ultima_cita: string | null;
  proxima_cita: string | null;
  diagnosticos_activos: number;
  adjuntos_total: number;
}

interface ProfileLite {
  id: string;
  display_name: string | null;
  email: string;
}

interface BonoActivoRow {
  paciente_id: string;
  sesiones_totales: number;
  sesiones_consumidas: number;
}

interface AdminPacientesPageProps {
  readonly searchParams: Promise<{ q?: string; page?: string }>;
}

function parsePage(p: string | undefined): number {
  const n = Number.parseInt(p ?? '1', 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export default async function AdminPacientesPage({
  searchParams,
}: AdminPacientesPageProps): Promise<JSX.Element> {
  const { q = '', page: pageRaw } = await searchParams;
  const page = parsePage(pageRaw);
  const query = q.trim();

  const supabase = createServerClient();

  // 1. Si hay query:
  //    a) profiles.display_name / profiles.email → lista de user_ids
  //    b) si el query parece DNI / teléfono / email → blind index RPC
  //       `paciente_buscar_por_campo` (devuelve paciente_id sin plaintext)
  let filterUserIds: string[] | null = null;
  let filterPacienteIds: string[] | null = null;
  let blindCampoDetectado: 'dni_nie' | 'telefono' | 'email' | null = null;

  if (query.length > 1) {
    const safe = query.replace(/[%_\\]/g, '\\$&');
    const filter = `%${safe}%`;
    const { data: matches } = await supabase
      .from('profiles')
      .select('id, display_name, email')
      .or(`display_name.ilike.${filter},email.ilike.${filter}`)
      .eq('role', 'paciente')
      .limit(500);

    filterUserIds = (matches as ProfileLite[] | null)?.map((m) => m.id) ?? [];

    blindCampoDetectado = detectarCampoBlind(query);
    if (blindCampoDetectado) {
      const { data: blindId } = await supabase.rpc('paciente_buscar_por_campo', {
        p_campo: blindCampoDetectado,
        p_valor: query.trim(),
      });
      const found = (blindId as string | null) ?? null;
      filterPacienteIds = found ? [found] : [];
    }
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // 2. Query principal sobre la vista resumen
  let q1 = supabase
    .from('v_pacientes_resumen_admin')
    .select(
      'id, user_id, fecha_alta, fecha_nacimiento, activo, tags, color_etiqueta, avatar_url, consentimiento_rgpd, created_at, has_dni, has_telefono, has_email, has_contacto_emergencia, has_alergias, sesiones_completadas, ultima_cita, proxima_cita, diagnosticos_activos, adjuntos_total',
      { count: 'exact' }
    )
    .eq('activo', true)
    .order('fecha_alta', { ascending: false });

  if (filterUserIds !== null || filterPacienteIds !== null) {
    const userHits = filterUserIds ?? [];
    const pacHits = filterPacienteIds ?? [];
    if (userHits.length === 0 && pacHits.length === 0) {
      // Ninguna coincidencia en profiles ni blind index: forzamos vacío.
      q1 = q1.eq('user_id', '00000000-0000-0000-0000-000000000000');
    } else if (userHits.length > 0 && pacHits.length > 0) {
      // Combinación OR sobre user_id / id.
      q1 = q1.or(
        `user_id.in.(${userHits.join(',')}),id.in.(${pacHits.join(',')})`
      );
    } else if (userHits.length > 0) {
      q1 = q1.in('user_id', userHits);
    } else {
      q1 = q1.in('id', pacHits);
    }
  }

  const { data: pacientesRaw, count } = await q1.range(from, to);
  const pacientes = (pacientesRaw as PacienteResumen[] | null) ?? [];

  // 3. Profiles para mostrar nombre/email de los pacientes visibles
  const userIds = pacientes.map((p) => p.user_id).filter((id): id is string => Boolean(id));
  const profilesByUserId = new Map<string, ProfileLite>();
  if (userIds.length > 0) {
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, display_name, email')
      .in('id', userIds);
    (profs as ProfileLite[] | null)?.forEach((p) => profilesByUserId.set(p.id, p));
  }

  // 4. KPIs globales (independientes del paginado y del filtro)
  const hace30d = subDays(new Date(), 30).toISOString();
  const [
    { count: totalActivos },
    { count: consentimientoFirmado },
    { count: altasRecientes },
    { data: bonosActivos },
  ] = await Promise.all([
    supabase
      .from('v_pacientes_resumen_admin')
      .select('id', { count: 'exact', head: true })
      .eq('activo', true),
    supabase
      .from('v_pacientes_resumen_admin')
      .select('id', { count: 'exact', head: true })
      .eq('activo', true)
      .eq('consentimiento_rgpd', true),
    supabase
      .from('v_pacientes_resumen_admin')
      .select('id', { count: 'exact', head: true })
      .eq('activo', true)
      .gte('created_at', hace30d),
    supabase
      .from('bonos_pacientes')
      .select('paciente_id, sesiones_totales, sesiones_consumidas')
      .eq('estado', 'activo')
      .eq('activo', true),
  ]);

  const bonosList = (bonosActivos as BonoActivoRow[] | null) ?? [];
  const pacientesConBono = new Set(bonosList.map((b) => b.paciente_id)).size;

  const totalPaginas = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <>
      <PageHeader
        eyebrow={`${count ?? 0} ${(count ?? 0) === 1 ? 'resultado' : 'resultados'}${query ? ` · «${query}»` : ''}`}
        title="Gestión de pacientes"
        description="Resumen no-sensible. Para ver DNI, teléfono o notas clínicas, abre la ficha (acceso auditado)."
        actions={
          <Link href="/admin/pacientes/alta">
            <Button variant="primary" icon="person_add">Alta manual</Button>
          </Link>
        }
      />

      {/* ─── KPIs ─── */}
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-10 portal-rise">
        <StatCard
          label="Pacientes activos"
          value={totalActivos ?? 0}
          icon="diversity_3"
        />
        <StatCard
          label="Con consentimiento RGPD"
          value={`${consentimientoFirmado ?? 0}/${totalActivos ?? 0}`}
          icon="privacy_tip"
          footnote={
            (totalActivos ?? 0) > 0
              ? `${Math.round(((consentimientoFirmado ?? 0) / (totalActivos ?? 1)) * 100)}% firmado`
              : undefined
          }
        />
        <StatCard
          label="Con bono activo"
          value={pacientesConBono}
          icon="card_membership"
          footnote={`${bonosList.length} bonos totales`}
        />
        <StatCard
          label="Altas (últimos 30d)"
          value={altasRecientes ?? 0}
          icon="person_add"
        />
      </section>

      {/* ─── Buscador ─── */}
      <SurfaceCard className="mb-6">
        <form action="/admin/pacientes" method="get" className="flex flex-wrap gap-3 items-end">
          <label className="flex flex-col gap-1 flex-1 min-w-[220px]">
            <span className="font-body text-[0.62rem] uppercase tracking-[0.22em] text-ink-muted dark:text-white/55">
              Buscar — nombre, email, DNI o teléfono
            </span>
            <div className="relative">
              <span
                className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[1.1rem] text-ink-muted dark:text-white/45"
                aria-hidden="true"
              >
                search
              </span>
              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="María · marchesi@… · 12345678A · +34 600…"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/80 ring-1 ring-inset ring-ink/8 font-body text-[0.9rem] text-ink outline-none focus:ring-primary/40 dark:bg-white/5 dark:ring-white/10 dark:text-white"
              />
            </div>
            <span className="font-body text-[0.64rem] text-ink-muted dark:text-white/45">
              DNI, email y teléfono se resuelven con blind index (HMAC) —
              sin exponer plaintext.
            </span>
          </label>
          <div className="flex gap-2">
            <Button type="submit" variant="primary" icon="search">
              Buscar
            </Button>
            {query ? (
              <Link href="/admin/pacientes">
                <Button variant="ghost" icon="close">Limpiar</Button>
              </Link>
            ) : null}
          </div>
        </form>
      </SurfaceCard>

      {pacientes.length === 0 ? (
        <EmptyState
          icon={query ? 'search_off' : 'group_off'}
          title={query ? 'Sin coincidencias' : 'Aún no hay pacientes'}
          description={
            query
              ? `No hay pacientes que coincidan con «${query}». Revisa la ortografía o limpia la búsqueda.`
              : 'Cuando un paciente se registre o le des de alta manualmente, aparecerá aquí.'
          }
        />
      ) : (
        <SurfaceCard className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-ink/5 dark:border-white/5">
                  <th className="px-6 py-4 font-body text-[0.65rem] uppercase tracking-[0.2em] text-ink-muted dark:text-white/55">
                    Paciente
                  </th>
                  <th className="px-4 py-4 font-body text-[0.65rem] uppercase tracking-[0.2em] text-ink-muted dark:text-white/55">
                    Próxima cita
                  </th>
                  <th className="px-4 py-4 font-body text-[0.65rem] uppercase tracking-[0.2em] text-ink-muted dark:text-white/55 text-center">
                    Sesiones
                  </th>
                  <th className="px-4 py-4 font-body text-[0.65rem] uppercase tracking-[0.2em] text-ink-muted dark:text-white/55">
                    Contacto
                  </th>
                  <th className="px-4 py-4 font-body text-[0.65rem] uppercase tracking-[0.2em] text-ink-muted dark:text-white/55">
                    RGPD
                  </th>
                  <th className="px-4 py-4" />
                </tr>
              </thead>
              <tbody>
                {pacientes.map((p) => {
                  const profile = p.user_id ? profilesByUserId.get(p.user_id) : null;
                  const displayName = profile?.display_name ?? `Paciente #${p.id.slice(0, 8).toUpperCase()}`;
                  const initials = (profile?.display_name ?? profile?.email ?? '?')
                    .split(/[\s@]/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((s) => s[0]?.toUpperCase() ?? '')
                    .join('') || '?';
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-ink/5 hover:bg-white/50 transition-colors dark:border-white/5 dark:hover:bg-white/5"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {p.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.avatar_url}
                              alt=""
                              className="h-10 w-10 rounded-full object-cover ring-1 ring-inset ring-ink/10 dark:ring-white/15"
                            />
                          ) : (
                            <span
                              className="grid h-10 w-10 place-items-center rounded-full font-display text-[0.82rem] font-medium text-ink dark:text-white ring-1 ring-inset ring-ink/10 dark:ring-white/15"
                              style={{
                                background: p.color_etiqueta
                                  ? `${p.color_etiqueta}20`
                                  : 'rgba(75,100,95,0.12)',
                              }}
                              aria-hidden="true"
                            >
                              {initials}
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="font-display text-[0.98rem] text-ink truncate tracking-[-0.01em] dark:text-white">
                              {displayName}
                            </p>
                            <p className="mt-0.5 font-body text-[0.72rem] text-ink-muted truncate dark:text-white/55">
                              {profile?.email ?? `Alta ${format(new Date(p.fecha_alta), "d MMM yyyy", { locale: es })}`}
                            </p>
                            {p.tags.length > 0 ? (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {p.tags.slice(0, 3).map((t) => (
                                  <span
                                    key={t}
                                    className="inline-block rounded-full bg-ink/5 px-2 py-0.5 font-body text-[0.62rem] text-ink-soft dark:bg-white/5 dark:text-white/55"
                                  >
                                    {t}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {p.proxima_cita ? (
                          <div>
                            <p className="font-body text-[0.84rem] text-ink dark:text-white">
                              {format(new Date(p.proxima_cita), "d MMM", { locale: es })}
                            </p>
                            <p className="mt-0.5 font-body text-[0.68rem] text-ink-muted tabular-nums dark:text-white/55">
                              {format(new Date(p.proxima_cita), 'HH:mm')}
                            </p>
                          </div>
                        ) : (
                          <span className="font-body text-[0.78rem] text-ink-muted dark:text-white/45">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <p className="font-display text-[1.1rem] text-ink tabular-nums dark:text-white">
                          {p.sesiones_completadas}
                        </p>
                        <p className="mt-0.5 font-body text-[0.66rem] text-ink-muted dark:text-white/55">
                          completadas
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-1">
                          {p.has_telefono ? (
                            <span
                              className="grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-primary dark:bg-primary/25 dark:text-white"
                              title="Teléfono registrado"
                              aria-label="Teléfono registrado"
                            >
                              <span className="material-symbols-outlined text-[0.95rem]" aria-hidden="true">
                                phone
                              </span>
                            </span>
                          ) : null}
                          {p.has_email ? (
                            <span
                              className="grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-primary dark:bg-primary/25 dark:text-white"
                              title="Email registrado"
                              aria-label="Email registrado"
                            >
                              <span className="material-symbols-outlined text-[0.95rem]" aria-hidden="true">
                                mail
                              </span>
                            </span>
                          ) : null}
                          {p.has_contacto_emergencia ? (
                            <span
                              className="grid h-7 w-7 place-items-center rounded-full bg-[#c89b5a]/15 text-[#8a6530] dark:bg-[#c89b5a]/25 dark:text-[#e9c88a]"
                              title="Contacto de emergencia"
                              aria-label="Contacto de emergencia"
                            >
                              <span className="material-symbols-outlined text-[0.95rem]" aria-hidden="true">
                                emergency
                              </span>
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Chip tone={p.consentimiento_rgpd ? 'positive' : 'warning'}>
                          {p.consentimiento_rgpd ? 'Firmado' : 'Pendiente'}
                        </Chip>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link href={`/admin/pacientes/${p.id}`}>
                          <Button variant="ghost" size="sm" icon="arrow_forward">
                            Ficha
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPaginas > 1 ? (
            <nav
              aria-label="Paginación"
              className="flex items-center justify-between px-6 py-4 border-t border-ink/5 dark:border-white/5"
            >
              <p className="font-body text-[0.75rem] text-ink-muted tabular-nums dark:text-white/55">
                Página {page} de {totalPaginas}
              </p>
              <div className="flex gap-2">
                <Link
                  href={{
                    pathname: '/admin/pacientes',
                    query: { ...(query ? { q: query } : {}), page: Math.max(1, page - 1) },
                  }}
                  aria-disabled={page <= 1}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full font-body text-[0.78rem] ring-1 ring-inset ring-ink/8 dark:ring-white/10 ${
                    page <= 1
                      ? 'text-ink-muted/60 pointer-events-none dark:text-white/30'
                      : 'text-ink hover:bg-white/50 dark:text-white dark:hover:bg-white/5'
                  }`}
                >
                  <span className="material-symbols-outlined text-[1rem]" aria-hidden="true">
                    chevron_left
                  </span>
                  Anterior
                </Link>
                <Link
                  href={{
                    pathname: '/admin/pacientes',
                    query: { ...(query ? { q: query } : {}), page: Math.min(totalPaginas, page + 1) },
                  }}
                  aria-disabled={page >= totalPaginas}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full font-body text-[0.78rem] ring-1 ring-inset ring-ink/8 dark:ring-white/10 ${
                    page >= totalPaginas
                      ? 'text-ink-muted/60 pointer-events-none dark:text-white/30'
                      : 'text-ink hover:bg-white/50 dark:text-white dark:hover:bg-white/5'
                  }`}
                >
                  Siguiente
                  <span className="material-symbols-outlined text-[1rem]" aria-hidden="true">
                    chevron_right
                  </span>
                </Link>
              </div>
            </nav>
          ) : null}
        </SurfaceCard>
      )}
    </>
  );
}
