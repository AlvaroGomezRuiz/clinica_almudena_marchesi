import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import PortalShell from '@/components/portal-shell/PortalShell';
import type { NavItem } from '@/components/portal-shell/types';
import { createServerClient } from '@/lib/supabase/server';
import type { Profile } from '@/lib/supabase/types';

type ProfileLite = Pick<Profile, 'id' | 'role' | 'display_name' | 'avatar_url' | 'email'>;

/**
 * Layout del panel admin (Almudena).
 *
 * Seguridad:
 *   - Valida sesión Supabase (getUser con verificación JWT).
 *   - Exige role='admin' en public.profiles.
 *   - RLS activo en todas las consultas ancladas a este layout.
 *
 * Mantiene liquid glass + Editorial Serenity del sitio público.
 */

const ADMIN_NAV: readonly NavItem[] = [
  { label: 'Inicio',        href: '/admin',               icon: 'grid_view',     exact: true },
  { label: 'Agenda',        href: '/admin/agenda',        icon: 'calendar_today' },
  { label: 'Pacientes',     href: '/admin/pacientes',     icon: 'group' },
  { label: 'Mensajes',      href: '/admin/mensajes',      icon: 'chat_bubble' },
  { label: 'Facturación',   href: '/admin/facturacion',   icon: 'receipt_long' },
  { label: 'Recursos',      href: '/admin/recursos',      icon: 'folder_open' },
  { label: 'Configuración', href: '/admin/configuracion', icon: 'settings' },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
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

  if (!profile || profile.role !== 'admin') {
    // Paciente que llega a /admin → a su portal
    redirect(profile?.role === 'paciente' ? '/portal' : '/login?reason=role_mismatch');
  }

  return (
    <PortalShell
      tone="admin"
      brandTitle="Almudena Marchesi"
      brandSubtitle="Panel de gestión"
      navItems={ADMIN_NAV}
      user={{
        id: profile.id,
        email: profile.email,
        displayName: profile.display_name ?? profile.email.split('@')[0],
        avatarUrl: profile.avatar_url,
        role: 'admin',
      }}
    >
      {children}
    </PortalShell>
  );
}
