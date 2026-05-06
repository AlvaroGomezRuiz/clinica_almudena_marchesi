import type { Metadata } from 'next';
import Link from 'next/link';

import ScrollReveal from '@/components/landing/ScrollReveal';
import TextAnimation from '@/components/ui/scroll-text';
import CTASection from '@/components/sections/CTASection';
import PremiumCard from '@/components/ui/PremiumCard';
import PublicFaqSection from '@/components/seo/PublicFaqSection';
import {
  CLINIC_PRICE_INDIVIDUAL_CENTIMOS,
  CLINIC_PRICE_PAREJA_CENTIMOS,
  CLINIC_PUBLIC_SITE_HOST_LABEL,
  CLINIC_PUBLIC_SITE_URL,
  CLINIC_SESSION_DURATION_MIN,
  CLINIC_TARIFAS_SESION_RESUMEN,
  formatClinicPrecioEUR,
} from '@/lib/clinic';
import { serviciosPageFaq } from '@/lib/seo/clinic-faq-content';
import { buildFaqPageJsonLd } from '@/lib/seo/faq-jsonld';
import { buildPublicPageMetadata } from '@/lib/seo/build-public-page-metadata';
import { buildServiciosPageSeoJsonLd } from '@/lib/seo/servicios-page-json-ld';
import { clinicPrimaryKeywordsList } from '@/lib/seo/primary-keywords';

const serviciosFaqPageUrl: string = new URL('/servicios', CLINIC_PUBLIC_SITE_URL).href;
const serviciosFaqLd = buildFaqPageJsonLd(serviciosPageFaq, serviciosFaqPageUrl);

export const metadata: Metadata = buildPublicPageMetadata({
  path: '/servicios',
  title: `Servicios — Terapia individual, pareja y online (Madrid) | ${CLINIC_PUBLIC_SITE_HOST_LABEL}`,
  description:
    'Terapia individual, de pareja, infanto-juvenil y online (enlace seguro acordado). Tarifas: consulta clínica en Moncloa / Chamberí, Madrid (Meléndez Valdés).',
  keywords: [
    ...clinicPrimaryKeywordsList(),
    'terapia individual Madrid',
    'terapia de pareja Madrid',
    'psicología online Madrid',
    'tarifas psicólogo Madrid',
    'terapia ansiedad Madrid',
  ],
});

const SERVICES = [
  {
    tag: 'Adultos',
    title: 'Terapia Individual',
    body: 'Un espacio seguro para profundizar en el autoconocimiento, gestionar la ansiedad, el duelo o las dificultades relacionales desde un enfoque clínico integrador.',
    price: formatClinicPrecioEUR(CLINIC_PRICE_INDIVIDUAL_CENTIMOS),
    duration: `${CLINIC_SESSION_DURATION_MIN} min`,
    href: '/contacto',
    cta: 'Contactar',
    featured: true,
  },
  {
    tag: 'Relaciones',
    title: 'Terapia de Pareja',
    body: 'Restaurar la comunicación y el vínculo, navegando los conflictos desde la empatía y la responsabilidad compartida.',
    price: formatClinicPrecioEUR(CLINIC_PRICE_PAREJA_CENTIMOS),
    duration: '75 min',
    href: '/contacto',
    cta: 'Contactar',
    featured: false,
  },
  {
    tag: 'Infancia',
    title: 'Infanto-Juvenil',
    body: 'Acompañamiento en el desarrollo emocional de niños y adolescentes. Orientación a padres y trabajo terapéutico mediante el juego y la expresión creativa. La tarifa por sesión es la misma que en terapia individual.',
    price: formatClinicPrecioEUR(CLINIC_PRICE_INDIVIDUAL_CENTIMOS),
    duration: `${CLINIC_SESSION_DURATION_MIN} min`,
    href: '/contacto',
    cta: 'Contactar',
    featured: false,
  },
  {
    tag: 'Online',
    title: 'Terapia Online',
    body: 'Sesión en vídeo con la misma calidad clínica. El enlace (p. ej. Google Meet privado por sesión) lo compartimos antes de la sesión. La tarifa habitual se alinea con la sesión individual en consulta.',
    price: 'Consultar',
    duration: 'Videollamada acordada',
    href: '/contacto',
    cta: 'Consultar modalidad',
    featured: false,
  },
] as const;



const serviciosSeoRichLd = buildServiciosPageSeoJsonLd({
  path: '/servicios',
  pageName: `Servicios — Terapia individual, pareja y online (Madrid) | ${CLINIC_PUBLIC_SITE_HOST_LABEL}`,
  pageDescription:
    'Terapia individual, de pareja, infanto-juvenil y online (enlace seguro acordado). Consulta clínica en Moncloa / Chamberí, Madrid (Meléndez Valdés).',
  breadcrumb: [
    { name: 'Inicio', path: '/' },
    { name: 'Servicios', path: '/servicios' },
  ],
  services: SERVICES.map((s) => ({
    name: s.title,
    href: s.href,
    description: s.body,
  })),
});

