'use client';

import Link from 'next/link';
import ScrollReveal from '@/components/public/ScrollReveal';

const STEPS = [
  {
    num: '01.',
    title: 'Registro Inicial',
    body: 'Crea tu perfil con tus datos básicos de contacto.',
  },
  {
    num: '02.',
    title: 'Reserva Directa',
    body: 'Accede a las horas disponibles y elige la que mejor te encaje.',
  },
  {
    num: '03.',
    title: 'Control Total',
    body: 'Facturas, recordatorios y gestión de citas en un solo lugar.',
  },
] as const;

export default function BunkerSection() {
  return (
    <section className="py-24 md:py-36 px-6 md:px-12 bg-canvas-alt/50 relative overflow-hidden">
      <div className="max-w-4xl mx-auto text-center">
        {/* Icon */}
        <ScrollReveal>
          <span
            className="material-symbols-outlined text-6xl text-sage mb-8 block"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            verified_user
          </span>
        </ScrollReveal>

        {/* Headline */}
        <ScrollReveal delay={0.06}>
          <h2 className="font-display text-display-2 text-ink mb-8 italic text-balance">
            Tu búnker digital seguro.
          </h2>
        </ScrollReveal>

        {/* Description */}
        <ScrollReveal delay={0.1}>
          <p className="text-body-lg text-ink-soft mb-8 leading-relaxed max-w-2xl mx-auto text-pretty">
            Para garantizar la máxima confidencialidad y una gestión eficiente de
            tu proceso, utilizamos un <strong>Portal del Paciente</strong>{' '}
            cifrado. El registro es el primer paso obligatorio para acceder a mi
            agenda y gestionar tus sesiones.
          </p>
        </ScrollReveal>

        {/* Trust badges */}
        <ScrollReveal delay={0.14}>
          <div className="flex flex-col items-center gap-4 mb-14">
            <div className="flex items-center gap-4 text-ink-soft">
              <span className="material-symbols-outlined text-sage text-xl">verified</span>
              <p className="font-body text-[0.92rem] text-left">
                Encriptación de grado militar simplificada para tu paz mental.
              </p>
            </div>
            <div className="flex items-center gap-4 text-ink-soft">
              <span className="material-symbols-outlined text-sage text-xl">lock</span>
              <p className="font-body text-[0.92rem] text-left">
                Acceso exclusivo y privado a tu historial personal.
              </p>
            </div>
          </div>
        </ScrollReveal>

        {/* 3-step grid */}
        <ScrollReveal delay={0.18}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-14 text-left">
            {STEPS.map((step) => (
              <div
                key={step.num}
                className="glass-card p-7 flex flex-col gap-2 group hover:shadow-card-hover transition-shadow duration-600 ease-apple"
              >
                <span className="font-display text-3xl text-sage font-light">
                  {step.num}
                </span>
                <p className="font-body font-semibold text-ink text-[0.95rem]">
                  {step.title}
                </p>
                <p className="text-ink-soft text-sm leading-relaxed">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* Info callout */}
        <ScrollReveal delay={0.22}>
          <div className="max-w-2xl mx-auto mb-14 glass-card p-6 flex gap-4 text-left border-l-[3px] border-sage">
            <span className="material-symbols-outlined text-sage text-2xl shrink-0 mt-0.5">info</span>
            <div>
              <p className="font-body font-semibold text-ink text-sm mb-1">
                Registro Obligatorio
              </p>
              <p className="text-ink-soft text-sm leading-relaxed">
                Para garantizar la confidencialidad y gestionar tus citas, es
                necesario crear una cuenta de acceso privada antes de cualquier
                reserva.
              </p>
            </div>
          </div>
        </ScrollReveal>

        {/* CTA */}
        <ScrollReveal delay={0.26}>
          <Link
            href="/login"
            className="btn-primary inline-flex items-center gap-3 text-base px-10 py-4"
          >
            Acceder al Portal del Paciente
            <span className="material-symbols-outlined text-xl">login</span>
          </Link>
          <p className="mt-6 font-mono text-label-sm text-ink-muted italic">
            Cumplimiento estricto de RGPD y LOPD.
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
