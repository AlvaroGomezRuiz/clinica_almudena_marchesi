'use client';

import React from 'react';
import TextAnimation from '@/components/ui/scroll-text';
import PremiumCard from '@/components/ui/PremiumCard';
import StatsRow from '@/components/landing/StatsRow';
import Link from 'next/link';

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
    <section className="min-h-[100dvh] w-full bg-canvas-alt sticky top-0 rounded-t-3xl overflow-hidden flex flex-col justify-center px-6 md:px-12 shadow-[0_-20px_40px_rgba(0,0,0,0.05)] z-30">
      <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f0a_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f0a_1px,transparent_1px)] bg-[size:54px_54px] pointer-events-none" />

      <div className="max-w-7xl mx-auto w-full relative z-10 py-20 text-center">
        <span className="font-mono text-label-sm uppercase tracking-[0.14em] text-sage-mid mb-4 block">
          Áreas de Intervención
        </span>
        <TextAnimation
          as="h2"
          text="Un espacio a medida de tu proceso."
          classname="font-display text-4xl md:text-5xl text-ink leading-tight mb-16 italic"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 text-center">
          {SERVICES.map((service, i) => (
            <PremiumCard key={i} tilt={false}>
              <div className="p-8 flex flex-col h-full items-center justify-center group">
                <h3 className="font-display text-2xl text-ink mb-3">{service.title}</h3>
                <p className="text-ink-soft font-body text-sm leading-relaxed mb-6">{service.desc}</p>
                
                <Link href="/servicios" className="mt-auto font-body text-sm font-medium text-sage flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
                  Saber más <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </Link>
              </div>
            </PremiumCard>
          ))}
        </div>

        {/* Stats Row */}
        <div className="mb-12 flex justify-center">
          <StatsRow />
        </div>

        <Link href="/servicios" className="btn-primary inline-flex">
          Ver todos los servicios y tarifas
        </Link>
      </div>
    </section>
  );
}
