'use client';

import ScrollReveal from '@/components/public/ScrollReveal';
import AnimatedCounter from '@/components/public/AnimatedCounter';

const PILLARS = [
  {
    icon: 'psychology',
    title: 'Escucha Activa',
    body: 'Más allá de las palabras. Un silencio fértil donde cada matiz de tu historia encuentra su lugar y significado.',
  },
  {
    icon: 'volunteer_activism',
    title: 'Sin Juicio',
    body: 'Un espacio de seguridad emocional. Tu vulnerabilidad es respetada como la herramienta más potente de cambio.',
  },
  {
    icon: 'auto_awesome',
    title: 'Ayuda Real',
    body: 'Estrategias clínicas basadas en evidencia. No solo entender el porqué, sino construir el cómo hacia tu bienestar.',
  },
] as const;

export default function PhilosophySection() {
  return (
    <section
      className="py-28 md:py-40 px-6 md:px-12 bg-canvas-alt relative overflow-hidden"
      aria-label="Mi enfoque terapéutico — pilares de trabajo"
    >
      {/* Section line */}
      <div className="section-line max-w-screen-xl mx-auto mb-20" />

      <div className="max-w-screen-xl mx-auto">
        {/* Header */}
        <ScrollReveal className="mb-20">
          <div className="max-w-3xl">
            <span className="font-mono text-label-sm uppercase tracking-[0.14em] text-sage-mid mb-4 block">
              Mi enfoque
            </span>
            <h2 className="font-display text-display-2 text-ink text-balance">
              El rigor de la clínica,
              <br />
              <span className="italic text-sage">la calidez de lo humano.</span>
            </h2>
          </div>
        </ScrollReveal>

        {/* Editorial Quote */}
        <ScrollReveal className="mb-20" offset={30}>
          <blockquote className="max-w-2xl border-l-2 border-sage-light pl-8 py-2">
            <p className="font-display text-[clamp(1.3rem,2.5vw,1.8rem)] text-ink-soft italic leading-relaxed">
              &ldquo;Mi metodología no se limita a la aplicación de técnicas; es un
              proceso artesanal de acompañamiento donde el rigor académico se
              pone al servicio de tu bienestar emocional.&rdquo;
            </p>
          </blockquote>
        </ScrollReveal>

        {/* Pillar Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {PILLARS.map((pillar, i) => (
            <ScrollReveal
              key={pillar.title}
              delay={i * 0.1}
              offset={35}
              scale={0.97}
            >
              <article className="glass-card dark:glass-card-dark p-8 md:p-10 flex flex-col gap-6 h-full group hover:shadow-card-hover transition-all duration-600 ease-apple">
                <div className="w-12 h-12 rounded-full bg-sage-wash flex items-center justify-center group-hover:bg-sage group-hover:text-white transition-colors duration-400 ease-apple">
                <span className="material-symbols-outlined text-2xl text-sage group-hover:text-white transition-colors duration-400" aria-hidden="true">
                    {pillar.icon}
                  </span>
                </div>
                <h3 className="font-display text-display-3 text-ink">
                  {pillar.title}
                </h3>
                <p className="text-ink-soft leading-relaxed font-body text-[0.95rem]">
                  {pillar.body}
                </p>
              </article>
            </ScrollReveal>
          ))}
        </div>

        {/* Stats — 3 columns: Experiencia, Pacientes counter, Compromiso */}
        <ScrollReveal className="mt-20" offset={25}>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-10 sm:gap-14 md:gap-24">
            {/* Years of experience (since Feb 2023) */}
            <div className="flex flex-col items-center">
              <span className="font-display text-4xl text-sage font-light">
                <AnimatedCounter target={3} duration={1500} prefix="+" className="" />
              </span>
              <span className="font-mono text-label-sm uppercase text-ink-muted mt-1">
                Años de Experiencia
              </span>
            </div>

            <div className="hidden sm:block w-px h-12 bg-line" />

            {/* Patients counter — animated */}
            <div className="flex flex-col items-center">
              <span className="font-display text-4xl text-sage font-light">
                <AnimatedCounter target={50} duration={2200} prefix="+" className="" />
              </span>
              <span className="font-mono text-label-sm uppercase text-ink-muted mt-1">
                Pacientes Atendidos
              </span>
            </div>

            <div className="hidden sm:block w-px h-12 bg-line" />

            {/* Compromiso */}
            <div className="flex flex-col items-center">
              <span className="font-display text-4xl text-sage font-light">&#8734;</span>
              <span className="font-mono text-label-sm uppercase text-ink-muted mt-1">
                Compromiso Ético
              </span>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
