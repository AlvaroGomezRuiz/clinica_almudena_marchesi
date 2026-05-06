import type { Metadata } from 'next';
import Link from 'next/link';

import PublicFaqSection from '@/components/seo/PublicFaqSection';
import ScrollReveal from '@/components/landing/ScrollReveal';
import TextAnimation from '@/components/ui/scroll-text';

import PremiumCard from '@/components/ui/PremiumCard';
import {
  CLINIC_ADDRESS,
  CLINIC_ADDRESS_LINE1,
  CLINIC_ADDRESS_LINE2,
  CLINIC_CONTACT_EMAIL,
  CLINIC_PUBLIC_PHONE_DISPLAY,
  CLINIC_PUBLIC_PHONE_E164,
  CLINIC_PUBLIC_PRESENCIAL_HOURS_SUMMARY_ES,
  CLINIC_PUBLIC_PRESENCIAL_SCHEDULE_ROWS,
  CLINIC_PUBLIC_SITE_HOST_LABEL,
  CLINIC_PUBLIC_SITE_URL,
  getClinicGoogleMapsHref,
} from '@/lib/clinic';
import { contactoPageFaq } from '@/lib/seo/clinic-faq-content';
import { buildFaqPageJsonLd } from '@/lib/seo/faq-jsonld';
import { buildMarketingPageJsonLd } from '@/lib/seo/marketing-page-json-ld';
import { buildPublicPageMetadata } from '@/lib/seo/build-public-page-metadata';

const contactoSeoLd = buildMarketingPageJsonLd({
  path: '/contacto',
  name: `Contacto — Moncloa, Meléndez Valdés | ${CLINIC_PUBLIC_SITE_HOST_LABEL}`,
  description: `Consulta de psicología en Calle Meléndez Valdés (Moncloa–Chamberí, Madrid). Presencial: de momento solo jueves (franjas publicadas en la página). Teléfono, correo ${CLINIC_CONTACT_EMAIL} y cómo llegar.`,
  breadcrumb: [
    { name: 'Inicio', path: '/' },
    { name: 'Contacto', path: '/contacto' },
  ],
});

const contactoFaqPageUrl: string = new URL('/contacto', CLINIC_PUBLIC_SITE_URL).href;
const contactoFaqLd = buildFaqPageJsonLd(contactoPageFaq, contactoFaqPageUrl);

export const metadata: Metadata = buildPublicPageMetadata({
  path: '/contacto',
  title: `Contacto — Moncloa, Meléndez Valdés | ${CLINIC_PUBLIC_SITE_HOST_LABEL}`,
  description: `Consulta de psicología en Calle Meléndez Valdés (Moncloa–Chamberí, Madrid). Presencial: de momento solo jueves (franjas publicadas en la página). Teléfono, correo ${CLINIC_CONTACT_EMAIL} y cómo llegar.`,
  keywords: [
    'contacto psicóloga Madrid',
    'consulta Meléndez Valdés',
    'psicología Moncloa',
    'cita psicología Madrid',
    'dónde psicólogo Chamberí',
    'consulta psicología 28015',
    'psicóloga colegiada Madrid',
  ],
});

const CONTACT_ITEMS = [
  {
    icon: 'location_on',
    label: 'Dirección',
    value: CLINIC_ADDRESS,
    href: getClinicGoogleMapsHref(),
    external: true,
  },
  {
    icon: 'call',
    label: 'Teléfono',
    value: CLINIC_PUBLIC_PHONE_DISPLAY,
    href: `tel:${CLINIC_PUBLIC_PHONE_E164}`,
    external: false,
  },
  {
    icon: 'mail',
    label: 'Correo Electrónico',
    value: CLINIC_CONTACT_EMAIL,
    href: `mailto:${CLINIC_CONTACT_EMAIL}`,
    external: false,
  },
] as const;

