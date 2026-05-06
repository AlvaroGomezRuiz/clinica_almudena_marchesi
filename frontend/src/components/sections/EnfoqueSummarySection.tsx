'use client';

import React from 'react';
import TextAnimation from '@/components/ui/scroll-text';
import ExpandableCard from '@/components/ui/ExpandableCard';

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
    <section className="h-[100dvh] w-full bg-transparent sticky top-0 rounded-t-3xl overflow-hidden flex flex-col justify-center px-6 md:px-12 shadow-[0_-20px_40px_rgba(0,0,0,0.05)] z-10">
      {/* Background decoration */}
      <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f0a_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f0a_1px,transparent_1px)] bg-[size:54px_54px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="max-w-7xl mx-auto w-full relative z-10">
        <div className="mb-12 md:mb-16 text-center max-w-4xl mx-auto">
          <span className="font-mono text-label-sm uppercase tracking-[0.14em] text-sage-mid mb-4 block">
            Filosofía del acompañamiento
          </span>
          <TextAnimation
            as="h2"
            text="Entiendo la terapia como un proceso compartido. Mi papel no es darte respuestas desde fuera, sino acompañarte, ayudándote a entender lo que te ocurre y ofreciéndote herramientas para afrontarlo."
            classname="font-display text-3xl md:text-5xl text-ink leading-tight text-balance italic"
            variants={{
              hidden: { filter: 'blur(8px)', opacity: 0, y: 20 },
              visible: { filter: 'blur(0px)', opacity: 1, y: 0, transition: { duration: 0.5 } }
            }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {ENFOQUE_CARDS.map((card) => (
            <div key={card.id} className="h-64">
              <ExpandableCard {...card} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
