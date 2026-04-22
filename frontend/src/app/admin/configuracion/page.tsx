/**
 * /admin/configuracion — Perfil, seguridad y preferencias del panel admin.
 *
 * Secciones:
 *   1. Perfil (avatar, nombre, email, rol).
 *   2. Seguridad (MFA real con enroll/verify, sesión).
 *   3. Preferencias (notificaciones email + UI/tema/privacidad).
 *   4. Registro de auditoría (últimos accesos a datos sensibles).
 *   5. RGPD / baja de cuenta.
 */

import Link from 'next/link';

import AvatarUploader from '@/components/admin/configuracion/AvatarUploader';
import BajaCuentaCard from '@/components/admin/configuracion/BajaCuentaCard';
import MfaManager from '@/components/admin/configuracion/MfaManager';
import NombreEditor from '@/components/admin/configuracion/NombreEditor';
import PreferenciasForm from '@/components/admin/configuracion/PreferenciasForm';
import {
  Button,
  Chip,
  PageHeader,
  SectionDivider,
  SurfaceCard,
} from '@/components/portal-shell/ui';
import { CLINIC_CONTACT_EMAIL } from '@/lib/clinic';
import { createServerClient } from '@/lib/supabase/server';
import type {
  AdminLookup,
  NotificacionesPrefs,
  AdminLookupCampo,
} from '@/lib/supabase/types';

export const metadata = { title: 'Configuración | Panel Almudena' };
export const dynamic = 'force-dynamic';

interface ProfileRow {
  readonly id: string;
  readonly email: string;
  readonly display_name: string | null;
  readonly avatar_url: string | null;
  readonly role: 'admin' | 'paciente';
  readonly created_at: string;
}

interface TotpFactor {
  readonly id: string;
  readonly factor_type: string;
  readonly friendly_name: string | null;
  readonly status: 'unverified' | 'verified';
  readonly created_at: string;
}

type AuditRow = AdminLookup & {
  paciente_nombre?: string | null;
};

const CAMPO_LABEL: Record<AdminLookupCampo, string> = {
  dni_nie: 'DNI / NIE',
  telefono: 'Teléfono',
  email: 'Email',
  direccion: 'Dirección',
  contacto_emergencia: 'Contacto emergencia',
  alergias: 'Alergias',
  medicacion_base: 'Medicación base',
  objetivos: 'Objetivos',
  preferencias_clinicas: 'Preferencias clínicas',
  historial_clinico: 'Historial clínico',
  diagnostico: 'Diagnóstico',
  bulk_export: 'Exportación masiva',
};

