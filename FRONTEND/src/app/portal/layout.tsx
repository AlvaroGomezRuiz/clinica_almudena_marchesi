import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import PortalShell from '@/components/portal-shell/PortalShell';
import type { NavItem } from '@/components/portal-shell/types';
import { createServerClient } from '@/lib/supabase/server';
import type { Profile } from '@/lib/supabase/types';

type ProfileLite = Pick<Profile, 'id' | 'role' | 'display_name' | 'avatar_url' | 'email'>;

/**
 * Layout del portal de pacientes.
 *
 * Seguridad:
 *   - Valida sesión Supabase (getUser).
 *   - Exige role='paciente'.
 *   - Payment-gate: si no tiene pagos completados y no es consulta inicial gratuita,
 *     redirige a /pagos. (Se valida vía consulta directa a `pagos`, no a FastAPI.)
 */

const PATIENT_NAV: readonly NavItem[] = [
  { label: 'Inicio',         href: '/portal',          icon: 'grid_view',     exact: true },
  { label: 'Citas',          href: '/portal/citas',    icon: 'calendar_today' },
  { label: 'Bonos y Pagos',  href: '/portal/pagos',    icon: 'payments' },
  { label: 'Mensajes',       href: '/portal/mensajes', icon: 'chat_bubble' },
  { label: 'Recursos',       href: '/portal/recursos', icon: 'article' },
  { label: 'Ajustes',        href: '/portal/ajustes',  icon: 'settings' },
];

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const supabase = createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    redirect('/login?reason=no_session');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, display_name, avatar_url, email')
    .eq('id', user.id)
    .maybeSingle<ProfileLite>();

  if (!profile || profile.role !== 'paciente') {
    redirect(profile?.role === 'admin' ? '/admin' : '/login?reason=role_mismatch');
  }

  const footerCta = (
    <Link
      href="/portal/citas/reservar"
      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 font-display text-[0.85rem] font-medium text-on-primary shadow-[0_8px_24px_-8px_rgba(75,100,95,0.35)] hover:bg-primary-dim transition-all"
    >
      <span className="material-symbols-outlined text-[1.1rem]" aria-hidden="true">
        add
      </span>
      Reservar cita
    </Link>
  );

  return (
    <PortalShell
      tone="patient"
      brandTitle="Almudena Marchesi"
      brandSubtitle="Tu espacio de calma"
      navItems={PATIENT_NAV}
      footerSlot={footerCta}
      user={{
        id: profile.id,
        email: profile.email,
        displayName: profile.display_name ?? profile.email.split('@')[0],
        avatarUrl: profile.avatar_url,
        role: 'paciente',
      }}
    >
      {children}
    </PortalShell>
  );
}
