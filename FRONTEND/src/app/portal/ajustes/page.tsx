import {
  Button,
  Chip,
  PageHeader,
  SectionDivider,
  SurfaceCard,
} from '@/components/portal-shell/ui';
import { createServerClient } from '@/lib/supabase/server';
import { updateEmailPrefsAction, type EmailPrefs } from '@/services/notificaciones/actions';

export const metadata = { title: 'Ajustes | Portal Paciente' };
export const dynamic = 'force-dynamic';

interface ProfileRow {
  id: string;
  email: string;
  display_name: string | null;
  creado_en: string;
}

const PREF_LABELS: ReadonlyArray<{ key: keyof EmailPrefs; label: string; hint: string }> = [
  { key: 'booking_confirmed', label: 'Confirmación de reserva',  hint: 'Cuando reservas una sesión.' },
  { key: 'reminder_24h',      label: 'Recordatorio 24 h antes',  hint: 'Un aviso la tarde previa a tu cita.' },
  { key: 'booking_cancelled', label: 'Cancelación de cita',      hint: 'Si se cancela una cita por cualquier motivo.' },
  { key: 'nueva_asignacion',  label: 'Nuevos recursos',          hint: 'Cuando Almudena te asigna un recurso o tarea.' },
  { key: 'welcome',           label: 'Bienvenida y novedades',   hint: 'Correos informativos puntuales (≤ 1 al mes).' },
];

export default async function PortalAjustesPage() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, display_name, creado_en')
    .eq('id', user.id)
    .maybeSingle<ProfileRow>();

  const { data: prefsRow } = await supabase
    .from('notificaciones_prefs')
    .select('welcome, booking_confirmed, booking_cancelled, reminder_24h, nueva_asignacion')
    .eq('user_id', user.id)
    .maybeSingle<EmailPrefs>();

  const prefs: EmailPrefs = prefsRow ?? {
    welcome: true,
    booking_confirmed: true,
    booking_cancelled: true,
    reminder_24h: true,
    nueva_asignacion: true,
  };

  return (
    <>
      <PageHeader
        eyebrow="Ajustes"
        title="Tu cuenta y preferencias"
        description="Actualiza tus datos, gestiona notificaciones y controla tu privacidad."
      />

      <SurfaceCard>
        <h2 className="font-display text-[1.25rem] italic text-ink mb-5">Datos personales</h2>
        <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <dt className="font-body text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">
              Nombre visible
            </dt>
            <dd className="mt-1 font-display text-[1rem] text-ink">
              {profile?.display_name ?? user.email?.split('@')[0]}
            </dd>
          </div>
          <div>
            <dt className="font-body text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">
              Email
            </dt>
            <dd className="mt-1 font-body text-[0.9rem] text-ink">{user.email}</dd>
          </div>
          <div>
            <dt className="font-body text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">
              Alta en la plataforma
            </dt>
            <dd className="mt-1 font-body text-[0.85rem] text-ink-soft">
              {profile?.creado_en
                ? new Date(profile.creado_en).toLocaleDateString('es-ES', {
                    dateStyle: 'long',
                  })
                : '—'}
            </dd>
          </div>
          <div>
            <dt className="font-body text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">
              Autenticación
            </dt>
            <dd className="mt-1">
              <Chip tone="positive">Supabase Auth</Chip>
            </dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="surface" icon="edit">Editar perfil</Button>
          <Button variant="surface" icon="lock_reset">Cambiar contraseña</Button>
        </div>
      </SurfaceCard>

      <SectionDivider label="Notificaciones por email" />

      <SurfaceCard>
        <h2 className="font-display text-[1.25rem] italic text-ink mb-2">
          ¿Qué correos quieres recibir?
        </h2>
        <p className="font-body text-[0.9rem] text-ink-soft mb-5">
          Puedes desactivar los recordatorios sin perder el acceso a tu cuenta. Los correos de seguridad (recuperación de contraseña, cambios de datos) siempre se envían.
        </p>

        <form action={updateEmailPrefsAction} className="space-y-3">
          {PREF_LABELS.map(({ key, label, hint }) => {
            const checked = prefs[key];
            return (
              <label
                key={key}
                className="flex items-start gap-4 rounded-[14px] border border-ink/10 bg-parchment/40 px-4 py-3.5 transition-colors hover:bg-parchment/60"
              >
                <input
                  type="checkbox"
                  name={key}
                  defaultChecked={checked}
                  className="mt-1 h-5 w-5 accent-sage-dark"
                />
                <span className="flex-1">
                  <span className="block font-display text-[0.98rem] text-ink">{label}</span>
                  <span className="block font-body text-[0.82rem] text-ink-muted mt-0.5">
                    {hint}
                  </span>
                </span>
              </label>
            );
          })}

          <div className="pt-2">
            <Button type="submit" variant="primary" icon="save">
              Guardar preferencias
            </Button>
          </div>
        </form>
      </SurfaceCard>

      <SectionDivider label="Privacidad y datos" />

      <SurfaceCard>
        <h2 className="font-display text-[1.25rem] italic text-ink mb-2">
          Tus derechos RGPD
        </h2>
        <p className="font-body text-[0.9rem] text-ink-soft">
          Tienes derecho a acceder, rectificar y solicitar la eliminación de tus datos en cualquier momento.
          Todos los datos sensibles están cifrados en reposo y tránsito.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button variant="surface" icon="download">Descargar mis datos</Button>
          <Button variant="destructive" icon="delete_forever">Solicitar baja</Button>
        </div>
      </SurfaceCard>

      <SectionDivider label="Sesión" />

      <SurfaceCard>
        <h2 className="font-display text-[1.25rem] italic text-ink mb-2">Sesión activa</h2>
        <p className="font-body text-[0.85rem] text-ink-soft mb-4">
          Tu sesión está protegida con JWT HttpOnly. Se renueva automáticamente mientras navegas.
        </p>
        <form action="/api/auth/signout" method="POST">
          <Button type="submit" variant="destructive" icon="logout">
            Cerrar sesión
          </Button>
        </form>
      </SurfaceCard>
    </>
  );
}
