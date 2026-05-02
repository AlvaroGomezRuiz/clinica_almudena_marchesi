'use client';

import { useNuevaCitaAdmin } from '@/components/admin/NuevaCitaAdminContext';

export default function AgendarCitaBoton(): JSX.Element {
  const { open } = useNuevaCitaAdmin();

  return (
    <button
      type="button"
      onClick={() => open()}
      className="inline-flex w-full items-center gap-2 rounded-xl bg-white/50 px-3 py-2 font-body text-[0.82rem] text-ink transition hover:bg-white/70 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
    >
      <span className="material-symbols-outlined text-[1rem]" aria-hidden="true">
        event
      </span>
      Agendar cita
    </button>
  );
}
