import {
  CLINIC_ADDRESS,
  CLINIC_PAYMENT_METHODS,
  CLINIC_SESSION_DURATION_MIN,
  CLINIC_SESSION_PRICE_LABEL,
} from '@/lib/clinic';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

type AdminConfiguracion = {
  nombre: string | null;
  colegiada: string | null;
  email: string | null;
  mfa_enabled: boolean;
  intrusion_alerts_enabled: boolean;
};

function getBackendApiUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BACKEND_API_URL ?? 'http://localhost:8000/api/v1'
  );
}

async function fetchJson<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Fetch failed (${res.status})`);
  }

  return (await res.json()) as T;
}

async function putJson<T>(
  url: string,
  token: string,
  body: unknown
): Promise<T> {
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Fetch failed (${res.status})`);
  }

  return (await res.json()) as T;
}

export default async function AdminConfiguracionPage() {
  const token = cookies().get('auth_token')?.value;
  if (!token) {
    redirect('/login');
  }

  const backendApiUrl = getBackendApiUrl();

  let cfg: AdminConfiguracion | null = null;
  let cfgError = false;

  try {
    cfg = await fetchJson<AdminConfiguracion>(
      `${backendApiUrl}/admin/config`,
      token
    );
  } catch {
    cfgError = true;
    cfg = null;
  }

  const displayNombre = (cfg?.nombre || '').trim() || '—';
  const isMfaEnabled = Boolean(cfg?.mfa_enabled);
  const isIntrusionEnabled = Boolean(cfg?.intrusion_alerts_enabled);

  async function guardarPerfilAction(formData: FormData) {
    'use server';
    const tokenInner = cookies().get('auth_token')?.value;
    if (!tokenInner) {
      redirect('/login');
    }

    const backendApiUrlInner = getBackendApiUrl();

    const nombre = String(formData.get('nombre') ?? '');
    const colegiada = String(formData.get('colegiada') ?? '');
    const email = String(formData.get('email') ?? '');

    try {
      await putJson<AdminConfiguracion>(
        `${backendApiUrlInner}/admin/config`,
        tokenInner,
        { nombre, colegiada, email }
      );
    } catch {
      // Sin inventar estados/toasts: volvemos a la pantalla.
    }

    redirect('/admin/configuracion');
  }

  async function toggleMfaAction(formData: FormData) {
    'use server';
    const tokenInner = cookies().get('auth_token')?.value;
    if (!tokenInner) {
      redirect('/login');
    }

    const backendApiUrlInner = getBackendApiUrl();
    const nextRaw = String(formData.get('next') ?? '').trim();
    const next = nextRaw === '1';

    try {
      await putJson<AdminConfiguracion>(
        `${backendApiUrlInner}/admin/configuracion/seguridad`,
        tokenInner,
        { mfa_enabled: next }
      );
    } catch {
      // Silencioso por diseño: recargamos para reflejar estado real.
    }

    redirect('/admin/configuracion');
  }

  async function toggleIntrusionAlertsAction(formData: FormData) {
    'use server';
    const tokenInner = cookies().get('auth_token')?.value;
    if (!tokenInner) {
      redirect('/login');
    }

    const backendApiUrlInner = getBackendApiUrl();
    const nextRaw = String(formData.get('next') ?? '').trim();
    const next = nextRaw === '1';

    try {
      await putJson<AdminConfiguracion>(
        `${backendApiUrlInner}/admin/configuracion/seguridad`,
        tokenInner,
        { intrusion_alerts_enabled: next }
      );
    } catch {
      // Silencioso por diseño: recargamos para reflejar estado real.
    }

    redirect('/admin/configuracion');
  }

  return (
    <div className="max-w-7xl mx-auto w-full min-w-0 space-y-12 pb-24">
      {/* Page Header */}
      <header>
        <h2 className="font-serif tracking-tight text-primary text-3xl italic">
          Configuración Avanzada
        </h2>
      </header>

      {/* Editorial Header */}
      <section className="relative py-6">
        <div className="flex flex-col md:flex-row items-center gap-10">
          <div className="w-40 h-40 shrink-0 rounded-3xl bg-primary-container flex items-center justify-center text-primary">
            <span
              className="material-symbols-outlined text-6xl"
              data-icon="account_circle"
            >
              account_circle
            </span>
          </div>
          <div>
            <h3 className="font-serif text-4xl text-on-surface leading-tight mb-4">
              Perfil Profesional de{' '}
              <span className="italic text-primary">{displayNombre}</span>
            </h3>
            <p className="text-lg text-on-surface-variant max-w-2xl leading-relaxed">
              Gestione su identidad profesional y las credenciales de seguridad.
              Cada ajuste garantiza la confidencialidad de sus pacientes.
            </p>

            <div className="mt-6 bg-surface-container-low rounded-2xl p-6">
              <p className="text-[10px] uppercase tracking-widest text-primary font-bold">
                Datos clínicos (global)
              </p>
              <p className="mt-3 text-sm text-on-surface leading-relaxed">
                {CLINIC_ADDRESS}
              </p>
              <p className="mt-2 text-sm text-on-surface-variant">
                Sesiones: {CLINIC_SESSION_DURATION_MIN} min • Coste:{' '}
                {CLINIC_SESSION_PRICE_LABEL}
              </p>
              <p className="mt-1 text-sm text-on-surface-variant">
                Pagos: {CLINIC_PAYMENT_METHODS.join(', ')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Grid Settings */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Card: El Búnker */}
        <div className="md:col-span-2 bg-surface-container-lowest p-10 rounded-xl editorial-shadow border-l-[5px] border-primary flex flex-col justify-between min-w-0">
          <div>
            <div className="flex justify-between items-start mb-8">
              <div className="bg-primary-container p-3 rounded-full">
                <span
                  className="material-symbols-outlined text-primary"
                  data-icon="security"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  security
                </span>
              </div>
              <span className="text-[10px] uppercase tracking-widest text-primary font-bold">
                Estado: —
              </span>
            </div>

            <h4 className="font-serif text-2xl mb-4">Ajustes del Búnker</h4>
            <p className="text-on-surface-variant mb-8 leading-relaxed">
              Gestión avanzada de claves de cifrado <strong>AES-256</strong>.
            </p>

            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-lg">
                <div className="flex flex-col">
                  <span className="text-xs uppercase text-outline">
                    Clave Maestra Actual
                  </span>
                  <span className="font-bold text-on-surface">—</span>
                </div>
                <button
                  className="text-primary text-sm uppercase tracking-wider hover:underline disabled:opacity-50"
                  type="button"
                  disabled
                >
                  Rotar Clave
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-lg">
                <div className="flex flex-col">
                  <span className="text-xs uppercase text-outline">
                    Protocolo de Emergencia
                  </span>
                  <span className="text-on-surface">—</span>
                </div>
                <span
                  className="material-symbols-outlined text-outline"
                  data-icon="verified_user"
                >
                  verified_user
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-outline-variant/15">
            {cfgError ? (
              <button
                className="w-full bg-primary text-on-primary uppercase py-4 rounded-xl tracking-widest editorial-shadow hover:opacity-95 transition-all disabled:opacity-50"
                type="button"
                disabled
                aria-disabled="true"
                title="No disponible (sin conexión con backend)"
              >
                Descargar Copia de Seguridad de Claves
              </button>
            ) : (
              <a
                className="w-full bg-primary text-on-primary uppercase py-4 rounded-xl tracking-widest editorial-shadow hover:opacity-95 transition-all block text-center"
                href="/api/admin/config/backup-keys"
              >
                Descargar Copia de Seguridad de Claves
              </a>
            )}
          </div>
        </div>

        {/* Card: MFA Account */}
        <div className="bg-secondary-container p-8 rounded-xl border-l-[5px] border-secondary flex flex-col justify-between min-w-0">
          <div>
            <div className="mb-6">
              <span
                className="material-symbols-outlined text-on-secondary-container text-4xl"
                data-icon="fingerprint"
              >
                fingerprint
              </span>
            </div>
            <h4 className="font-serif text-xl text-on-secondary-container mb-4">
              Gestión de Cuentas (MFA)
            </h4>
            <p className="text-sm text-on-secondary-fixed-variant leading-relaxed mb-6">
              Añada una capa extra de seguridad mediante autenticación de dos
              factores.
            </p>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-on-secondary-container">
                  Google Authenticator
                </span>
                <form action={toggleMfaAction}>
                  <input
                    type="hidden"
                    name="next"
                    value={isMfaEnabled ? '0' : '1'}
                  />
                  <button
                    className={`w-10 h-5 rounded-full relative flex items-center px-1 transition-colors ${
                      isMfaEnabled
                        ? 'bg-secondary justify-end'
                        : 'bg-on-secondary-container/20 justify-start'
                    } ${cfgError ? 'opacity-60 cursor-not-allowed' : ''}`}
                    type="submit"
                    role="switch"
                    aria-checked={isMfaEnabled}
                    disabled={cfgError}
                    title={
                      cfgError
                        ? 'No disponible (sin conexión con backend)'
                        : isMfaEnabled
                          ? 'Desactivar'
                          : 'Activar'
                    }
                  >
                    <span className="w-3 h-3 bg-surface rounded-full" />
                  </button>
                </form>
              </div>

              <label className="flex items-center gap-3 opacity-70">
                <input
                  className="w-5 h-5 rounded border-secondary text-secondary focus:ring-secondary/20"
                  type="checkbox"
                  disabled
                />
                <span className="text-sm text-on-secondary-container">
                  Autenticación por SMS
                </span>
              </label>

              <label className="flex items-center gap-3 opacity-70">
                <input
                  className="w-5 h-5 rounded border-secondary text-secondary focus:ring-secondary/20"
                  type="checkbox"
                  disabled
                />
                <span className="text-sm text-on-secondary-container">
                  Yubikey Hardware
                </span>
              </label>
            </div>
          </div>

          <button
            className="mt-8 py-3 px-4 border border-on-secondary-container/20 rounded-lg text-xs uppercase tracking-widest text-on-secondary-container hover:bg-on-secondary-container/5 transition-colors disabled:opacity-50"
            type="button"
            disabled
          >
            Configurar Dispositivo
          </button>
        </div>

        {/* Card: Sentry Notifications */}
        <div className="md:col-span-1 bg-tertiary-container p-8 rounded-xl border-l-[5px] border-tertiary">
          <div className="flex flex-col h-full">
            <div className="mb-6">
              <span
                className="material-symbols-outlined text-tertiary text-4xl"
                data-icon="notification_important"
              >
                notification_important
              </span>
            </div>
            <h4 className="font-serif text-xl text-on-tertiary-container mb-4">
              Notificaciones Sentry
            </h4>
            <p className="text-sm text-on-tertiary-container/80 leading-relaxed mb-8">
              Configure la sensibilidad del sistema de alertas.
            </p>

            <div className="space-y-8 flex-1">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs uppercase tracking-wider text-tertiary font-bold">
                    Nivel de Criticidad
                  </span>
                  <span className="text-xs text-tertiary">—</span>
                </div>
                <input
                  className="w-full h-1 bg-tertiary/20 accent-tertiary appearance-none rounded-full"
                  type="range"
                  disabled
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-on-tertiary-container">
                    Alertas de Intrusión
                  </span>
                  <form action={toggleIntrusionAlertsAction}>
                    <input
                      type="hidden"
                      name="next"
                      value={isIntrusionEnabled ? '0' : '1'}
                    />
                    <button
                      className={`w-10 h-5 rounded-full relative flex items-center px-1 transition-colors ${
                        isIntrusionEnabled
                          ? 'bg-tertiary justify-end'
                          : 'bg-tertiary/30 justify-start'
                      } ${cfgError ? 'opacity-60 cursor-not-allowed' : ''}`}
                      type="submit"
                      role="switch"
                      aria-checked={isIntrusionEnabled}
                      disabled={cfgError}
                      title={
                        cfgError
                          ? 'No disponible (sin conexión con backend)'
                          : isIntrusionEnabled
                            ? 'Desactivar'
                            : 'Activar'
                      }
                    >
                      <span className="w-3 h-3 bg-surface rounded-full" />
                    </button>
                  </form>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-on-tertiary-container">
                    Errores de Sincronización
                  </span>
                  <button
                    className="w-10 h-5 bg-tertiary/30 rounded-full relative flex items-center px-1 disabled:opacity-60"
                    type="button"
                    disabled
                  >
                    <span className="w-3 h-3 bg-white rounded-full" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card: Advanced Logs */}
        <div className="md:col-span-2 bg-surface-container-high p-10 rounded-xl flex items-center justify-between gap-6">
          <div className="max-w-md">
            <h4 className="font-serif text-xl mb-2">
              Registro de Actividad Avanzado
            </h4>
            <p className="text-sm text-on-surface-variant">
              Historial inmutable de accesos a datos (cumplimiento RGPD).
            </p>
          </div>
          <div className="flex gap-4">
            <button
              className="p-4 rounded-full border border-outline-variant hover:bg-surface-bright transition-colors disabled:opacity-50"
              type="button"
              disabled
            >
              <span
                className="material-symbols-outlined text-on-surface"
                data-icon="download"
              >
                download
              </span>
            </button>
            <button
              className="bg-on-surface text-surface py-3 px-8 rounded-full text-xs uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
              type="button"
              disabled
            >
              Ver Registros
            </button>
          </div>
        </div>
      </section>

      {/* Profile Info Fields */}
      <section className="pt-8">
        <div className="mb-10">
          <h4 className="font-serif text-2xl mb-2 italic">
            Detalles del Perfil
          </h4>
          <div className="w-20 h-0.5 bg-primary" />
        </div>

        <form action={guardarPerfilAction}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
            <div className="relative">
              <label className="absolute -top-6 left-0 text-[10px] uppercase tracking-widest text-primary font-bold">
                Nombre Completo
              </label>
              <input
                className="w-full bg-transparent border-t-0 border-x-0 border-b-2 border-primary-fixed-dim focus:border-primary px-0 py-2 text-lg text-on-surface placeholder:text-outline-variant"
                type="text"
                name="nombre"
                placeholder="—"
                defaultValue={cfg?.nombre ?? ''}
                disabled={cfgError}
              />
            </div>

            <div className="relative">
              <label className="absolute -top-6 left-0 text-[10px] uppercase tracking-widest text-primary font-bold">
                Número de Colegiada
              </label>
              <input
                className="w-full bg-transparent border-t-0 border-x-0 border-b-2 border-primary-fixed-dim focus:border-primary px-0 py-2 text-lg text-on-surface placeholder:text-outline-variant"
                type="text"
                name="colegiada"
                placeholder="—"
                defaultValue={cfg?.colegiada ?? ''}
                disabled={cfgError}
              />
            </div>

            <div className="relative">
              <label className="absolute -top-6 left-0 text-[10px] uppercase tracking-widest text-primary font-bold">
                Correo Electrónico Clínico
              </label>
              <input
                className="w-full bg-transparent border-t-0 border-x-0 border-b-2 border-primary-fixed-dim focus:border-primary px-0 py-2 text-lg text-on-surface placeholder:text-outline-variant"
                type="email"
                name="email"
                placeholder="—"
                defaultValue={cfg?.email ?? ''}
                disabled={cfgError}
              />
            </div>

            <div className="relative">
              <label className="absolute -top-6 left-0 text-[10px] uppercase tracking-widest text-primary font-bold">
                Especialidad Principal
              </label>
              <input
                className="w-full bg-transparent border-t-0 border-x-0 border-b-2 border-primary-fixed-dim focus:border-primary px-0 py-2 text-lg text-on-surface placeholder:text-outline-variant"
                type="text"
                placeholder="—"
                disabled
              />
            </div>
          </div>

          <div className="mt-16 flex justify-end">
            <button
              className="bg-primary-container text-on-primary-container px-12 py-4 rounded-full uppercase tracking-widest text-sm font-bold shadow-sm hover:shadow-md transition-all disabled:opacity-50"
              type="submit"
              disabled={cfgError}
            >
              Guardar Cambios del Perfil
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
