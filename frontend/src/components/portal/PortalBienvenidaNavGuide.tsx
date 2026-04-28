import type { JSX } from 'react';

import { PORTAL_NAV_SECTIONS } from '@/lib/portal/onboarding-copy';

/**
 * Tarjetas explicativas del menú lateral del portal (solo pantalla de bienvenida).
 */
export default function PortalBienvenidaNavGuide(): JSX.Element {
  return (
    <section aria-labelledby="portal-nav-guide-heading" className="flex flex-col gap-4">
      <div>
        <h2
          id="portal-nav-guide-heading"
          className="font-display text-[1rem] font-semibold tracking-tight text-ink dark:text-white"
        >
          Qué encontrarás en cada parte del portal
        </h2>
        <p className="mt-1 font-body text-[0.82rem] leading-relaxed text-ink-soft dark:text-white/65">
          El menú lateral agrupa las mismas secciones que usarás después del primer paso.
        </p>
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {PORTAL_NAV_SECTIONS.map((s) => (
          <li
            key={s.title}
            className="rounded-2xl border border-ink/8 bg-white/45 p-4 ring-1 ring-inset ring-white/35 dark:border-white/10 dark:bg-white/[0.04] dark:ring-white/5"
          >
            <p className="font-display text-[0.85rem] font-semibold text-primary dark:text-primary-fixed-dim">
              {s.title}
            </p>
            <p className="mt-2 font-body text-[0.78rem] leading-relaxed text-ink-soft dark:text-white/65">
              {s.description}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
