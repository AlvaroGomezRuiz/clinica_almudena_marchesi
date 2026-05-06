'use client';

import AnimatedCounter from '@/components/landing/AnimatedCounter';

interface StatsRowProps {
  /** 'default' para fondos canvas, 'light' para fondos oscuros (vídeo) */
  variant?: 'default' | 'light';
  /** Auto-start counters without waiting for IntersectionObserver (for sticky/hero sections) */
  autoStart?: boolean;
}

/**
 * Stats row with animated +50 patients counter.
 * Extracted as a Client Component so it can use AnimatedCounter
 * (which relies on useInView) inside Server Component pages.
 */
export default function StatsRow({ variant = 'default', autoStart = false }: StatsRowProps) {
  const isLight = variant === 'light';

  const numberClass = isLight
    ? 'font-display text-3xl md:text-4xl text-white/95 font-light drop-shadow-md'
    : 'font-display text-3xl md:text-4xl text-sage font-light';

  const labelClass = isLight
    ? 'font-mono text-[0.65rem] md:text-label-sm uppercase text-white/70 mt-1 text-center drop-shadow-sm'
    : 'font-mono text-[0.65rem] md:text-label-sm uppercase text-ink-muted mt-1 text-center';

  const dividerClass = isLight
    ? 'hidden h-12 w-px bg-white/20 sm:block'
    : 'hidden h-12 w-px bg-line sm:block';

  return (
    <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 px-4">
      {/* Años de Experiencia */}
      <div className="flex flex-col items-center justify-center w-32 h-32 md:w-40 md:h-40 rounded-full border border-white/20 bg-transparent backdrop-blur-sm animate-float">
        <AnimatedCounter target={3} prefix="+" className={numberClass} duration={1500} autoStart={autoStart} />
        <span className={labelClass}>
          Años de<br />Experiencia
        </span>
      </div>

      {/* Pacientes Atendidos */}
      <div className="flex flex-col items-center justify-center w-32 h-32 md:w-40 md:h-40 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm animate-float [animation-delay:0.2s]">
        <AnimatedCounter
          target={50}
          prefix="+"
          className={numberClass}
          autoStart={autoStart}
        />
        <span className={labelClass}>
          Pacientes<br />Atendidos
        </span>
      </div>

      {/* Compromiso Ético */}
      <div className="flex flex-col items-center justify-center w-32 h-32 md:w-40 md:h-40 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm animate-float [animation-delay:0.4s]">
        <span className={numberClass}>&#8734;</span>
        <span className={labelClass}>
          Compromiso<br />Ético
        </span>
      </div>
    </div>
  );
}
