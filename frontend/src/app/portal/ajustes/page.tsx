/**
 * /portal/ajustes — Cuenta, tema, notificaciones y privacidad del paciente.
 *
 * Secciones:
 *   1. Perfil (avatar, nombre, email).
 *   2. Sesión / logout.
 *   3. Preferencias (notificaciones email + UI/tema/privacidad).
 *   4. Historial de solicitudes RGPD.
 *   5. Derechos RGPD (acceso / rectificación / portabilidad / limitación).
 *   6. Baja de cuenta (art. 17 supresión).
 */

import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import AvatarUploader from '@/components/admin/configuracion/AvatarUploader';
import BajaCuentaCard from '@/components/admin/configuracion/BajaCuentaCard';
import MfaManager from '@/components/admin/configuracion/MfaManager';
import NombreEditor from '@/components/admin/configuracion/NombreEditor';
import PreferenciasForm from '@/components/admin/configuracion/PreferenciasForm';
import DerechosRgpdCard from '@/components/portal/ajustes/DerechosRgpdCard';
import {
  Button,
  Chip,
  PageHeader,
  SectionDivider,
  SurfaceCard,
} from '@/components/portal-shell/ui';
import { CLINIC_CONTACT_EMAIL, CLINIC_PUBLIC_SITE_HOST_LABEL } from '@/lib/clinic';
import { resolveProfileDisplayNameForShell } from '@/lib/profile-display-name';
import { createServerClient } from '@/lib/supabase/server';
import type {
  NotificacionesPrefs,
  RgpdEstado,
  RgpdRequest,
  RgpdTipo,
} from '@/lib/supabase/types';

export const metadata = { title: `Ajustes | ${CLINIC_PUBLIC_SITE_HOST_LABEL}` };
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

const TIPO_LABEL: Record<RgpdTipo, string> = {
  exportar: 'Exportación de datos',
  borrado: 'Baja de cuenta',
  rectificar: 'Rectificación',
  oposicion: 'Oposición al tratamiento',
  portabilidad: 'Portabilidad',
  limitacion: 'Limitación de tratamiento',
};

const ESTADO_TONE: Record<
  RgpdEstado,
  'positive' | 'warning' | 'neutral' | 'info'
> = {
  pendiente: 'warning',
  en_revision: 'info',
  resuelta: 'positive',
  rechazada: 'neutral',
  expirada: 'neutral',
};

const ESTADO_LABEL: Record<RgpdEstado, string> = {
  pendiente: 'Pendiente',
  en_revision: 'En revisión',
  resuelta: 'Resuelta',
  rechazada: 'Rechazada',
  expirada: 'Expirada',
};