export default function ServiciosPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviciosSeoRichLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviciosFaqLd) }}
      />
    <div className="bg-canvas overflow-x-hidden">
      {/* Hero */}
      <section className="pt-32 pb-16 md:pt-40 md:pb-24 px-6 md:px-12">
        <div className="max-w-screen-xl mx-auto">
          <ScrollReveal>
            <span className="font-mono text-label-sm uppercase tracking-[0.14em] text-sage-mid mb-5 block">
              Servicios
            </span>
          </ScrollReveal>
          <ScrollReveal delay={0.08}>
            <TextAnimation
              as="h1"
              text="Un espacio a medida de tu proceso."
              classname="font-display text-display-1 text-ink max-w-4xl text-balance mb-6"
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
              text="Cada proceso es único. Ofrezco diferentes modalidades de terapia adaptadas a tus necesidades actuales, con el rigor clínico y la calidez que tu bienestar requiere."
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
          <ScrollReveal delay={0.24}>
            <p className="mt-8 max-w-2xl rounded-2xl border border-line bg-canvas-sage/40 px-5 py-4 font-body text-[0.95rem] leading-relaxed text-ink-soft text-pretty dark:bg-canvas-alt/60">
              <span className="font-medium text-ink dark:text-white">Reservas:</span> ponte en contacto para gestionar tu primera cita. Tarifas orientativas de sesión:{' '}
              <span className="whitespace-nowrap font-medium text-ink dark:text-white">{CLINIC_TARIFAS_SESION_RESUMEN}</span>
              .
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Services Grid */}
      <section className="pb-20 md:pb-32 px-6 md:px-12">
        <div className="max-w-screen-xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6">
          {SERVICES.map((service, i) => (
            <ScrollReveal
              key={service.title}
              delay={i * 0.06}
              className={
                i === 0 ? 'md:col-span-7' : i === 1 ? 'md:col-span-5' : 'md:col-span-6'
              }
            >
              <PremiumCard tilt={false} className="h-full">
                <div
                  className={`flex flex-col justify-between h-full group p-8 md:p-10 text-center ${
                    service.featured
                      ? 'ring-1 ring-sage/15 dark:ring-sage/30 rounded-3xl'
                      : ''
                  }`}
                >
                  <div>
                    <span className="inline-block font-mono text-label-sm uppercase tracking-[0.1em] text-sage bg-sage-wash px-3 py-1 rounded-pill mb-5">
                      {service.tag}
                    </span>
                    <TextAnimation
                      as="h2"
                      text={service.title}
                      classname="font-display text-display-3 text-ink mb-3"
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
                      text={service.body}
                      classname="text-ink-soft leading-relaxed font-body text-[0.92rem] mb-6"
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
                  <div className="flex flex-col items-center gap-3 pt-4 border-t border-line">
                    <div>
                      <span className="font-display text-3xl text-ink font-light">
                        {service.price}
                      </span>
                      <span className="text-ink-muted text-sm ml-1 font-body">
                        /{service.duration}
                      </span>
                    </div>
                    <Link
                      href={service.href}
                      className="font-body text-sm font-medium text-sage flex items-center gap-1.5 group/link hover:gap-2.5 transition-all duration-300"
                    >
                      {service.cta}
                      <span className="material-symbols-outlined text-lg transition-transform group-hover/link:translate-x-0.5">
                        arrow_forward
                      </span>
                    </Link>
                  </div>
                </div>
              </PremiumCard>
            </ScrollReveal>
          ))}
        </div>
      </section>



      {/* FAQ + CTA breve */}
      <PublicFaqSection
        id="faq-servicios"
        className="bg-canvas"
        heading="Preguntas habituales sobre servicios y reservas"
        items={serviciosPageFaq}
      />
      <section className="py-16 md:py-20 px-6 md:px-12">
        <div className="max-w-screen-xl mx-auto text-center">
          <ScrollReveal>
            <TextAnimation
              as="h2"
              text="¿No sabes qué modalidad es la mejor para ti?"
              classname="font-display text-display-3 text-ink mb-4 italic text-balance"
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
              text="Escríbeme sin compromiso y valoraremos juntos tu caso para encontrar el camino que mejor se adapte a tu situación."
              classname="text-ink-soft mb-8 max-w-lg mx-auto text-pretty"
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.2 },
                },
              }}
            />
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contacto" className="btn-primary text-center">
                Contactar ahora
              </Link>
              <Link href="/sobre-mi" className="btn-secondary text-center">
                Conocer más sobre mí
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <CTASection />
    </div>
    </>
  );
}

