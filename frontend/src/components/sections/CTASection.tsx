'use client';

import Link from 'next/link';
import ScrollReveal from '@/components/landing/ScrollReveal';
import PremiumCard from '@/components/ui/PremiumCard';
import TextAnimation from '@/components/ui/scroll-text';

/* Server Component. Animación via ScrollReveal (client island). */

export default function CTASection() {
  return (
    <section
      className="py-28 md:py-40 px-6 md:px-12"
      aria-label="Reservar primera cita — inicio de tu proceso terap\u00e9utico"
    >
      <div className="max-w-screen-xl mx-auto">
        <ScrollReveal>
          <PremiumCard tilt={false}>
            <div className="px-8 py-16 md:px-16 md:py-20 text-center relative overflow-hidden bg-canvas-alt dark:bg-transparent rounded-3xl h-full">
              {/* Ambient glow */}
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full blur-[120px] opacity-20 pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(122,155,138,0.5) 0%, transparent 70%)' }}
                aria-hidden="true"
              />

              <div className="relative z-10">
                <span className="font-mono text-label-sm uppercase tracking-[0.14em] text-ink-muted dark:text-sage-light/60 mb-6 block">
                  Tu bienestar empieza aquí
                </span>
                <TextAnimation
                  as="h2"
                  text="Inicia tu camino"
                  classname="font-display text-display-2 text-ink dark:text-white mb-6 text-balance italic"
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
                  text="Reserva una primera sesión para explorar cómo este enfoque puede ayudarte en tu momento actual."
                  classname="font-body text-ink-soft dark:text-white/55 text-lg max-w-md mx-auto mb-10 leading-relaxed"
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
                    <Link
                      href="/contacto"
                      className="bg-sage text-white dark:bg-white dark:text-[#111111] font-body font-medium px-8 py-4 rounded-pill transition-all duration-400 ease-apple hover:-translate-y-px active:scale-[0.97] text-center"
                      style={{ boxShadow: '0 10px 30px rgba(74, 99, 85, 0.18)' }}
                      aria-label="Contactar para reservar una cita"
                    >
                      Contactar ahora
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
