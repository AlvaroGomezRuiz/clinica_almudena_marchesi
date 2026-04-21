import {
  Button,
  Chip,
  PageHeader,
  SectionDivider,
  SurfaceCard,
} from '@/components/portal-shell/ui';
import { createServerClient } from '@/lib/supabase/server';

export const metadata = { title: 'Configuración | Panel Almudena' };
export const dynamic = 'force-dynamic';

interface ProfileRow {
  id: string;
  email: string;
  nombre_display: string | null;
  role: string;
  creado_en: string;
}

interface FactorRow {
  id: string;
  factor_type: string;
  status: string;
  friendly_name: string | null;
  created_at: string;
}

export default async function AdminConfiguracionPage() {
  const supabase = createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from('profiles')
        .select('id, email, nombre_display, role, creado_en')
        .eq('id', user.id)
        .maybeSingle<ProfileRow>()
    : { data: null };

  // Listar factores MFA vía Supabase Auth (requiere el JWT vivo → getUser ya lo valida)
  const { data: factorsRes } = await supabase.auth.mfa.listFactors();
  const totpFactors = (factorsRes?.totp ?? []) as FactorRow[];
  const mfaActivo = totpFactors.some((f) => f.status === 'verified');

  return (
    <>
      <PageHeader
        eyebrow="Panel"
        title="Configuración"
        description="Perfil, seguridad de cuenta y preferencias del sistema."
      />

      <section className="grid gap-6 lg:grid-cols-3">
        {/* Perfil */}
        <SurfaceCard className="lg:col-span-2">
          <h2 className="font-display text-[1.25rem] italic text-ink mb-5">Perfil</h2>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="font-body text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">
                Nombre
              </dt>
              <dd className="mt-1 font-display text-[0.95rem] text-ink">
                {profile?.nombre_display ?? 'Almudena'}
              </dd>
            </div>
            <div>
              <dt className="font-body text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">
                Email
              </dt>
              <dd className="mt-1 font-body text-[0.9rem] text-ink">{profile?.email ?? '—'}</dd>
            </div>
            <div>
              <dt className="font-body text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">
                Rol
              </dt>
              <dd className="mt-1">
                <Chip tone="positive">Administrador</Chip>
              </dd>
            </div>
            <div>
              <dt className="font-body text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">
                User ID
              </dt>
              <dd className="mt-1 font-mono text-[0.75rem] text-ink-soft">{user?.id ?? '—'}</dd>
            </div>
          </dl>
        </SurfaceCard>

        {/* Sesión */}
        <SurfaceCard>
          <h2 className="font-display text-[1.25rem] italic text-ink mb-5">Sesión</h2>
          <p className="font-body text-[0.85rem] text-ink-soft">
            Autenticación gestionada por Supabase con JWT HttpOnly y rotación automática.
          </p>
          <form action="/api/auth/signout" method="POST" className="mt-4">
            <Button type="submit" variant="destructive" icon="logout">
              Cerrar sesión
            </Button>
          </form>
        </SurfaceCard>
      </section>

      <SectionDivider label="Seguridad" />

      <SurfaceCard>
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <div>
            <h2 className="font-display text-[1.25rem] italic text-ink">
              Autenticación de dos factores (MFA)
            </h2>
            <p className="mt-1 font-body text-[0.85rem] text-ink-soft">
              Añade un código TOTP a tu login. Obligatorio para el rol administrador.
            </p>
          </div>
          <Chip tone={mfaActivo ? 'positive' : 'warning'}>
            {mfaActivo ? 'Activo' : 'Pendiente'}
          </Chip>
        </div>

        {totpFactors.length === 0 ? (
          <p className="py-4 font-body text-[0.85rem] text-ink-soft">
            Aún no has registrado ningún factor. Añade uno con una app tipo 1Password, Authy o Google Authenticator.
          </p>
        ) : (
          <ul className="mb-4 divide-y divide-ink/5">
            {totpFactors.map((f) => (
              <li key={f.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-body text-[0.9rem] text-ink">
                    {f.friendly_name ?? 'TOTP'}
                  </p>
                  <p className="font-body text-[0.7rem] text-ink-muted">
                    Registrado el {new Date(f.created_at).toLocaleDateString('es-ES')}
                  </p>
                </div>
                <Chip tone={f.status === 'verified' ? 'positive' : 'warning'}>
                  {f.status === 'verified' ? 'Verificado' : 'Sin verificar'}
                </Chip>
              </li>
            ))}
          </ul>
        )}

        <Button variant="primary" icon="key">
          {mfaActivo ? 'Gestionar MFA' : 'Activar MFA ahora'}
        </Button>
      </SurfaceCard>
    </>
  );
}
