import type { Metadata } from 'next';
import Link from 'next/link';

import ScrollReveal from '@/components/landing/ScrollReveal';
import MoncloaSection from '@/components/sections/MoncloaSection';
import CTASection from '@/components/sections/CTASection';
import PremiumCard from '@/components/ui/PremiumCard';
import {
  CLINIC_ADDRESS,
  CLINIC_ADDRESS_LINE1,
  CLINIC_ADDRESS_LINE2,
  CLINIC_CONTACT_EMAIL,
  getClinicGoogleMapsHref,
} from '@/lib/clinic';
import { buildPublicPageMetadata } from '@/lib/seo/build-public-page-metadata';

export const metadata: Metadata = buildPublicPageMetadata({
  path: '/contacto',
  title: 'Contacto | Almudena Marchesi — Psicología Clínica Madrid · Moncloa',
  description: `Consulta de psicología en Calle Meléndez Valdés (Moncloa-Chamberí): teléfono, correo ${CLINIC_CONTACT_EMAIL}, horario y cómo llegar en Madrid.`,
  keywords: [
    'contacto psicóloga Madrid',
    'consulta Meléndez Valdés',
    'psicología Moncloa',
    'cita psicología Madrid',
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
    icon: 'mail',
    label: 'Correo Electrónico',
    value: CLINIC_CONTACT_EMAIL,
    href: `mailto:${CLINIC_CONTACT_EMAIL}`,
    external: false,
  },
] as const;

const SCHEDULE = [
  { day: 'Lunes — Viernes', hours: '9:00 — 20:00' },
  { day: 'Sábados', hours: 'Bajo demanda' },
  { day: 'Domingos', hours: 'Cerrado' },
] as const;

export default function ContactoPage() {
  return (
    <div className="bg-canvas overflow-x-hidden">
      {/* Hero */}
      <section className="pt-32 pb-16 md:pt-40 md:pb-24 px-6 md:px-12">
        <div className="max-w-3xl mx-auto text-center">
          <ScrollReveal>
            <h1 className="font-display text-display-1 text-ink italic mb-6 text-balance">
              Hablemos.
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={0.08}>
            <div className="section-line max-w-[120px] mx-auto mb-8" />
          </ScrollReveal>
          <ScrollReveal delay={0.12}>
            <p className="text-body-lg text-ink-soft leading-relaxed text-pretty">
              Un espacio de escucha y profesionalidad en el corazón de Madrid.
              Encuentra el acompañamiento clínico que necesitas para tu bienestar.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Contact Grid */}
      <section className="pb-20 md:pb-32 px-6 md:px-12">
        <div className="max-w-screen-xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Contact Info */}
          <div className="space-y-6">
            <ScrollReveal>
              <h2 className="font-display text-display-3 text-ink mb-2">
                Información de Contacto
              </h2>
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

            {/* Portal Advisory */}
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
                        Para garantizar la confidencialidad y la gestión eficiente
                        de tu historial clínico, todas las reservas se realizan a
                        través de nuestro portal seguro.
                      </p>
                      <Link
                        href="/login"
                        className="font-body text-sm font-medium text-sage flex items-center gap-1.5 group/link hover:gap-2.5 transition-all duration-300"
                      >
                        Ir al Portal del Paciente
                        <span className="material-symbols-outlined text-lg transition-transform group-hover/link:translate-x-0.5">
                          arrow_forward
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
              <h2 className="font-display text-display-3 text-ink mb-2">
                Horario
              </h2>
              <div className="w-12 h-[2px] bg-sage/20 mb-8" />
            </ScrollReveal>

            <ScrollReveal delay={0.12}>
              <PremiumCard tilt={false}>
                <div className="p-6 md:p-8">
                  <div className="space-y-4">
                    {SCHEDULE.map((slot) => (
                      <div
                        key={slot.day}
                        className="flex justify-between items-center py-2 border-b border-line last:border-0"
                      >
                        <span className="font-body text-[0.92rem] text-ink">
                          {slot.day}
                        </span>
                        <span className="font-mono text-[0.82rem] text-ink-soft tracking-wide">
                          {slot.hours}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </PremiumCard>
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

      <MoncloaSection />
      <CTASection />
    </div>
  );
}

