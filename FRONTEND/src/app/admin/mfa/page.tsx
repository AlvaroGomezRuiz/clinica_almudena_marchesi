import { verifyAdminMfaAction } from '@/services/auth/actions';
import { cookies } from 'next/headers';

import AdminMfaQr from '@/components/admin/AdminMfaQr';

type AdminMfaPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function AdminMfaPage({ searchParams }: AdminMfaPageProps) {
  const errorRaw = searchParams?.error;
  const error = typeof errorRaw === 'string' ? errorRaw : undefined;

  const provisioningUri = cookies().get('admin_provisioning_uri')?.value;

  return (
    <section className="max-w-xl mx-auto">
      <div className="bg-white rounded-2xl border border-stone-100 p-8 editorial-shadow">
        <header className="mb-6">
          <h1 className="font-serif text-2xl text-emerald-900 leading-tight">
            Verificación TOTP
          </h1>
          <p className="text-sm text-stone-500 mt-2">
            Introduce el código de Google Authenticator para acceder al panel.
          </p>
        </header>

        {error ? (
          <div className="mb-6 bg-error-container text-on-error-container border border-error/20 rounded-xl p-4 text-sm">
            {error}
          </div>
        ) : null}

        {provisioningUri ? (
          <div className="mb-6 rounded-xl border border-stone-200/70 bg-surface-container-lowest p-5">
            <p className="text-sm text-stone-700 font-medium">
              Escanea este código con Google Authenticator en tu móvil.
            </p>
            <div className="mt-4 flex justify-center">
              <AdminMfaQr provisioningUri={provisioningUri} />
            </div>
          </div>
        ) : null}

        <form action={verifyAdminMfaAction} className="space-y-6">
          <div className="space-y-2">
            <label className="font-sans text-[10px] uppercase tracking-widest text-stone-500 block font-semibold">
              Código (6 dígitos)
            </label>
            <input
              className="w-full bg-white border border-stone-200/70 rounded-lg px-4 py-3 transition-all font-sans text-stone-900 placeholder:text-stone-400"
              placeholder="123456"
              type="text"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              required
            />
          </div>

          <div className="pt-4 border-t border-stone-100 flex justify-end">
            <button
              className="bg-emerald-900 text-white px-8 py-4 rounded-xl text-xs uppercase tracking-[0.2em] font-bold editorial-shadow hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-3"
              type="submit"
            >
              <span
                className="material-symbols-outlined text-xl"
                data-icon="verified_user"
              >
                verified_user
              </span>
              Verificar
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
