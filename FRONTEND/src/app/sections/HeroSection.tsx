'use client';

import Link from 'next/link';
import ScrollReveal from '@/components/public/ScrollReveal';
import Photo3D from '@/components/public/Photo3D';

export default function HeroSection() {
  return (
    <section className="relative min-h-[100dvh] flex items-center pt-28 pb-20 px-6 md:px-12 overflow-hidden">
      {/* Ambient Background */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="absolute top-[-10%] left-[15%] w-[600px] h-[600px] rounded-full blur-[120px] opacity-40"
          style={{ background: 'radial-gradient(circle, rgba(200,217,207,0.6) 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-[-5%] right-[10%] w-[500px] h-[500px] rounded-full blur-[100px] opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(232,221,208,0.5) 0%, transparent 70%)' }}
        />
        {/* Subtle grain */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(28,28,25,0.3) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
      </div>

      <div className="max-w-screen-xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center relative">
        {/* Text Column — FIRST on mobile, first on desktop */}
        <div className="z-10 order-1">
          <ScrollReveal delay={0} offset={30}>
            <span className="inline-block font-mono text-label-sm uppercase tracking-[0.14em] text-sage px-4 py-1.5 rounded-pill border border-sage/15 bg-sage-wash/60 mb-8">
              Psicología Clínica · Moncloa
            </span>
          </ScrollReveal>

          <ScrollReveal delay={0.08} offset={40}>
            <h1 className="font-display text-display-1 text-ink text-balance mb-8 italic">
              Un espacio donde{' '}
              <span className="not-italic font-medium">ser</span>,
              <br className="hidden md:block" />
              sin ser juzgado.
            </h1>
          </ScrollReveal>

          <ScrollReveal delay={0.16} offset={35}>
            <p className="text-body-lg text-ink-soft max-w-lg mb-10 leading-relaxed text-pretty">
              Acompañamiento profesional en el corazón de Moncloa. Una
              invitación a la pausa, al entendimiento y a la reconstrucción
              propia.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.24} offset={30}>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/registro-paciente" className="btn-primary text-center">
                Reserva tu primera cita
              </Link>
              <Link href="/enfoque" className="btn-secondary text-center">
                Conoce mi enfoque
              </Link>
            </div>
          </ScrollReveal>
        </div>

        {/* 3D Photo Column — SECOND on mobile, second on desktop */}
        <div className="order-2 flex justify-center">
          <ScrollReveal offset={50} duration={1} scale={0.95}>
            <Photo3D
              src="/images/almudena.jpg"
              alt="Almudena Marchesi, psicóloga clínica, en su consulta de Moncloa, Madrid"
              width={520}
              height={680}
              priority
              className="max-w-[340px] md:max-w-[440px] lg:max-w-[480px]"
            />
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
