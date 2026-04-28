import type { Metadata } from 'next';
import Link from 'next/link';

import ScrollReveal from '@/components/landing/ScrollReveal';
import CTASection from '@/components/sections/CTASection';
import PremiumCard from '@/components/ui/PremiumCard';
import PublicFaqSection from '@/components/seo/PublicFaqSection';
import {
  CLINIC_CATALOGO_BONO_INDIVIDUAL_10_CENTIMOS,
  CLINIC_CATALOGO_BONO_INDIVIDUAL_3_CENTIMOS,
  CLINIC_CATALOGO_BONO_INDIVIDUAL_5_CENTIMOS,
  CLINIC_CATALOGO_BONO_PAREJA_3_CENTIMOS,
  CLINIC_CATALOGO_BONO_PAREJA_5_CENTIMOS,
  CLINIC_PRICE_INDIVIDUAL_CENTIMOS,
  CLINIC_PRICE_PAREJA_CENTIMOS,
  CLINIC_PUBLIC_SITE_URL,
  CLINIC_SESSION_DURATION_MIN,
  CLINIC_TARIFAS_SESION_RESUMEN,
  formatClinicBonoAhorroVsSueltoIndividual,
  formatClinicBonoAhorroVsSueltoPareja,
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
  title: 'Servicios | Almudena Marchesi — Terapia individual, pareja y online (Madrid)',
  description:
    'Terapia individual, de pareja, infanto-juvenil y online (enlace seguro acordado). Tarifas y bonos: consulta clínica en Moncloa / Chamberí, Madrid (Meléndez Valdés).',
  keywords: [
    ...clinicPrimaryKeywordsList(),
    'terapia individual Madrid',
    'terapia de pareja Madrid',
    'psicología online Madrid',
    'tarifas psicólogo Madrid',
    'bono sesiones psicología',
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
    href: '/registro-paciente?plan=individual',
    cta: 'Reservar Cita',
    featured: true,
  },
  {
    tag: 'Relaciones',
    title: 'Terapia de Pareja',
    body: 'Restaurar la comunicación y el vínculo, navegando los conflictos desde la empatía y la responsabilidad compartida.',
    price: formatClinicPrecioEUR(CLINIC_PRICE_PAREJA_CENTIMOS),
    duration: '75 min',
    href: '/registro-paciente?plan=pareja',
    cta: 'Consultar disponibilidad',
    featured: false,
  },
  {
    tag: 'Infancia',
    title: 'Infanto-Juvenil',
    body: 'Acompañamiento en el desarrollo emocional de niños y adolescentes. Orientación a padres y trabajo terapéutico mediante el juego y la expresión creativa. La tarifa por sesión es la misma que en terapia individual.',
    price: formatClinicPrecioEUR(CLINIC_PRICE_INDIVIDUAL_CENTIMOS),
    duration: `${CLINIC_SESSION_DURATION_MIN} min`,
    href: '/registro-paciente?plan=individual',
    cta: 'Reservar Cita',
    featured: false,
  },
  {
    tag: 'Online',
    title: 'Terapia Online',
    body: 'Sesión en vídeo con la misma calidad clínica. El enlace (p. ej. Google Meet privado por sesión) lo coordina Almudena por mensaje seguro del portal: no compartes sala con otros pacientes. La tarifa habitual se alinea con la sesión individual en consulta; el desglose exacto lo confirmas al reservar en el portal.',
    price: 'Consultar',
    duration: 'Videollamada acordada',
    href: '/contacto',
    cta: 'Consultar modalidad',
    featured: false,
  },
] as const;

const BONOS = [
  {
    name: 'Bono 5 sesiones · Individual' as const,
    label: 'Continuidad',
    price: formatClinicPrecioEUR(CLINIC_CATALOGO_BONO_INDIVIDUAL_5_CENTIMOS),
    savings: formatClinicBonoAhorroVsSueltoIndividual(5),
    validity: 'Validez según portal al comprar',
    href: '/registro-paciente?plan=individual',
  },
  {
    name: 'Bono 10 sesiones · Individual' as const,
    label: 'Transformación',
    price: formatClinicPrecioEUR(CLINIC_CATALOGO_BONO_INDIVIDUAL_10_CENTIMOS),
    savings: formatClinicBonoAhorroVsSueltoIndividual(10),
    validity: 'Validez según portal al comprar',
    href: '/registro-paciente?plan=individual',
  },
  {
    name: 'Bono 3 sesiones · Pareja' as const,
    label: 'Acompañamiento',
    price: formatClinicPrecioEUR(CLINIC_CATALOGO_BONO_PAREJA_3_CENTIMOS),
    savings: formatClinicBonoAhorroVsSueltoPareja(3),
    validity: 'Validez según portal al comprar',
    href: '/registro-paciente?plan=pareja',
  },
  {
    name: 'Bono 5 sesiones · Pareja' as const,
    label: 'Proceso',
    price: formatClinicPrecioEUR(CLINIC_CATALOGO_BONO_PAREJA_5_CENTIMOS),
    savings: formatClinicBonoAhorroVsSueltoPareja(5),
    validity: 'Validez según portal al comprar',
    href: '/registro-paciente?plan=pareja',
  },
] as const;

