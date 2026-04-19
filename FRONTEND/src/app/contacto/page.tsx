import type { Metadata } from 'next';
import Link from 'next/link';
import ScrollReveal from '@/components/public/ScrollReveal';
import MoncloaSection from '@/app/sections/MoncloaSection';
import CTASection from '@/app/sections/CTASection';
import {
  CLINIC_ADDRESS,
  CLINIC_ADDRESS_LINE1,
  CLINIC_ADDRESS_LINE2,
  getClinicGoogleMapsHref,
} from '@/lib/clinic';

export const metadata: Metadata = {
  title: 'Contacto | Almudena Marchesi — Psicología Clínica',
  description:
    'Contacta con la consulta de Psicología Clínica de Almudena Marchesi en Moncloa, Madrid. Información de contacto, horario y cómo llegar.',
};

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
    value: 'info@almudenamarchesi.es',
    href: 'mailto:info@almudenamarchesi.es',
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
                <a
                  href={item.href}
                  target={item.external ? '_blank' : undefined}
                  rel={item.external ? 'noopener noreferrer' : undefined}
                  className="glass-card p-6 flex items-center gap-5 group hover:shadow-card-hover transition-all duration-400 ease-apple block"
                >
                  <div className="w-12 h-12 rounded-full bg-sage-wash flex items-center justify-center shrink-0 group-hover:bg-sage transition-colors duration-400 ease-apple">
                    <span className="material-symbols-outlined text-xl text-sage group-hover:text-white transition-colors duration-400">
                      {item.icon}
                    </span>
                  </div>
                  <div>
                    <p className="font-mono text-label-sm uppercase text-ink-muted mb-1">
                      {item.label}
                    </p>
                    <p className="font-body text-ink font-medium text-[0.95rem]">
                      {item.value}
                    </p>
                  </div>
                </a>
              </ScrollReveal>
            ))}

            {/* Portal Advisory */}
            <ScrollReveal delay={0.2}>
              <div className="glass-card p-6 md:p-8 bg-sage-wash/50">
                <div className="flex items-start gap-4">
                  <span className="material-symbols-outlined text-sage text-2xl mt-0.5">calendar_month</span>
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
              <div className="glass-card p-6 md:p-8">
                <div className="space-y-4">
                  {SCHEDULE.map((slot) => (
                    <div key={slot.day} className="flex justify-between items-center py-2 border-b border-line last:border-0">
                      <span className="font-body text-[0.92rem] text-ink">{slot.day}</span>
                      <span className="font-mono text-[0.82rem] text-ink-soft tracking-wide">{slot.hours}</span>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>

            {/* Location Card */}
            <ScrollReveal delay={0.18}>
              <a
                href={getClinicGoogleMapsHref()}
                target="_blank"
                rel="noopener noreferrer"
                className="glass-card p-6 md:p-8 block group hover:shadow-card-hover transition-all duration-400 ease-apple"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-sage-wash flex items-center justify-center shrink-0 group-hover:bg-sage transition-colors duration-400 ease-apple">
                    <span className="material-symbols-outlined text-xl text-sage group-hover:text-white transition-colors duration-400" style={{ fontVariationSettings: "'FILL' 1" }}>
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
                      <span className="material-symbols-outlined text-base">open_in_new</span>
                    </span>
                  </div>
                </div>
              </a>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <MoncloaSection />
      <CTASection />
    </div>
  );
}
