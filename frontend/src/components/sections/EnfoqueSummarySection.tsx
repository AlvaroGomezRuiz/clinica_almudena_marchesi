'use client';

import React from 'react';
import ExpandableCard from '@/components/ui/ExpandableCard';
import ScrollReveal from '@/components/landing/ScrollReveal';

const ENFOQUE_CARDS = [
  {
    id: 'escucha-activa',
    title: 'Escucha Activa',
    description: 'No es solo oír, es comprender el silencio entre las palabras. Mi enfoque se centra en una presencia plena donde cada síntoma y cada vivencia son validados como parte fundamental de tu historia única.',
    tags: ['Presencia', 'Validación', 'Silencio', 'Empatía']
  },
  {
    id: 'sin-juicio',
    title: 'Ausencia de Juicio',
    description: 'La terapia es el único lugar donde no necesitas ser «adecuado». Aquí, la neutralidad clínica se traduce en una aceptación incondicional que permite explorar lo más profundo sin miedo a la crítica.',
    tags: ['Aceptación', 'Seguridad', 'Neutralidad']
  },
  {
    id: 'rigor-clinico',
    title: 'Rigor Clínico',
    description: 'Especialización en Psicología Clínica para garantizar intervenciones basadas en la evidencia. El rigor es el respeto al paciente.',
    tags: ['Evidencia', 'Especialización', 'Respeto']
  }
];

export default function EnfoqueSummarySection() {
  return (
    <section className="w-full bg-transparent overflow-hidden flex flex-col justify-center px-6 md:px-12 py-16 md:py-24 z-10">

      <div className="max-w-7xl mx-auto w-full relative z-10">
        <div className="mb-12 md:mb-16 text-center max-w-4xl mx-auto">
          <ScrollReveal delay={0}>
            <span className="font-mono text-label-sm uppercase tracking-[0.14em] text-sage-mid dark:text-white/70 mb-4 block">
              Filosofía del acompañamiento
            </span>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <h2 className="font-display text-3xl md:text-5xl text-ink dark:text-white leading-tight text-balance italic">
              Entiendo la terapia como un proceso compartido. Mi papel no es darte respuestas desde fuera, sino acompañarte, ayudándote a entender lo que te ocurre y ofreciéndote herramientas para afrontarlo.
            </h2>
          </ScrollReveal>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {ENFOQUE_CARDS.map((card, idx) => (
            <ScrollReveal key={card.id} delay={0.2 + (idx * 0.1)} className="h-64">
              <div className="h-full w-full">
                <ExpandableCard {...card} />
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