export default async function AdminConfiguracionPage(): Promise<JSX.Element> {
  const supabase = createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profileQuery = user
    ? await supabase
        .from('profiles')
        .select('id, email, display_name, avatar_url, role, created_at')
        .eq('id', user.id)
        .maybeSingle<ProfileRow>()
    : { data: null };
  const profile = profileQuery.data;

  const { data: factorsRes } = await supabase.auth.mfa.listFactors();
  const totpFactors = ((factorsRes?.totp ?? []) as readonly TotpFactor[]).filter(
    (f) => f.factor_type === 'totp'
  );
  const mfaActivo = totpFactors.some((f) => f.status === 'verified');

  const prefsQuery = user
    ? await supabase
        .from('notificaciones_prefs')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle<NotificacionesPrefs>()
    : { data: null };

  const prefs: NotificacionesPrefs = prefsQuery.data ?? {
    user_id: user?.id ?? '',
    welcome: true,
    booking_confirmed: true,
    booking_cancelled: true,
    reminder_24h: true,
    nueva_asignacion: true,
    tema: 'system',
    privacy_mode_default: false,
    sound: true,
    desktop_notifications: false,
    chat_nuevo_mensaje: true,
    marketing: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Últimos 20 accesos a datos sensibles realizados por este admin
  const { data: lookupsRaw } = await supabase
    .from('admin_lookups')
    .select('id, admin_id, paciente_id, campo, justificacion, ip_origen, user_agent, created_at')
    .eq('admin_id', user?.id ?? '')
    .order('created_at', { ascending: false })
    .limit(20);

  const lookups = (lookupsRaw ?? []) as readonly AdminLookup[];

  // Resolver nombres de pacientes (display_name) para el log
  const pacienteIds = Array.from(new Set(lookups.map((l) => l.paciente_id)));
  const nombreMap = new Map<string, string>();
  if (pacienteIds.length > 0) {
    const { data: perfiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', pacienteIds);
    for (const p of (perfiles ?? []) as readonly { id: string; display_name: string | null }[]) {
      nombreMap.set(p.id, p.display_name ?? '—');
    }
  }

  const lookupsEnriched: readonly AuditRow[] = lookups.map((l) => ({
    ...l,
    paciente_nombre: nombreMap.get(l.paciente_id) ?? null,
  }));

  const displayName = profile?.display_name ?? profile?.email?.split('@')[0] ?? 'Almudena';

  return (
    <>
      <PageHeader
        eyebrow="Panel"
        title="Configuración"
        description="Perfil, seguridad de cuenta, preferencias del sistema y registro de auditoría."
      />

      <section className="grid gap-6 lg:grid-cols-3">
        <SurfaceCard className="lg:col-span-2">
          <h2 className="mb-5 font-display text-[1.25rem] italic text-ink dark:text-white">
            Perfil
          </h2>
          <div className="mb-6">
            <AvatarUploader
              currentUrl={profile?.avatar_url ?? null}
              displayName={displayName}
            />
          </div>
          <div className="mb-5">
            <NombreEditor initial={displayName} />
          </div>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="font-body text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted dark:text-white/55">
                Email
              </dt>
              <dd className="mt-1 font-body text-[0.9rem] text-ink dark:text-white">
                {profile?.email ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="font-body text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted dark:text-white/55">
                Rol
              </dt>
              <dd className="mt-1">
                <Chip tone="positive">
                  {profile?.role === 'admin' ? 'Administrador' : 'Paciente'}
                </Chip>
              </dd>
            </div>
            <div>
              <dt className="font-body text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted dark:text-white/55">
                Miembro desde
              </dt>
              <dd className="mt-1 font-body text-[0.88rem] text-ink dark:text-white">
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="font-body text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted dark:text-white/55">
                User ID
              </dt>
              <dd className="mt-1 font-mono text-[0.72rem] text-ink-soft dark:text-white/50">
                {user?.id ?? '—'}
              </dd>
            </div>
          </dl>
        </SurfaceCard>

        <SurfaceCard>
          <h2 className="mb-5 font-display text-[1.25rem] italic text-ink dark:text-white">
            Sesión
          </h2>
          <p className="font-body text-[0.85rem] text-ink-soft dark:text-white/60">
            Autenticación gestionada por Supabase con JWT HttpOnly y rotación
            automática. Al cerrar sesión, se revocan los tokens en todos los
            dispositivos sincronizados.
          </p>
          <form action="/api/auth/signout" method="POST" className="mt-4">
            <Button type="submit" variant="destructive" icon="logout">
              Cerrar sesión
            </Button>
          </form>
          <p className="mt-4 font-body text-[0.72rem] text-ink-muted dark:text-white/50">
            ¿Crees que alguien accedió sin permiso?{' '}
            <Link
              href={`mailto:${CLINIC_CONTACT_EMAIL}`}
              className="underline decoration-dotted underline-offset-2 hover:text-ink dark:hover:text-white"
            >
              Contacta con soporte
            </Link>
            .
          </p>
        </SurfaceCard>
      </section>

      <SectionDivider label="Seguridad" />

      <SurfaceCard>
        <div className="mb-5 flex items-baseline justify-between gap-4">
          <div>
            <h2 className="font-display text-[1.25rem] italic text-ink dark:text-white">
              Autenticación de dos factores (MFA)
            </h2>
            <p className="mt-1 font-body text-[0.85rem] text-ink-soft dark:text-white/60">
              Añade un código TOTP a tu login. Obligatorio para el rol
              administrador conforme a LOPDGDD y RGPD.
            </p>
          </div>
          <Chip tone={mfaActivo ? 'positive' : 'warning'}>
            {mfaActivo ? 'Activo' : 'Pendiente'}
          </Chip>
        </div>
        <MfaManager factores={totpFactors} />
      </SurfaceCard>

      <SectionDivider label="Preferencias" />

      <SurfaceCard>
        <h2 className="mb-5 font-display text-[1.25rem] italic text-ink dark:text-white">
          Notificaciones y experiencia
        </h2>
        <PreferenciasForm prefs={prefs} />
      </SurfaceCard>

      <SectionDivider label="Registro de auditoría" />

      <SurfaceCard>
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <div>
            <h2 className="font-display text-[1.25rem] italic text-ink dark:text-white">
              Mis accesos recientes a datos sensibles
            </h2>
            <p className="mt-1 font-body text-[0.85rem] text-ink-soft dark:text-white/60">
              Cada vez que revelas un campo protegido (DNI, teléfono…) queda
              registrado. El log es inmutable (append-only) y nunca se borra.
            </p>
          </div>
          <Chip tone="neutral">{lookupsEnriched.length} / 20 últimos</Chip>
        </div>
        {lookupsEnriched.length === 0 ? (
          <p className="py-6 text-center font-body text-[0.85rem] text-ink-muted dark:text-white/55">
            Aún no has consultado ningún campo sensible.
          </p>
        ) : (
          <ul className="divide-y divide-ink/5 dark:divide-white/5">
            {lookupsEnriched.map((l) => (
              <li key={l.id} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="font-body text-[0.88rem] text-ink dark:text-white">
                    {CAMPO_LABEL[l.campo]} ·{' '}
                    <Link
                      href={`/admin/pacientes/${l.paciente_id}`}
                      className="underline decoration-dotted underline-offset-2 hover:text-primary"
                    >
                      {l.paciente_nombre ?? 'Paciente'}
                    </Link>
                  </p>
                  {l.justificacion ? (
                    <p className="mt-0.5 truncate font-body text-[0.75rem] text-ink-muted dark:text-white/55">
                      “{l.justificacion}”
                    </p>
                  ) : null}
                </div>
                <time
                  className="shrink-0 font-body text-[0.72rem] text-ink-muted dark:text-white/55"
                  dateTime={l.created_at}
                >
                  {new Date(l.created_at).toLocaleString('es-ES', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
              </li>
            ))}
          </ul>
        )}
      </SurfaceCard>

      <SectionDivider label="Privacidad y RGPD" />

      <SurfaceCard>
        <h2 className="mb-3 font-display text-[1.25rem] italic text-ink dark:text-white">
          Tus derechos RGPD
        </h2>
        <p className="font-body text-[0.85rem] text-ink-soft dark:text-white/60">
          Puedes ejercer tus derechos de acceso, rectificación, supresión,
          oposición, portabilidad y limitación en cualquier momento.
        </p>
        <div className="mt-4">
          <BajaCuentaCard isAdmin={profile?.role === 'admin'} />
        </div>
      </SurfaceCard>
    </>
  );
}
