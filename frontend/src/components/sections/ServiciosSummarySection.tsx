'use client';

import React from 'react';
import TextAnimation from '@/components/ui/scroll-text';
import PremiumCard from '@/components/ui/PremiumCard';
import StatsRow from '@/components/landing/StatsRow';
import Link from 'next/link';
import ScrollReveal from '@/components/landing/ScrollReveal';

const SERVICES = [
  {
    title: 'Terapia Individual',
    desc: 'Un espacio seguro para gestionar ansiedad, duelo o dificultades.'
  },
  {
    title: 'Terapia de Pareja',
    desc: 'Restaurar la comunicación y el vínculo desde la empatía.'
  },
  {
    title: 'Infanto-Juvenil',
    desc: 'Acompañamiento en el desarrollo de niños y adolescentes.'
  },
  {
    title: 'Terapia Online',
    desc: 'Sesiones por videollamada con la misma calidad clínica.'
  }
];

export default function ServiciosSummarySection() {
  return (
    <section className="w-full bg-transparent overflow-hidden flex flex-col justify-center px-6 md:px-12 py-16 md:py-24 z-30">

      <div className="max-w-7xl mx-auto w-full relative z-10 text-center">
        <ScrollReveal delay={0}>
          <span className="font-mono text-label-sm uppercase tracking-[0.14em] text-sage-mid dark:text-white/70 mb-4 block">
            Áreas de Intervención
          </span>
        </ScrollReveal>
        <ScrollReveal delay={0.1}>
          <TextAnimation
            as="h2"
            text="Un espacio a medida de tu proceso."
            classname="font-display text-4xl md:text-5xl text-ink dark:text-white leading-tight mb-16 italic"
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 text-center">
          {SERVICES.map((service, i) => (
            <ScrollReveal key={i} delay={0.2 + (i * 0.1)} className="h-full">
              <PremiumCard tilt={false} className="h-full">
                <div className="p-8 flex flex-col h-full items-center justify-center group">
                  <h3 className="font-display text-2xl text-ink mb-3">{service.title}</h3>
                  <p className="text-ink-soft font-body text-sm leading-relaxed mb-6">{service.desc}</p>
                  
                  <Link href="/servicios" className="mt-auto font-body text-sm font-medium text-sage flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
                    Saber más <span className="material-symbols-outlined text-lg">arrow_forward</span>
                  </Link>
                </div>
              </PremiumCard>
            </ScrollReveal>
          ))}
        </div>

        {/* Stats Row */}
        <ScrollReveal delay={0.4} className="mb-12 flex justify-center">
          <StatsRow variant="light" />
        </ScrollReveal>

        <ScrollReveal delay={0.5}>
          <Link href="/servicios" className="btn-primary inline-flex">
            Ver todos los servicios y tarifas
          </Link>
        </ScrollReveal>
      </div>
    </section>
  );
}
