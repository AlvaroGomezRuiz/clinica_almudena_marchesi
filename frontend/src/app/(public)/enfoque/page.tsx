import type { Metadata } from 'next';
import Image from 'next/image';

import PublicFaqSection from '@/components/seo/PublicFaqSection';
import ScrollReveal from '@/components/landing/ScrollReveal';
import TextAnimation from '@/components/ui/scroll-text';
import CTASection from '@/components/sections/CTASection';
import StatsRow from '@/components/landing/StatsRow';
import PremiumCard from '@/components/ui/PremiumCard';
import { CLINIC_PUBLIC_SITE_HOST_LABEL, CLINIC_PUBLIC_SITE_URL } from '@/lib/clinic';
import { enfoquePageFaq } from '@/lib/seo/clinic-faq-content';
import { buildFaqPageJsonLd } from '@/lib/seo/faq-jsonld';
import { buildMarketingPageJsonLd } from '@/lib/seo/marketing-page-json-ld';
import { buildPublicPageMetadata } from '@/lib/seo/build-public-page-metadata';

const enfoqueSeoLd = buildMarketingPageJsonLd({
  path: '/enfoque',
  name: `Enfoque terapéutico — Psicología clínica Madrid | ${CLINIC_PUBLIC_SITE_HOST_LABEL}`,
  description:
    'Metodología basada en escucha activa, marco no juzgante y rigor clínico. Psicología en Moncloa-Chamberí, Madrid.',
  breadcrumb: [
    { name: 'Inicio', path: '/' },
    { name: 'Enfoque', path: '/enfoque' },
  ],
});

const enfoqueFaqPageUrl: string = new URL('/enfoque', CLINIC_PUBLIC_SITE_URL).href;
const enfoqueFaqLd = buildFaqPageJsonLd(enfoquePageFaq, enfoqueFaqPageUrl);

export const metadata: Metadata = buildPublicPageMetadata({
  path: '/enfoque',
  title: `Enfoque terapéutico — Psicología clínica Madrid | ${CLINIC_PUBLIC_SITE_HOST_LABEL}`,
  description:
    'Metodología basada en escucha activa, marco no juzgante y rigor clínico. Psicología en Moncloa-Chamberí, Madrid.',
  keywords: [
    'enfoque psicoterapéutico',
    'psicología basada en evidencia',
    'terapia Moncloa',
    'psicóloga Chamberí',
    'marco no juzgante terapia',
    'psicología clínica Madrid centro',
  ],
});

const METHODOLOGY_CARDS = [
  {
    title: 'Escucha Activa',
    body: 'No es solo oír, es comprender el silencio entre las palabras. Mi enfoque se centra en una presencia plena donde cada síntoma y cada vivencia son validados como parte fundamental de tu historia única.',
  },
  {
    title: 'Ausencia de Juicio',
    body: 'La terapia es el único lugar donde no necesitas ser «adecuado». Aquí, la neutralidad clínica se traduce en una aceptación incondicional que permite explorar lo más profundo sin miedo a la crítica.',
  },
  {
    title: 'Rigor Clínico',
    body: 'Especialización en Psicología Clínica para garantizar intervenciones basadas en la evidencia. El rigor es el respeto al paciente.',
  },
] as const;

export default function EnfoquePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(enfoqueSeoLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(enfoqueFaqLd) }}
      />
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
              <TextAnimation
                as="h1"
                text="Enfoque integrador y sistémico: una terapia adaptada a ti."
                classname="font-display text-display-1 text-ink text-balance mb-8"
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { ease: 'linear' },
                  },
                }}
              />
            </ScrollReveal>
            <ScrollReveal delay={0.16}>
              <TextAnimation
                as="p"
                text="Una terapia que tiene en cuenta tanto tu mundo interno como tus relaciones y tu contexto. Entiendo la terapia como un proceso compartido donde el rigor académico se pone al servicio de tu bienestar emocional."
                classname="text-body-lg text-ink-soft max-w-2xl leading-relaxed text-pretty"
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.2 },
                  },
                }}
              />
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

      {/* Methodology Bento — Sin iconos, solo texto centrado */}
      <section className="py-20 md:py-32 px-6 md:px-12 bg-canvas-alt">
        <div className="max-w-screen-xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {METHODOLOGY_CARDS.map((card, i) => (
              <ScrollReveal
                key={card.title}
                delay={i * 0.08}
                className={
                  i === 0 ? 'md:col-span-7' : i === 1 ? 'md:col-span-5' : 'md:col-span-12'
                }
              >
                <PremiumCard tilt={false} className="h-full">
                  <div className="flex h-full flex-col gap-5 p-8 text-center transition-all duration-600 ease-apple group hover:-translate-y-1 md:p-10 items-center justify-center">
                    <TextAnimation
                      as="h2"
                      text={card.title}
                      classname="font-display text-display-3 text-balance text-ink"
                      variants={{
                        hidden: { opacity: 0, y: 20 },
                        visible: {
                          opacity: 1,
                          y: 0,
                          transition: { ease: 'linear' },
                        },
                      }}
                    />
                    <TextAnimation
                      as="p"
                      text={card.body}
                      classname="font-body text-[0.95rem] leading-relaxed text-ink-soft max-w-lg"
                      variants={{
                        hidden: { opacity: 0, y: 20 },
                        visible: {
                          opacity: 1,
                          y: 0,
                          transition: { duration: 0.2 },
                        },
                      }}
                    />
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
            <TextAnimation
              as="h2"
              text="Un puente entre la ciencia y la sensibilidad"
              classname="font-display text-display-2 text-ink mb-10 italic text-balance"
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { ease: 'linear' },
                },
              }}
            />
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <div className="space-y-6 text-body-lg text-ink-soft leading-relaxed text-left md:text-justify">
              <TextAnimation
                as="p"
                text="Entiendo la terapia como un proceso compartido. Mi papel no es darte respuestas desde fuera, sino acompañarte, ayudándote a entender lo que te ocurre y ofreciéndote herramientas para afrontarlo."
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.2 },
                  },
                }}
              />
              <TextAnimation
                as="p"
                text="Ubicada en el corazón de Moncloa, mi consulta está diseñada para ser ese refugio urbano donde el ruido exterior cesa, permitiendo que emerja tu propia voz. Un enfoque integrador donde el rigor académico de la Psicología Clínica se pone al servicio de tu bienestar emocional."
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.2 },
                  },
                }}
              />
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.15} className="mt-14">
            <StatsRow />
          </ScrollReveal>
        </div>
      </section>

      <PublicFaqSection
        id="faq-enfoque"
        className="bg-canvas-alt"
        heading="Cómo se entiende el proceso terapéutico"
        items={enfoquePageFaq}
      />

      <CTASection />
    </div>
    </>
  );
}