const serviciosSeoRichLd = buildServiciosPageSeoJsonLd({
  path: '/servicios',
  pageName: 'Servicios | Almudena Marchesi — Terapia individual, pareja y online (Madrid)',
  pageDescription:
    'Terapia individual, de pareja, infanto-juvenil y online (enlace seguro acordado). Tarifas y bonos: consulta clínica en Moncloa / Chamberí, Madrid (Meléndez Valdés).',
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
            <h1 className="font-display text-display-1 text-ink max-w-4xl text-balance mb-6">
              Un espacio a <span className="italic">medida</span> de tu proceso.
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={0.16}>
            <p className="text-body-lg text-ink-soft max-w-2xl leading-relaxed text-pretty">
              Cada proceso es único. Ofrezco diferentes modalidades de terapia
              adaptadas a tus necesidades actuales, con el rigor clínico y la
              calidez que tu bienestar requiere.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={0.24}>
            <p className="mt-8 max-w-2xl rounded-2xl border border-line bg-canvas-sage/40 px-5 py-4 font-body text-[0.95rem] leading-relaxed text-ink-soft text-pretty dark:bg-canvas-alt/60">
              <span className="font-medium text-ink dark:text-white">Reservas y bonos:</span> tras el registro como
              paciente, citas y pagos se gestionan en el portal con la misma política de cancelación (más de 48 h antes
              del inicio cuando aplique). Tarifas orientativas de sesión:{' '}
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
                  className={`flex flex-col justify-between h-full group p-8 md:p-10 ${
                    service.featured
                      ? 'ring-1 ring-sage/15 dark:ring-sage/30 rounded-3xl'
                      : ''
                  }`}
                >
                  <div>
                    <span className="inline-block font-mono text-label-sm uppercase tracking-[0.1em] text-sage bg-sage-wash px-3 py-1 rounded-pill mb-5">
                      {service.tag}
                    </span>
                    <h2 className="font-display text-display-3 text-ink mb-3">
                      {service.title}
                    </h2>
                    <p className="text-ink-soft leading-relaxed font-body text-[0.92rem] mb-6">
                      {service.body}
                    </p>
                  </div>
                  <div className="flex items-end justify-between gap-4 pt-4 border-t border-line">
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

      {/* Bonos */}
      <section className="py-24 md:py-36 px-6 md:px-12 bg-canvas-sage dark:bg-canvas-alt relative overflow-hidden transition-colors duration-500">
        <div className="max-w-screen-xl mx-auto relative z-10">
          <ScrollReveal className="text-center mb-14">
            <span className="font-mono text-label-sm uppercase tracking-[0.14em] text-sage-mid mb-4 block">
              Bonos
            </span>
            <h2 className="font-display text-display-2 text-ink mb-4 text-balance">
              Compromiso con tu Bienestar
            </h2>
            <p className="text-ink-soft max-w-xl mx-auto text-pretty">
              Los procesos terapéuticos requieren constancia. He diseñado bonos
              con tarifas reducidas para facilitar la continuidad.
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {BONOS.map((bono, i) => (
              <ScrollReveal key={bono.name} delay={i * 0.06}>
                <PremiumCard tilt={false} className="h-full">
                  <div className="flex flex-col items-center text-center p-8 md:p-10 h-full">
                    <span className="font-mono text-label-sm uppercase tracking-widest text-sage-mid mb-3">
                      {bono.label}
                    </span>
                    <h3 className="font-display text-display-3 text-ink mb-4 text-balance">
                      {bono.name}
                    </h3>
                    <div className="mb-4 w-full min-w-0">
                      <span className="font-display text-5xl text-ink font-light">
                        {bono.price}
                      </span>
                      <p className="text-sage font-body font-medium text-sm mt-1.5 text-balance max-w-sm mx-auto leading-snug">
                        {bono.savings}
                      </p>
                    </div>
                    <p className="text-ink-muted text-sm mb-6 font-body text-balance max-w-sm">
                      {bono.name.includes('Pareja') ? (
                        <>Terapia de pareja. {bono.validity}.</>
                      ) : (
                        <>Terapia individual u online. {bono.validity}.</>
                      )}
                    </p>
                    <Link
                      href={bono.href}
                      className="btn-primary w-full text-center mt-auto"
                    >
                      Elegir este bono
                    </Link>
                  </div>
                </PremiumCard>
              </ScrollReveal>
            ))}
          </div>
          <ScrollReveal delay={0.22}>
            <p className="text-center text-ink-muted text-sm max-w-2xl mx-auto mt-10 font-body text-pretty">
              También disponible: bono de 3 sesiones individual por{' '}
              <span className="whitespace-nowrap text-ink dark:text-white/90">
                {formatClinicPrecioEUR(CLINIC_CATALOGO_BONO_INDIVIDUAL_3_CENTIMOS)}
              </span>{' '}
              (catálogo al completo en el portal con precios y validez actualizados).
            </p>
          </ScrollReveal>
        </div>

        <div
          className="absolute top-0 right-0 w-96 h-96 bg-sage/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-0 left-0 w-64 h-64 bg-warm/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 pointer-events-none"
          aria-hidden="true"
        />
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
            <h2 className="font-display text-display-3 text-ink mb-4 italic text-balance">
              ¿No sabes qué modalidad es la mejor para ti?
            </h2>
            <p className="text-ink-soft mb-8 max-w-lg mx-auto text-pretty">
              Escríbeme sin compromiso y valoraremos juntos tu caso para encontrar
              el camino que mejor se adapte a tu situación.
            </p>
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

