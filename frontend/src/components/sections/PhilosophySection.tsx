import ScrollReveal from '@/components/landing/ScrollReveal';
import AnimatedCounter from '@/components/landing/AnimatedCounter';
import PremiumCard from '@/components/ui/PremiumCard';

/* Server Component. Los islands cliente son ScrollReveal, AnimatedCounter y PremiumCard. */

const PILLARS = [
  {
    title: 'Escucha Activa',
    body: 'Más allá de las palabras. Un silencio fértil donde cada matiz de tu historia encuentra su lugar y significado.',
  },
  {
    title: 'Sin Juicio',
    body: 'Un espacio de seguridad emocional. Tu vulnerabilidad es respetada como la herramienta más potente de cambio.',
  },
  {
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
              className="h-full"
            >
              <PremiumCard>
                <div className="flex h-full w-full flex-col gap-5 p-8 text-center md:p-10">
                  <h3 className="font-display text-display-3 text-ink text-balance">
                    {pillar.title}
                  </h3>
                  <p className="text-left font-body text-[0.95rem] leading-relaxed text-ink-soft">
                    {pillar.body}
                  </p>
                </div>
              </PremiumCard>
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
