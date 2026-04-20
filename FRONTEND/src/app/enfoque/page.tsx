import type { Metadata } from 'next';
import Image from 'next/image';
import ScrollReveal from '@/components/landing/ScrollReveal';
import CTASection from '@/components/sections/CTASection';
import StatsRow from '@/components/landing/StatsRow';
import PremiumCard from '@/components/ui/PremiumCard';

export const metadata: Metadata = {
  title: 'Enfoque | Almudena Marchesi — Psicología Clínica',
  description:
    'Descubre mi metodología: escucha activa, ausencia de juicio y rigor clínico basado en evidencia. Psicología Clínica en Moncloa, Madrid.',
};

const METHODOLOGY_CARDS = [
  {
    icon: 'hearing',
    title: 'Escucha Activa',
    body: 'No es solo oír, es comprender el silencio entre las palabras. Mi enfoque se centra en una presencia plena donde cada síntoma y cada vivencia son validados como parte fundamental de tu historia única.',
  },
  {
    icon: 'verified_user',
    title: 'Ausencia de Juicio',
    body: 'La terapia es el único lugar donde no necesitas ser «adecuado». Aquí, la neutralidad clínica se traduce en una aceptación incondicional que permite explorar lo más profundo sin miedo a la crítica.',
  },
  {
    icon: 'neurology',
    title: 'Rigor Clínico',
    body: 'Especialización en Psicología Clínica para garantizar intervenciones basadas en la evidencia. El rigor es el respeto al paciente.',
  },
] as const;

export default function EnfoquePage() {
  return (
    <div className="bg-canvas overflow-x-hidden">
      {/* Hero */}
      <section className="pt-32 pb-20 md:pt-40 md:pb-28 px-6 md:px-12">
        <div className="max-w-screen-xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          <div className="lg:col-span-7">
            <ScrollReveal>
              <span className="font-mono text-label-sm uppercase tracking-[0.14em] text-sage-mid mb-5 block">
                Metodología
              </span>
            </ScrollReveal>
            <ScrollReveal delay={0.08}>
              <h1 className="font-display text-display-1 text-ink text-balance mb-8">
                La calidez de lo{' '}
                <span className="italic">humano</span> y el rigor de la{' '}
                <span className="italic">clínica</span>.
              </h1>
            </ScrollReveal>
            <ScrollReveal delay={0.16}>
              <p className="text-body-lg text-ink-soft max-w-2xl leading-relaxed text-pretty">
                Un espacio donde la excelencia profesional se encuentra con la
                sensibilidad empática, creando un entorno seguro para la
                transformación personal.
              </p>
            </ScrollReveal>
          </div>
          <div className="lg:col-span-5">
            <ScrollReveal delay={0.12} scale={0.96}>
              <div className="rounded-apple overflow-hidden shadow-apple-lg">
                <Image
                  alt="Detalle de manos en actitud de escucha y calidez humana"
                  className="w-full h-[400px] lg:h-[480px] object-cover"
                  height={480}
                  priority
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  src="/images/manos.avif"
                  width={600}
                />
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Methodology Bento */}
      <section className="py-20 md:py-32 px-6 md:px-12 bg-canvas-alt">
        <div className="max-w-screen-xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {METHODOLOGY_CARDS.map((card, i) => (
              <ScrollReveal
                key={card.title}
                delay={i * 0.08}
                className={i === 0 ? 'md:col-span-7' : i === 1 ? 'md:col-span-5' : 'md:col-span-12'}
              >
                <PremiumCard tilt={false} className="h-full">
                  <div className={`p-8 md:p-10 h-full flex flex-col gap-5 group hover:-translate-y-1 transition-all duration-600 ease-apple ${
                    i === 2 ? 'md:flex-row md:items-center md:gap-12' : ''
                  }`}>
                    <div className="w-12 h-12 rounded-full bg-sage-wash flex items-center justify-center shrink-0 group-hover:bg-sage transition-colors duration-400 ease-apple">
                      <span className="material-symbols-outlined text-2xl text-sage group-hover:text-white transition-colors duration-400">
                        {card.icon}
                      </span>
                    </div>
                    <div>
                      <h2 className="font-display text-display-3 text-ink mb-3">
                        {card.title}
                      </h2>
                      <p className="text-ink-soft leading-relaxed font-body text-[0.95rem]">
                        {card.body}
                      </p>
                    </div>
                  </div>
                </PremiumCard>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Narrative + Stats */}
      <section className="py-24 md:py-36 px-6 md:px-12">
        <div className="max-w-3xl mx-auto text-center">
          <ScrollReveal>
            <h2 className="font-display text-display-2 text-ink mb-10 italic text-balance">
              Un puente entre la ciencia y la sensibilidad
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <div className="space-y-6 text-body-lg text-ink-soft leading-relaxed text-left md:text-justify">
              <p>
                Mi metodología no se limita a la aplicación de técnicas; es un
                proceso artesanal de acompañamiento. Entiendo la clínica no como
                un frío diagnóstico, sino como la herramienta que nos permite
                dar estructura y solución al sufrimiento humano.
              </p>
              <p>
                Ubicada en el corazón de Moncloa, mi consulta está diseñada para
                ser ese refugio urbano donde el ruido exterior cesa, permitiendo
                que emerja tu propia voz. Un enfoque integrador donde el rigor
                académico de la Psicología Clínica se pone al servicio de tu
                bienestar emocional.
              </p>
            </div>
          </ScrollReveal>

          {/* Stats Row with +50 patients counter */}
          <ScrollReveal delay={0.15} className="mt-14">
            <StatsRow />
          </ScrollReveal>
        </div>
      </section>

      <CTASection />
    </div>
  );
}
