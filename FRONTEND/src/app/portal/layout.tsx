import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import MobileNavDrawer from '@/components/MobileNavDrawer';
import ProfileDropdown from '@/components/ProfileDropdown';
import { logoutAction } from '@/services/auth/actions';

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = cookies().get('auth_token')?.value;
  if (!token) {
    redirect('/login');
  }

  return (
    <div className="bg-background text-on-surface overflow-x-hidden">
      {/* Sidebar (Shared Component) */}
      <aside className="fixed left-0 top-0 h-screen w-64 border-r border-stone-200/20 backdrop-blur-lg flex-col p-6 space-y-4 hidden md:flex z-40 bg-[#FAF9F6]">
        <div className="mb-8">
          <h1 className="font-serif text-xl text-stone-700 font-semibold mb-6">
            Almudena Marchesi
          </h1>
          <div className="mb-8">
            <h2 className="font-serif text-lg text-stone-600 font-semibold">
              Portal Paciente
            </h2>
            <p className="text-xs text-stone-400 font-medium tracking-wide">
              Tu espacio de calma
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          {/* Active Tab: Inicio */}
          <a
            className="flex items-center gap-4 px-4 py-3 bg-white/60 text-stone-700 rounded-lg shadow-sm shadow-primary/5 transition-transform duration-300"
            href="#"
          >
            <span
              className="material-symbols-outlined text-stone-600"
              data-icon="grid_view"
            >
              grid_view
            </span>
            <span className="font-medium text-sm">Inicio</span>
          </a>
          <a
            className="flex items-center gap-4 px-4 py-3 text-stone-600 hover:bg-stone-200/30 rounded-lg hover:translate-x-1 transition-transform duration-300"
            href="#"
          >
            <span
              className="material-symbols-outlined text-stone-600"
              data-icon="calendar_today"
            >
              calendar_today
            </span>
            <span className="font-medium text-sm">Citas</span>
          </a>
          <a
            className="flex items-center gap-4 px-4 py-3 text-stone-600 hover:bg-stone-200/30 rounded-lg hover:translate-x-1 transition-transform duration-300"
            href="#"
          >
            <span
              className="material-symbols-outlined text-stone-600"
              data-icon="payments"
            >
              payments
            </span>
            <span className="font-medium text-sm">Bonos y Pagos</span>
          </a>
          <a
            className="flex items-center gap-4 px-4 py-3 text-stone-600 hover:bg-stone-200/30 rounded-lg hover:translate-x-1 transition-transform duration-300"
            href="#"
          >
            <span
              className="material-symbols-outlined text-stone-600"
              data-icon="chat_bubble"
            >
              chat_bubble
            </span>
            <span className="font-medium text-sm">Mensajes</span>
          </a>
          <a
            className="flex items-center gap-4 px-4 py-3 text-stone-600 hover:bg-stone-200/30 rounded-lg hover:translate-x-1 transition-transform duration-300"
            href="#"
          >
            <span
              className="material-symbols-outlined text-stone-600"
              data-icon="article"
            >
              article
            </span>
            <span className="font-medium text-sm">Recursos</span>
          </a>
          <a
            className="flex items-center gap-4 px-4 py-3 text-stone-600 hover:bg-stone-200/30 rounded-lg hover:translate-x-1 transition-transform duration-300"
            href="#"
          >
            <span
              className="material-symbols-outlined text-stone-600"
              data-icon="settings"
            >
              settings
            </span>
            <span className="font-medium text-sm">Ajustes</span>
          </a>
        </nav>

        <div className="pt-6 border-t border-stone-200/20">
          <button className="w-full bg-primary text-on-primary py-3 rounded-xl font-semibold text-sm shadow-lg shadow-primary/10 hover:opacity-90 transition-opacity">
            Reservar Cita
          </button>
        </div>

        <div className="pt-4 space-y-2">
          <a
            className="flex items-center gap-3 px-4 py-2 text-stone-500 hover:text-primary text-xs transition-colors"
            href="#"
          >
            <span
              className="material-symbols-outlined text-sm"
              data-icon="help_outline"
            >
              help_outline
            </span>
            <span>Ayuda</span>
          </a>
          <form action={logoutAction}>
            <button
              className="flex items-center gap-3 px-4 py-2 text-stone-500 hover:text-error text-xs transition-colors w-full"
              type="submit"
            >
              <span
                className="material-symbols-outlined text-sm"
                data-icon="logout"
              >
                logout
              </span>
              <span>Cerrar Sesión</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Top App Bar (Shared Component - Mobile/Tablet Context) */}
      <header className="fixed top-0 w-full z-50 bg-[#faf9f5]/80 backdrop-blur-xl md:pl-64">
        <div className="flex justify-between items-center px-4 sm:px-6 md:px-8 py-5">
          <div className="flex items-center gap-3">
            <MobileNavDrawer
              brandTitle="Almudena Marchesi"
              brandSubtitle="Tu espacio de calma"
              navItems={[
                { label: 'Inicio', icon: 'grid_view', href: '#' },
                { label: 'Citas', icon: 'calendar_today', href: '#' },
                { label: 'Bonos y Pagos', icon: 'payments', href: '#' },
                { label: 'Mensajes', icon: 'chat_bubble', href: '#' },
                { label: 'Recursos', icon: 'article', href: '#' },
                { label: 'Ajustes', icon: 'settings', href: '#' },
              ]}
              footerItems={[
                { label: 'Ayuda', icon: 'help_outline', href: '#' },
              ]}
              panelClassName="bg-[#FAF9F6] border-r border-stone-200/20 backdrop-blur-lg flex flex-col p-6"
              buttonClassName="md:hidden text-stone-500 hover:text-stone-900 transition-colors"
            />

            <div className="flex flex-col">
              <span className="font-serif text-xl font-semibold text-primary tracking-tight">
                Almudena Marchesi
              </span>
            </div>
          </div>

          <ProfileDropdown
            button={
              <div className="w-8 h-8 rounded-full overflow-hidden bg-stone-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="w-full h-full object-cover"
                  alt="Portrait of a smiling professional woman in soft natural lighting, calming office environment"
                  data-alt="Portrait of a smiling professional woman in soft natural lighting, calming office environment"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCe2oEjDXWQXk_oQdPcLz-IIjl7udOAQuAeYJsW4INZ5dSJnjqD129EcoU2anNhz70p13WofYQTQyZF1_PI1SZMD8QnmVqjRZRU-pRhF19p8inFD03KfdO-W_TUG9izrRVUftEJL5u5YXMNP8jxByvhBUdr-yVqy5_h3KyzUQU5QdQaSD2u2TFLSozbEsLNVzCKa11lv2sGQ-c3XauZtXNJhBs1mVCteC7tBNciAKcgUNx2POYrluyR5odg4Ibd6iw_MgAsHNdIYc8"
                />
              </div>
            }
          />
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="pt-24 md:pl-64 min-h-screen bg-background">
        {children}
      </main>
    </div>
  );
}