export default function ContactoPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactoSeoLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactoFaqLd) }}
      />
    <main className="bg-canvas overflow-x-hidden">
      {/* Hero */}
      <section className="pt-32 pb-16 md:pt-40 md:pb-24 px-6 md:px-12">
        <div className="max-w-3xl mx-auto text-center">
          <ScrollReveal>
            <TextAnimation
              as="h1"
              text="Hablemos."
              classname="font-display text-display-1 text-ink italic mb-6 text-balance"
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
          <ScrollReveal delay={0.08}>
            <div className="section-line max-w-[120px] mx-auto mb-8" />
          </ScrollReveal>
          <ScrollReveal delay={0.12}>
            <TextAnimation
              as="p"
              text="Un espacio de escucha y profesionalidad en el corazón de Madrid. Encuentra el acompañamiento clínico que necesitas para tu bienestar."
              classname="text-body-lg text-ink-soft leading-relaxed text-pretty"
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
      </section>

      {/* Contact Grid */}
      <section className="pb-20 md:pb-32 px-6 md:px-12">
        <div className="max-w-screen-xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Contact Info */}
          <div className="space-y-6">
            <ScrollReveal>
              <TextAnimation
                as="h2"
                text="Información de Contacto"
                classname="font-display text-display-3 text-ink mb-2"
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { ease: 'linear' },
                  },
                }}
              />
              <div className="w-12 h-[2px] bg-sage/20 mb-8" />
            </ScrollReveal>

            {CONTACT_ITEMS.map((item, i) => (
              <ScrollReveal key={item.label} delay={0.06 + i * 0.06}>
                <PremiumCard tilt={false}>
                  <a
                    href={item.href}
                    target={item.external ? '_blank' : undefined}
                    rel={item.external ? 'noopener noreferrer' : undefined}
                    className="flex h-full items-center gap-5 p-6 transition-all duration-400 ease-apple group hover:-translate-y-1"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sage-wash transition-colors duration-400 ease-apple group-hover:bg-sage">
                      <span className="material-symbols-outlined text-xl text-sage transition-colors duration-400 group-hover:text-white">
                        {item.icon}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 select-text">
                      <p className="mb-1 font-mono text-label-sm uppercase text-ink-muted select-text">
                        {item.label}
                      </p>
                      <p className="break-words font-body text-[0.95rem] font-medium text-ink select-text">
                        {item.value}
                      </p>
                    </div>
                  </a>
                </PremiumCard>
              </ScrollReveal>
            ))}

            {/* Reserva Advisory */}
            <ScrollReveal delay={0.2}>
              <PremiumCard tilt={false}>
                <div className="p-6 md:p-8 bg-sage-wash/50 dark:bg-sage-wash/10 rounded-3xl overflow-hidden h-full">
                  <div className="flex items-start gap-4">
                    <span className="material-symbols-outlined text-sage dark:text-sage-light text-2xl mt-0.5">
                      calendar_month
                    </span>
                    <div>
                      <h3 className="font-display text-xl text-ink mb-2">
                        Reserva de Citas
                      </h3>
                      <p className="text-ink-soft text-[0.9rem] leading-relaxed mb-4">
                        Para reservar tu primera cita o consultar disponibilidad,
                        ponte en contacto conmigo directamente por teléfono,
                        correo o WhatsApp. Estaré encantada de atenderte.
                      </p>
                      <Link
                        href={`tel:${CLINIC_PUBLIC_PHONE_E164}`}
                        className="font-body text-sm font-medium text-sage flex items-center gap-1.5 group/link hover:gap-2.5 transition-all duration-300"
                      >
                        Llamar ahora
                        <span className="material-symbols-outlined text-lg transition-transform group-hover/link:translate-x-0.5">
                          call
                        </span>
                      </Link>
                    </div>
                  </div>
                </div>
              </PremiumCard>
            </ScrollReveal>
          </div>

          {/* Schedule & Map */}
          <div className="space-y-6">
            <ScrollReveal delay={0.08}>
              <TextAnimation
                as="h2"
                text="Horario"
                classname="font-display text-display-3 text-ink mb-2"
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { ease: 'linear' },
                  },
                }}
              />
              <div className="w-12 h-[2px] bg-sage/20 mb-8" />
            </ScrollReveal>

            <ScrollReveal delay={0.12}>
              <PremiumCard tilt={false}>
                <div className="p-6 md:p-8">
                  <p className="font-mono text-label-sm uppercase text-ink-muted mb-4">
                    Apertura presencial en consultorio
                  </p>
                  <div className="space-y-4">
                    {CLINIC_PUBLIC_PRESENCIAL_SCHEDULE_ROWS.map((slot) => (
                      <div
                        key={slot.day}
                        className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1.5 sm:gap-4 py-2 border-b border-line last:border-0"
                      >
                        <span className="font-body text-[0.92rem] text-ink">
                          {slot.day}
                        </span>
                        <span className="font-mono text-[0.82rem] text-ink-soft tracking-wide text-left sm:text-right sm:max-w-[min(100%,20rem)]">
                          {slot.hours}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </PremiumCard>
            </ScrollReveal>
            <ScrollReveal delay={0.14}>
              <p className="text-ink-muted text-[0.88rem] leading-relaxed text-pretty font-body">
                {CLINIC_PUBLIC_PRESENCIAL_HOURS_SUMMARY_ES}
              </p>
            </ScrollReveal>

            {/* Location Card */}
            <ScrollReveal delay={0.18}>
              <PremiumCard tilt={false}>
                <a
                  href={getClinicGoogleMapsHref()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-6 md:p-8 block group hover:-translate-y-1 transition-all duration-400 ease-apple h-full"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-sage-wash flex items-center justify-center shrink-0 group-hover:bg-sage transition-colors duration-400 ease-apple">
                      <span
                        className="material-symbols-outlined text-xl text-sage group-hover:text-white transition-colors duration-400"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        location_on
                      </span>
                    </div>
                    <div>
                      <h3 className="font-display text-xl text-ink mb-1">
                        Consulta en Moncloa
                      </h3>
                      <p className="text-ink-soft text-[0.9rem]">
                        {CLINIC_ADDRESS_LINE1}
                      </p>
                      <p className="text-ink-muted text-[0.85rem]">
                        {CLINIC_ADDRESS_LINE2} · Metro Argüelles
                      </p>
                      <span className="inline-flex items-center gap-1 mt-3 font-body text-sm font-medium text-sage group-hover:gap-2 transition-all duration-300">
                        Abrir en Google Maps
                        <span className="material-symbols-outlined text-base">
                          open_in_new
                        </span>
                      </span>
                    </div>
                  </div>
                </a>
              </PremiumCard>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <PublicFaqSection
        id="faq-contacto"
        className="bg-canvas-alt"
        heading="Dudas sobre horario, ubicación y canales de contacto"
        items={contactoPageFaq}
      />


    </main>
    </>
  );
}

