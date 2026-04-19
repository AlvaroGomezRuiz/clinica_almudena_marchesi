import type { Metadata } from 'next';
import Link from 'next/link';
import ScrollReveal from '@/components/public/ScrollReveal';
import Photo3D from '@/components/public/Photo3D';
import CTASection from '@/app/sections/CTASection';

export const metadata: Metadata = {
  title: 'Sobre Mí | Almudena Marchesi — Psicología Clínica',
  description:
    'Licenciada en Psicología Clínica con experiencia desde 2023. Conoce mi filosofía de acompañamiento terapéutico en Moncloa, Madrid.',
};

const CREDENTIALS = [
  {
    icon: 'school',
    title: 'Formación Académica',
    body: 'Licenciada en Psicología Clínica con especialización en enfoques integradores. Formación continua en las últimas corrientes terapéuticas.',
    items: ['Universidad Complutense de Madrid', 'Máster en Psicología General Sanitaria'],
    accentColor: 'sage',
  },
  {
    icon: 'medical_services',
    title: 'Recorrido Clínico',
    body: 'Desde 2023 acompañando a adultos y adolescentes en su proceso terapéutico, con una dedicación plena a cada caso desde la consulta de Moncloa.',
    items: ['Práctica privada en Moncloa', 'Colaboración en centros de salud mental'],
    accentColor: 'warm',
  },
  {
    icon: 'psychology',
    title: 'Metodología',
    body: 'Enfoque humanista integrador, combinando técnicas cognitivo-conductuales con terapias de tercera generación según las necesidades.',
    items: ['Terapia de Aceptación y Compromiso', 'Mindfulness aplicado a la clínica'],
    accentColor: 'sage-mid',
  },
] as const;

export default function SobreMiPage() {
  return (
    <div className="bg-canvas overflow-x-hidden">
      {/* Hero */}
      <section className="pt-32 pb-20 md:pt-40 md:pb-32 px-6 md:px-12">
        <div className="max-w-screen-xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
          <div className="lg:col-span-5 space-y-6">
            <ScrollReveal>
              <span className="font-mono text-label-sm uppercase tracking-[0.14em] text-sage-mid mb-2 block">
                Psicología Clínica
              </span>
            </ScrollReveal>
            <ScrollReveal delay={0.08}>
              <h1 className="font-display text-display-1 text-ink text-balance">
                Tu acompañante en el{' '}
                <span className="italic text-sage">camino</span> del cambio.
              </h1>
            </ScrollReveal>
            <ScrollReveal delay={0.16}>
              <p className="text-body-lg text-ink-soft leading-relaxed text-pretty max-w-lg">
                Licenciada en Psicología con una profunda vocación por el
                bienestar humano. Mi consulta en el corazón de Moncloa es un
                espacio seguro diseñado para la introspección y el crecimiento
                personal.
              </p>
            </ScrollReveal>
          </div>
          <div className="lg:col-span-7 flex justify-center">
            <ScrollReveal delay={0.1} scale={0.96}>
              <Photo3D
                src="/images/almudena.jpg"
                alt="Almudena Marchesi, psicóloga clínica, en su consulta de Moncloa, Madrid"
                width={580}
                height={750}
                priority
                maxRotation={10}
                className="max-w-[360px] md:max-w-[460px] lg:max-w-[520px]"
              />
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Philosophy */}
      <section className="py-24 md:py-36 px-6 md:px-12 bg-canvas-alt">
        <div className="max-w-screen-xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          <ScrollReveal className="order-2 lg:order-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="pt-10">
                <div className="rounded-apple overflow-hidden shadow-apple-md">
                  <img
                    alt="dos personas abrazandose desde una perspectiva cenital"
                    className="w-full aspect-[3/4] object-cover"
                    src="/images/abrazo.avif"
                    loading="lazy"
                  />
                </div>
              </div>
              <div>
                <div className="rounded-apple overflow-hidden shadow-apple-md">
                  <img
                    alt="Cuaderno de notas clínicas sobre una mesa de madera con luz natural"
                    className="w-full aspect-[3/4] object-cover"
                    src="/images/notas.avif"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </ScrollReveal>

          <div className="order-1 lg:order-2 space-y-8">
            <ScrollReveal>
              <h2 className="font-display text-display-2 text-ink text-balance">
                La Filosofía del Acompañamiento
              </h2>
            </ScrollReveal>
            <ScrollReveal delay={0.1}>
              <div className="space-y-6 text-ink-soft text-body-lg leading-relaxed">
                <p>
                  Entiendo la terapia no como un proceso directivo, sino como
                  una travesía compartida. Mi papel no es el de una experta
                  distante que da soluciones, sino el de una{' '}
                  <strong className="text-ink font-medium">compañera de viaje</strong> que aporta herramientas y
                  luz en los momentos de incertidumbre.
                </p>
                <p>
                  En mi consulta en Moncloa, Madrid, priorizo la autenticidad y
                  la calidez. Creo firmemente que el vínculo terapéutico es la
                  herramienta más poderosa para la sanación. Cada persona es un
                  universo único, y mi enfoque se adapta a la singularidad de tu
                  historia.
                </p>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.15}>
              <blockquote className="border-l-2 border-sage-light pl-6 py-2">
                <p className="font-display text-xl text-sage italic">
                  &ldquo;El encuentro de dos personas es como el contacto de dos
                  sustancias químicas: si hay alguna reacción, ambas se
                  transforman.&rdquo;
                </p>
              </blockquote>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Credentials */}
      <section className="py-24 md:py-36 px-6 md:px-12">
        <div className="max-w-screen-xl mx-auto">
          <ScrollReveal className="text-center mb-16">
            <h2 className="font-display text-display-2 text-ink mb-4">
              Formación y Experiencia
            </h2>
            <div className="w-16 h-[2px] bg-sage/20 mx-auto" />
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {CREDENTIALS.map((cred, i) => (
              <ScrollReveal key={cred.title} delay={i * 0.08}>
                <article className="glass-card p-8 md:p-10 h-full flex flex-col group hover:shadow-card-hover hover:-translate-y-1 transition-all duration-600 ease-apple">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-8 transition-colors duration-400 ease-apple ${
                    cred.accentColor === 'sage'
                      ? 'bg-sage-wash group-hover:bg-sage'
                      : cred.accentColor === 'warm'
                      ? 'bg-warm-light group-hover:bg-warm'
                      : 'bg-sage-wash group-hover:bg-sage-mid'
                  }`}>
                    <span className="material-symbols-outlined text-2xl text-sage group-hover:text-white transition-colors duration-400">
                      {cred.icon}
                    </span>
                  </div>
                  <h3 className="font-display text-display-3 text-ink mb-4">{cred.title}</h3>
                  <p className="text-ink-soft leading-relaxed font-body text-[0.92rem] mb-6">
                    {cred.body}
                  </p>
                  <ul className="space-y-3 mt-auto">
                    {cred.items.map((item) => (
                      <li key={item} className="flex items-center gap-3 text-sm text-ink-soft font-body">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          cred.accentColor === 'warm' ? 'bg-warm' : 'bg-sage'
                        }`} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </article>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <CTASection />
    </div>
  );
}