export default async function PortalAjustesPage(): Promise<JSX.Element | null> {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, display_name, avatar_url, role, created_at')
    .eq('id', user.id)
    .maybeSingle<ProfileRow>();

  const { data: prefsRow } = await supabase
    .from('notificaciones_prefs')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle<NotificacionesPrefs>();

  // MFA opcional para el paciente (Supabase Auth nativo, igual que admin).
  const { data: factorsRes } = await supabase.auth.mfa.listFactors();
  const totpFactors = ((factorsRes?.totp ?? []) as readonly TotpFactor[]).filter(
    (f) => f.factor_type === 'totp'
  );
  const mfaActivo = totpFactors.some((f) => f.status === 'verified');

  const prefs: NotificacionesPrefs = prefsRow ?? {
    user_id: user.id,
    welcome: true,
    booking_confirmed: true,
    booking_cancelled: true,
    reminder_24h: true,
    reminder_48h: true,
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

  const { data: rgpdRaw } = await supabase
    .from('rgpd_requests')
    .select(
      'id, user_id, tipo, estado, motivo, payload, resolucion, fecha_limite, resuelta_por, resuelta_at, created_at, updated_at'
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  const solicitudes = (rgpdRaw as unknown as readonly RgpdRequest[] | null) ?? [];

  const displayName = resolveProfileDisplayNameForShell(
    profile?.display_name,
    typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : undefined,
    profile?.email ?? user.email ?? undefined
  );

  return (
    <>
      <PageHeader
        eyebrow="Ajustes"
        title="Tu cuenta y preferencias"
        description="Actualiza tu perfil, gestiona notificaciones y ejerce tus derechos RGPD."
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
                {profile?.email ?? user.email ?? '—'}
              </dd>
              <p className="mt-1 font-body text-[0.7rem] text-ink-muted dark:text-white/50">
                Para cambiar el email,{' '}
                <Link
                  href={`mailto:${CLINIC_CONTACT_EMAIL}`}
                  className="underline decoration-dotted underline-offset-2 hover:text-ink dark:hover:text-white"
                >
                  contacta con Almudena
                </Link>
                .
              </p>
            </div>
            <div>
              <dt className="font-body text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted dark:text-white/55">
                Alta en la plataforma
              </dt>
              <dd className="mt-1 font-body text-[0.88rem] text-ink dark:text-white">
                {profile?.created_at
                  ? format(new Date(profile.created_at), "d 'de' LLLL yyyy", {
                      locale: es,
                    })
                  : '—'}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-body text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted dark:text-white/55">
                Rol
              </dt>
              <dd className="mt-1">
                <Chip tone="positive">
                  {profile?.role === 'admin' ? 'Administrador' : 'Paciente'}
                </Chip>
              </dd>
            </div>
          </dl>
        </SurfaceCard>

        <SurfaceCard>
          <h2 className="mb-4 font-display text-[1.25rem] italic text-ink dark:text-white">
            Sesión
          </h2>
          <p className="font-body text-[0.85rem] text-ink-soft dark:text-white/60">
            Tu sesión está protegida con JWT HttpOnly. Se renueva
            automáticamente mientras navegas y se revoca al cerrar sesión.
          </p>
          <form action="/api/auth/signout" method="POST" className="mt-4">
            <Button type="submit" variant="destructive" icon="logout">
              Cerrar sesión
            </Button>
          </form>
          <p className="mt-4 font-body text-[0.72rem] text-ink-muted dark:text-white/50">
            ¿Dudas sobre seguridad?{' '}
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

      <SectionDivider label="Seguridad de tu cuenta" />

      <SurfaceCard>
        <div className="mb-5 flex items-baseline justify-between gap-4">
          <div>
            <h2 className="font-display text-[1.25rem] italic text-ink dark:text-white">
              Verificación en dos pasos (2FA)
            </h2>
            <p className="mt-1 font-body text-[0.85rem] text-ink-soft dark:text-white/60">
              Opcional pero recomendable. Añade un código TOTP (Google
              Authenticator, 1Password, Authy…) que se pedirá al iniciar
              sesión. Tus datos clínicos quedan protegidos incluso si
              alguien llega a conocer tu contraseña.
            </p>
          </div>
          <Chip tone={mfaActivo ? 'positive' : 'neutral'}>
            {mfaActivo ? 'Activo' : 'Sin activar'}
          </Chip>
        </div>
        <MfaManager factores={totpFactors} friendlyNamePrefix="Paciente" />
      </SurfaceCard>

      <SectionDivider label="Notificaciones y experiencia" />

      <SurfaceCard>
        <h2 className="mb-2 font-display text-[1.25rem] italic text-ink dark:text-white">
          ¿Qué correos y avisos quieres recibir?
        </h2>
        <p className="mb-5 font-body text-[0.88rem] text-ink-soft dark:text-white/60">
          Cada cambio se guarda automáticamente. Los correos de seguridad
          (recuperación de contraseña, cambios de datos) siempre se envían.
        </p>
        <PreferenciasForm prefs={prefs} role="paciente" />
      </SurfaceCard>

      <SectionDivider label="Solicitudes RGPD" />

      <SurfaceCard>
        <div className="mb-5 flex items-baseline justify-between gap-4">
          <div>
            <h2 className="font-display text-[1.25rem] italic text-ink dark:text-white">
              Historial de solicitudes
            </h2>
            <p className="mt-1 font-body text-[0.85rem] text-ink-soft dark:text-white/60">
              Resolvemos cada petición en un plazo máximo de 30 días naturales.
            </p>
          </div>
          <Chip tone="neutral">{solicitudes.length}</Chip>
        </div>

        {solicitudes.length === 0 ? (
          <p className="py-4 text-center font-body text-[0.85rem] text-ink-muted dark:text-white/55">
            No has realizado solicitudes todavía.
          </p>
        ) : (
          <ul className="divide-y divide-ink/5 dark:divide-white/5">
            {solicitudes.map((s) => (
              <li key={s.id} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="font-body text-[0.88rem] text-ink dark:text-white">
                    {TIPO_LABEL[s.tipo]}
                  </p>
                  {s.motivo ? (
                    <p className="mt-0.5 line-clamp-2 font-body text-[0.75rem] text-ink-muted dark:text-white/55">
                      “{s.motivo}”
                    </p>
                  ) : null}
                  {s.resolucion ? (
                    <p className="mt-1 line-clamp-2 font-body text-[0.75rem] text-primary dark:text-white/70">
                      Resolución: {s.resolucion}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <Chip tone={ESTADO_TONE[s.estado]}>
                    {ESTADO_LABEL[s.estado]}
                  </Chip>
                  <time
                    className="font-body text-[0.7rem] text-ink-muted dark:text-white/55"
                    dateTime={s.created_at}
                  >
                    {format(new Date(s.created_at), "d LLL yyyy", { locale: es })}
                  </time>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 border-t border-ink/5 pt-5 dark:border-white/5">
          <h3 className="mb-4 font-display text-[1rem] italic text-ink dark:text-white">
            Ejerce un derecho
          </h3>
          <DerechosRgpdCard />
        </div>
      </SurfaceCard>

      <SectionDivider label="Baja de cuenta" />

      <SurfaceCard>
        <h2 className="mb-2 font-display text-[1.25rem] italic text-ink dark:text-white">
          Derecho de supresión
        </h2>
        <p className="mb-4 font-body text-[0.85rem] text-ink-soft dark:text-white/60">
          Al solicitar la baja, se eliminarán tus datos personales, citas,
          mensajes y adjuntos conforme al art. 17 del RGPD. Conservaremos
          únicamente la información requerida por obligaciones fiscales
          (facturación) durante los plazos legales.
        </p>
        <BajaCuentaCard isAdmin={profile?.role === 'admin'} />
      </SurfaceCard>
    </>
  );
}
