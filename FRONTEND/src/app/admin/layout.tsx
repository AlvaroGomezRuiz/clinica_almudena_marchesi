import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

import MobileNavDrawer from '@/components/MobileNavDrawer';
import ProfileDropdown from '@/components/ProfileDropdown';
import { logoutAction } from '@/services/auth/actions';

type AdminStatus = {
  is_admin: boolean;
  mfa_verified: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseAdminStatus(data: unknown): AdminStatus | null {
  if (!isRecord(data)) return null;
  const isAdmin = data['is_admin'];
  const mfaVerified = data['mfa_verified'];
  if (typeof isAdmin !== 'boolean' || typeof mfaVerified !== 'boolean') return null;
  return { is_admin: isAdmin, mfa_verified: mfaVerified };
}

async function getAdminStatus(token: string): Promise<AdminStatus | null> {
  const backendApiUrl =
    process.env.NEXT_PUBLIC_BACKEND_API_URL ?? 'http://localhost:8000/api/v1';

  try {
    const res = await fetch(`${backendApiUrl}/auth/admin/status`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    if (!res.ok) return null;

    const data: unknown = await res.json().catch(() => null);
    return parseAdminStatus(data);
  } catch {
    return null;
  }
}

function getUsernameFromJwt(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
    const payload = JSON.parse(payloadJson);
    return typeof payload?.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = headers().get('x-pathname') ?? '';
  const isMfaPage = pathname.startsWith('/admin/mfa');

  const activeNav = pathname.startsWith('/admin/pacientes')
    ? 'pacientes'
    : pathname.startsWith('/admin/agenda')
      ? 'agenda'
      : pathname.startsWith('/admin/facturacion')
        ? 'facturacion'
        : pathname.startsWith('/admin/recursos')
          ? 'recursos'
          : pathname.startsWith('/admin/mensajes')
            ? 'mensajes'
            : pathname.startsWith('/admin/configuracion')
              ? 'configuracion'
              : 'inicio';

  const token = cookies().get('auth_token')?.value;
  if (!token) {
    redirect('/login');
  }

  const username = getUsernameFromJwt(token);
  const displayName = username ? username.split('@')[0] : null;

  const status = await getAdminStatus(token);
  if (!status?.is_admin) {
    redirect('/login');
  }

  if (!isMfaPage && !status.mfa_verified) {
    redirect('/admin/mfa');
  }

  if (isMfaPage && status.mfa_verified) {
    redirect('/admin');
  }

  return (
    <div className="bg-surface text-on-surface selection:bg-primary-container selection:text-on-primary-container overflow-x-hidden">
      {/* SideNavBar Shell */}
      <aside className="hidden md:flex h-screen w-64 fixed left-0 top-0 bg-surface-container-low flex-col py-8 px-6 z-50">
        <div className="mb-12 px-2">
          <h1 className="font-serif text-[1.1rem] leading-tight text-primary">
            Almudena Marchesi
          </h1>
          <p className="font-sans text-[0.7rem] uppercase tracking-wider text-outline mt-1">
            CLINICAL PORTAL
          </p>
        </div>

        <nav className="flex-grow space-y-4">
          <a
            className={
              activeNav === 'inicio'
                ? 'flex items-center gap-4 px-4 py-2 text-on-surface bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/15 transition-all'
                : 'flex items-center gap-4 px-4 py-2 text-on-surface-variant hover:text-primary transition-colors'
            }
            href="/admin"
          >
            <span
              className="material-symbols-outlined text-xl"
              data-icon="grid_view"
            >
              grid_view
            </span>
            <span className="text-[0.9rem] font-medium">Inicio</span>
          </a>
          <a
            className={
              activeNav === 'pacientes'
                ? 'flex items-center gap-4 px-4 py-2 text-on-surface bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/15 transition-all'
                : 'flex items-center gap-4 px-4 py-2 text-on-surface-variant hover:text-primary transition-colors'
            }
            href="/admin/pacientes"
          >
            <span
              className="material-symbols-outlined text-xl"
              data-icon="group"
            >
              group
            </span>
            <span className="text-[0.9rem] font-medium">Pacientes</span>
          </a>
          <a
            className={
              activeNav === 'agenda'
                ? 'flex items-center gap-4 px-4 py-2 text-on-surface bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/15 transition-all'
                : 'flex items-center gap-4 px-4 py-2 text-on-surface-variant hover:text-primary transition-colors'
            }
            href="/admin/agenda"
          >
            <span
              className="material-symbols-outlined text-xl"
              data-icon="calendar_today"
            >
              calendar_today
            </span>
            <span className="text-[0.9rem] font-medium">Agenda</span>
          </a>

          <a
            className={
              activeNav === 'facturacion'
                ? 'flex items-center gap-4 px-4 py-2 text-on-surface bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/15 transition-all'
                : 'flex items-center gap-4 px-4 py-2 text-on-surface-variant hover:text-primary transition-colors'
            }
            href="/admin/facturacion"
          >
            <span
              className="material-symbols-outlined text-xl"
              data-icon="payments"
            >
              payments
            </span>
            <span className="text-[0.9rem] font-medium">Facturación</span>
          </a>

          <a
            className={
              activeNav === 'recursos'
                ? 'flex items-center gap-4 px-4 py-2 text-on-surface bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/15 transition-all'
                : 'flex items-center gap-4 px-4 py-2 text-on-surface-variant hover:text-primary transition-colors'
            }
            href="/admin/recursos"
          >
            <span
              className="material-symbols-outlined text-xl"
              data-icon="folder"
            >
              folder
            </span>
            <span className="text-[0.9rem] font-medium">Recursos</span>
          </a>

          <a
            className={
              activeNav === 'mensajes'
                ? 'flex items-center gap-4 px-4 py-2 text-on-surface bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/15 transition-all'
                : 'flex items-center gap-4 px-4 py-2 text-on-surface-variant hover:text-primary transition-colors'
            }
            href="/admin/mensajes"
          >
            <span
              className="material-symbols-outlined text-xl"
              data-icon="chat_bubble"
            >
              chat_bubble
            </span>
            <span className="text-[0.9rem] font-medium">Mensajes</span>
          </a>

          <a
            className={
              activeNav === 'configuracion'
                ? 'flex items-center gap-4 px-4 py-2 text-on-surface bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/15 transition-all'
                : 'flex items-center gap-4 px-4 py-2 text-on-surface-variant hover:text-primary transition-colors'
            }
            href="/admin/configuracion"
          >
            <span
              className="material-symbols-outlined text-xl"
              data-icon="settings"
            >
              settings
            </span>
            <span className="text-[0.9rem] font-medium">Configuración</span>
          </a>
        </nav>

        <div className="mt-auto space-y-3 px-2">
          <form action={logoutAction}>
            <button
              className="flex items-center gap-4 py-2 text-outline hover:text-primary transition-colors w-full"
              type="submit"
            >
              <span
                className="material-symbols-outlined text-xl"
                data-icon="logout"
              >
                logout
              </span>
              <span className="text-[0.8rem] font-medium">Cerrar Sesión</span>
            </button>
          </form>
        </div>
      </aside>

      {/* TopAppBar Shell */}
      <header className="fixed top-0 right-0 left-0 md:left-64 z-50 bg-surface/80 backdrop-blur-sm border-b border-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 h-20 flex items-center justify-between md:justify-end gap-6">
          <MobileNavDrawer
            brandTitle="Almudena Marchesi"
            brandSubtitle="CLINICAL PORTAL"
            tone="primary"
            navItems={[
              { label: 'Inicio', icon: 'grid_view', href: '/admin' },
              { label: 'Pacientes', icon: 'group', href: '/admin/pacientes' },
              {
                label: 'Agenda',
                icon: 'calendar_today',
                href: '/admin/agenda',
              },
              {
                label: 'Facturación',
                icon: 'payments',
                href: '/admin/facturacion',
              },
              { label: 'Recursos', icon: 'folder', href: '/admin/recursos' },
              {
                label: 'Mensajes',
                icon: 'chat_bubble',
                href: '/admin/mensajes',
              },
              {
                label: 'Configuración',
                icon: 'settings',
                href: '/admin/configuracion',
              },
            ]}
            panelClassName="bg-primary text-white flex flex-col py-8 px-6"
            buttonClassName="md:hidden text-stone-500 hover:text-stone-900 transition-colors"
          />

          <div className="flex items-center gap-6 min-w-0">
            <div className="text-right min-w-0">
              <p className="text-[0.75rem] font-bold text-primary leading-none truncate max-w-[50vw] md:max-w-none">
                {displayName || '—'}
              </p>
              <p className="text-[0.65rem] text-outline uppercase tracking-widest mt-0.5">
                PANEL DE GESTIÓN
              </p>
            </div>

            <ProfileDropdown
              button={
                <span
                  className="material-symbols-outlined text-4xl text-stone-400 hover:text-stone-900 transition-colors shrink-0"
                  data-icon="account_circle"
                >
                  account_circle
                </span>
              }
            />
          </div>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="ml-0 md:ml-64 pt-28 px-4 sm:px-6 md:px-8 pb-12 min-h-screen">
        {children}
      </main>
    </div>
  );
}
