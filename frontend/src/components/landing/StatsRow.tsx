'use client';

import AnimatedCounter from '@/components/landing/AnimatedCounter';

/**
 * Stats row with animated +50 patients counter.
 * Extracted as a Client Component so it can use AnimatedCounter
 * (which relies on useInView) inside Server Component pages.
 */
export default function StatsRow() {
  return (
    <div className="flex justify-center gap-10 md:gap-20">
      <div className="flex flex-col items-center">
        <span className="font-display text-4xl text-sage font-light">3+</span>
        <span className="font-mono text-label-sm uppercase text-ink-muted mt-1 text-center">
          Años de<br />Experiencia
        </span>
      </div>
      <div className="w-px h-12 bg-line" />
      <div className="flex flex-col items-center">
        <AnimatedCounter
          target={50}
          prefix="+"
          className="font-display text-4xl text-sage font-light"
        />
        <span className="font-mono text-label-sm uppercase text-ink-muted mt-1 text-center">
          Pacientes<br />Atendidos
        </span>
      </div>
      <div className="w-px h-12 bg-line" />
      <div className="flex flex-col items-center">
        <span className="font-display text-4xl text-sage font-light">&#8734;</span>
        <span className="font-mono text-label-sm uppercase text-ink-muted mt-1 text-center">
          Compromiso<br />Ético
        </span>
      </div>
    </div>
  );
}
