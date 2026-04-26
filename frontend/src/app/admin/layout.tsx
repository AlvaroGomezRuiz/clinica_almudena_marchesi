import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import RefreshOnVisibility from '@/components/layout/RefreshOnVisibility';
import PortalShell from '@/components/portal-shell/PortalShell';
import type { NavItem } from '@/components/portal-shell/types';
import { unpackDisplayNameFromRequestHeader } from '@/lib/supabase/header-display-name';
import { SSH_KEYS } from '@/lib/supabase/middleware';
import { resolveProfileDisplayNameForShell } from '@/lib/profile-display-name';
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
 * Performance:
 *   - El middleware ya verificó al usuario e inyectó la identidad vía
 *     request headers internos (`x-ss-*`). Si están presentes, evitamos
 *     las 2 llamadas a Supabase (getUser + profiles) → ahorro ~100-300 ms
 *     por navegación. Si no (ruta fuera del matcher o fallo del middleware),
 *     hacemos fallback seguro.
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
  const h = headers();
  const hId = h.get(SSH_KEYS.id);
  const hEmail = h.get(SSH_KEYS.email);
  const hRole = h.get(SSH_KEYS.role);

  let profile: ProfileLite | null = null;
  let authMetadataFullName: string | undefined;

  if (hId && hEmail && hRole) {
    /* Fast path: datos verificados por el middleware. */
    if (hRole !== 'admin') {
      redirect(hRole === 'paciente' ? '/portal' : '/login?reason=role_mismatch');
    }
    profile = {
      id: hId,
      email: hEmail,
      role: hRole as 'admin',
      display_name: unpackDisplayNameFromRequestHeader(h.get(SSH_KEYS.name)),
      avatar_url: h.get(SSH_KEYS.avatar),
    };
  } else {
    /* Fallback: el middleware no inyectó identidad. Verificamos a mano. */
    const supabase = createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !user.email) {
      redirect('/login?reason=no_session');
    }

    const metaFn = user.user_metadata?.full_name;
    authMetadataFullName = typeof metaFn === 'string' ? metaFn : undefined;

    const { data: fetched } = await supabase
      .from('profiles')
      .select('id, role, display_name, avatar_url, email')
      .eq('id', user.id)
      .maybeSingle<ProfileLite>();

    if (!fetched || fetched.role !== 'admin') {
      redirect(fetched?.role === 'paciente' ? '/portal' : '/login?reason=role_mismatch');
    }
    profile = fetched;
  }

  const shellDisplayName = resolveProfileDisplayNameForShell(
    profile.display_name,
    authMetadataFullName,
    profile.email
  );

  const supabase = createServerClient();
  const { data: unreadRows } = await supabase
    .from('conversaciones')
    .select('unread_admin')
    .gt('unread_admin', 0);
  const mensajesUnread =
    (unreadRows as { unread_admin: number }[] | null)?.reduce(
      (acc, row) => acc + (row.unread_admin ?? 0),
      0
    ) ?? 0;

  return (
    <>
      <PortalShell
        tone="admin"
        brandTitle="Almudena Marchesi"
        brandSubtitle="Panel de gestión"
        navItems={ADMIN_NAV}
        mensajesUnread={mensajesUnread}
        user={{
          id: profile.id,
          email: profile.email,
          displayName: shellDisplayName,
          avatarUrl: profile.avatar_url,
          role: 'admin',
        }}
      >
        {children}
      </PortalShell>
      <RefreshOnVisibility />
    </>
  );
}
