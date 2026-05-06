import type { Metadata } from 'next';
import Image from 'next/image';

import PublicFaqSection from '@/components/seo/PublicFaqSection';
import ScrollReveal from '@/components/landing/ScrollReveal';
import Photo3D from '@/components/landing/Photo3D';
import CTASection from '@/components/sections/CTASection';
import PremiumCard from '@/components/ui/PremiumCard';
import ExpandableCard from '@/components/ui/ExpandableCard';
import { CLINIC_PUBLIC_SITE_HOST_LABEL, CLINIC_PUBLIC_SITE_URL } from '@/lib/clinic';
import { sobreMiPageFaq } from '@/lib/seo/clinic-faq-content';
import { buildFaqPageJsonLd } from '@/lib/seo/faq-jsonld';
import { buildMarketingPageJsonLd } from '@/lib/seo/marketing-page-json-ld';
import { buildPublicPageMetadata } from '@/lib/seo/build-public-page-metadata';

const sobreMiSeoLd = buildMarketingPageJsonLd({
  path: '/sobre-mi',
  name: `Sobre mí — Psicóloga sanitaria en Madrid | ${CLINIC_PUBLIC_SITE_HOST_LABEL}`,
  description:
    'Formación en Psicología Clínica y PGS. Acompañamiento terapéutico desde la consulta en Meléndez Valdés (Moncloa). Trayectoria y valores profesionales.',
  breadcrumb: [
    { name: 'Inicio', path: '/' },
    { name: 'Sobre mí', path: '/sobre-mi' },
  ],
});

const sobreMiFaqPageUrl: string = new URL('/sobre-mi', CLINIC_PUBLIC_SITE_URL).href;
const sobreMiFaqLd = buildFaqPageJsonLd(sobreMiPageFaq, sobreMiFaqPageUrl);

export const metadata: Metadata = buildPublicPageMetadata({
  path: '/sobre-mi',
  title: `Sobre mí — Psicóloga sanitaria en Madrid | ${CLINIC_PUBLIC_SITE_HOST_LABEL}`,
  description:
    'Formación en Psicología Clínica y PGS. Acompañamiento terapéutico desde la consulta en Meléndez Valdés (Moncloa). Trayectoria y valores profesionales.',
  keywords: [
    'psicóloga colegiada Madrid',
    'Almudena Marchesi psicóloga',
    'consulta psicología Moncloa',
    'psicóloga sanitaria Madrid',
    'Meléndez Valdés psicóloga',
    'M-38427 psicóloga',
  ],
});

const CREDENTIALS = [
  {
    title: 'Formación Académica',
    body: 'Formación especializada en psicología clínica, psicoterapia y sistemas familiares. Actualización continua en los enfoques terapéuticos más rigurosos.',
    items: [
      'Licenciada en Psicología. Universidad Francisco de Vitoria',
      'Máster en Psicología General Sanitaria. Universidad Francisco de Vitoria',
      'Experta en Terapia Sistémica: familiar y de pareja. Universidad Francisco de Vitoria',
      'Experta en Psicoterapia Integradora: Trauma, Apego y EMDR. Instituto Español de Psicoterapia Integradora',
      'Formación en Terapia Basada en la Mentalización',
    ],
    accentColor: 'sage',
  },
  {
    title: 'Recorrido Clínico',
    body: 'Desde 2023 acompañando a adultos y adolescentes en su proceso terapéutico, con una dedicación plena a cada caso desde la consulta de Moncloa.',
    items: [
      'Práctica privada en Moncloa',
      'Colaboración en centros de salud mental',
      'Colaboración en recursos sociales de atención a la salud mental',
    ],
    accentColor: 'warm',
  },
  {
    title: 'Metodología',
    body: 'Enfoque integrador y sistémico: una terapia adaptada a ti, que tiene en cuenta tanto tu mundo interno como tus relaciones y tu contexto.',
    items: [
      'Terapia Sistémica y familiar',
      'Psicoterapia Integradora: Trauma y Apego',
      'EMDR y Mentalización',
    ],
    accentColor: 'sage-mid',
  },
] as const;

export default function SobreMiPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(sobreMiSeoLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(sobreMiFaqLd) }}
      />
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
                Un espacio para acompañarte{' '}
                <span className="italic text-sage">en tu proceso</span>.
              </h1>
            </ScrollReveal>
            <ScrollReveal delay={0.1}>
              <p className="text-body-lg text-ink-soft leading-relaxed text-pretty max-w-lg">
                Acompaño a personas en sus procesos de cambio y crecimiento
                personal. Soy psicóloga y en mi consulta de Moncloa
                encontrarás un espacio seguro, tranquilo y confidencial, donde
                poder parar, escucharte y trabajar en tu bienestar.
              </p>
            </ScrollReveal>
          </div>
          <div className="lg:col-span-7 flex justify-center">
            <ScrollReveal delay={0.1} scale={0.96}>
              <Photo3D
                src="/images/almudena-profile.avif"
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
                  <Image
                    alt="dos personas abrazandose desde una perspectiva cenital"
                    className="w-full aspect-[3/4] object-cover"
                    src="/images/abrazo.avif"
                    width={600}
                    height={800}
                    loading="lazy"
                  />
                </div>
              </div>
              <div>
                <div className="rounded-apple overflow-hidden shadow-apple-md">
                  <Image
                    alt="Cuaderno de notas clínicas sobre una mesa de madera con luz natural"
                    className="w-full aspect-[3/4] object-cover"
                    src="/images/notas.avif"
                    width={600}
                    height={800}
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
                  Entiendo la terapia como un proceso compartido. Mi papel no
                  es darte respuestas desde fuera, sino{' '}
                  <strong className="text-ink font-medium">acompañarte</strong>,
                  ayudándote a entender lo que te ocurre y ofreciéndote
                  herramientas para afrontarlo.
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
                <p className="font-display text-xl text-sage dark:text-sage-light italic transition-colors">
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

          {/* Tres columnas en escritorio (misma idea que bloques en la home); interior sigue estilo enfoque */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 h-auto items-stretch">
            {CREDENTIALS.map((cred, i) => (
              <ScrollReveal key={cred.title} delay={i * 0.08} className="h-full">
                <ExpandableCard
                  id={`cred-${i}`}
                  title={cred.title}
                  previewText={cred.body}
                  description={
                    <div className="text-left w-full">
                      <p className="mb-6 leading-relaxed">{cred.body}</p>
                      <ul className="space-y-4">
                        {cred.items.map((item) => (
                          <li key={item} className="flex items-start gap-3 text-ink-soft">
                            <span 
                              className={`mt-1.5 w-1.5 h-1.5 shrink-0 rounded-full ${
                                cred.accentColor === 'warm'
                                  ? 'bg-warm'
                                  : cred.accentColor === 'sage-mid'
                                    ? 'bg-sage-mid'
                                    : 'bg-sage'
                              }`}
                            />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  }
                  className="h-full"
                />
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <PublicFaqSection
        id="faq-sobre-mi"
        className="bg-canvas"
        heading="Preguntas frecuentes sobre la profesional y la clínica"
        items={sobreMiPageFaq}
      />

      <CTASection />
    </div>
    </>
  );
}

