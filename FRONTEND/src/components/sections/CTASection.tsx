'use client';

import Link from 'next/link';
import ScrollReveal from '@/components/landing/ScrollReveal';
import PremiumCard from '@/components/ui/PremiumCard';

export default function CTASection() {
  return (
    <section
      className="py-28 md:py-40 px-6 md:px-12"
      aria-label="Reservar primera cita — inicio de tu proceso terap\u00e9utico"
    >
      <div className="max-w-screen-xl mx-auto">
        <ScrollReveal>
          <PremiumCard tilt={false}>
            <div className="px-8 py-16 md:px-16 md:py-20 text-center relative overflow-hidden bg-ink dark:bg-transparent rounded-3xl h-full">
              {/* Ambient glow */}
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full blur-[120px] opacity-20 pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(122,155,138,0.5) 0%, transparent 70%)' }}
                aria-hidden="true"
              />

              <div className="relative z-10">
                <span className="font-mono text-label-sm uppercase tracking-[0.14em] text-sage-light/60 mb-6 block">
                  Tu bienestar empieza aquí
                </span>
                <h2 className="font-display text-display-2 text-white mb-6 text-balance italic">
                  Inicia tu camino
                </h2>
                <p className="font-body text-white/55 text-lg max-w-md mx-auto mb-10 leading-relaxed">
                  Reserva una primera sesión para explorar cómo este enfoque
                  puede ayudarte en tu momento actual.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/registro-paciente"
                    className="bg-white text-[#111111] font-body font-medium px-8 py-4 rounded-pill transition-all duration-400 ease-apple hover:-translate-y-px active:scale-[0.97] text-center"
                    style={{ boxShadow: '0 4px 20px rgba(255,255,255,0.1)' }}
                  >
                    Reservar cita
                  </Link>
                  <Link
                    href="/contacto"
                    className="border border-white/20 text-white font-body font-medium px-8 py-4 rounded-pill transition-all duration-400 ease-apple hover:bg-white/10 hover:-translate-y-px text-center"
                  >
                    Contactar
                  </Link>
                </div>
              </div>
            </div>
          </PremiumCard>
        </ScrollReveal>
      </div>
    </section>
  );
}
