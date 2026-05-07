'use client';

import React from 'react';
import TextAnimation from '@/components/ui/scroll-text';
import Image from 'next/image';
import PremiumCard from '@/components/ui/PremiumCard';
import Link from 'next/link';
import ScrollReveal from '@/components/landing/ScrollReveal';

export default function SobreMiSummarySection() {
  return (
    <section className="w-full bg-transparent overflow-hidden flex flex-col justify-center px-6 md:px-12 py-16 md:py-24 z-20">

      <div className="max-w-7xl mx-auto w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          
          {/* Foto — primera en móvil para dar contexto visual */}
          <ScrollReveal delay={0} className="flex justify-center lg:justify-end order-2 lg:order-1 lg:mt-24">
             <div className="rounded-apple overflow-hidden shadow-apple-lg w-full max-w-[500px]">
                <Image
                  src="/images/almudena-profile.avif"
                  alt="Almudena Marchesi, psicóloga clínica en su consulta de Moncloa, Madrid"
                  width={600}
                  height={600}
                  className="w-full object-cover aspect-square object-top"
                  unoptimized={true}
                  sizes="(min-width: 1024px) 40vw, 90vw"
                />
             </div>
          </ScrollReveal>

          {/* Texto */}
          <div className="order-1 lg:order-2">
            <ScrollReveal delay={0.1}>
              <span className="font-mono text-label-sm uppercase tracking-[0.14em] text-sage dark:text-white/70 mb-4 block">
                Sobre Mí
              </span>
            </ScrollReveal>
            <ScrollReveal delay={0.2}>
              <TextAnimation
                as="h2"
                text="Metodología integradora adaptada a tu historia."
                classname="font-display text-4xl md:text-5xl text-ink dark:text-white leading-tight mb-8"
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
            <ScrollReveal delay={0.3}>
              <TextAnimation
                as="p"
                text="Mi enfoque clínico se basa en un modelo integrador, donde utilizo diferentes herramientas avaladas científicamente para entender tu problema desde todas sus perspectivas."
                classname="text-body-lg text-ink-soft dark:text-white/80 mb-8 leading-relaxed"
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

            <ScrollReveal delay={0.4}>
              <PremiumCard tilt={false} className="mb-6">
                <div className="p-6 md:p-8">
                  <TextAnimation
                    as="h3"
                    text="Formación Académica"
                    classname="font-display text-xl text-ink mb-4 text-center"
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      visible: {
                        opacity: 1,
                        y: 0,
                        transition: { ease: 'linear' },
                      },
                    }}
                  />
                  <ul className="space-y-3 text-ink-soft font-body text-sm">
                    <li className="flex items-start gap-3"><span className="text-sage mt-1 shrink-0">•</span> Licenciada en Psicología. Universidad Francisco de Vitoria</li>
                    <li className="flex items-start gap-3"><span className="text-sage mt-1 shrink-0">•</span> Máster En Psicologia General Sanitaria. Universidad Francisco de Vitoria</li>
                    <li className="flex items-start gap-3"><span className="text-sage mt-1 shrink-0">•</span> Experta en Terapia Sistémica. Terapia familiar y de pareja. Universidad Francisco de Vitoria</li>
                    <li className="flex items-start gap-3"><span className="text-sage mt-1 shrink-0">•</span> Experta en Psicoterapia Integradora. Trauma, Apego y EMDR. Instituto Español de Psicoterapia Integradora</li>
                    <li className="flex items-start gap-3"><span className="text-sage mt-1 shrink-0">•</span> Formación en Terapia Basada en la Mentalización</li>
                  </ul>
                </div>
              </PremiumCard>
            </ScrollReveal>

            <ScrollReveal delay={0.5}>
              <PremiumCard tilt={false}>
                <div className="p-6 md:p-8">
                  <TextAnimation
                    as="h3"
                    text="Recorrido Clínico"
                    classname="font-display text-xl text-ink mb-4 text-center"
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      visible: {
                        opacity: 1,
                        y: 0,
                        transition: { ease: 'linear' },
                      },
                    }}
                  />
                  <ul className="space-y-3 text-ink-soft font-body text-sm">
                    <li className="flex items-start gap-3"><span className="text-warm mt-1 shrink-0">•</span> Práctica privada en Moncloa</li>
                    <li className="flex items-start gap-3"><span className="text-warm mt-1 shrink-0">•</span> Colaboración en centros de salud mental</li>
                    <li className="flex items-start gap-3"><span className="text-warm mt-1 shrink-0">•</span> Colaboración en recursos sociales de atención a la salud mental</li>
                  </ul>
                </div>
              </PremiumCard>
            </ScrollReveal>

            <ScrollReveal delay={0.6} className="mt-8">
              <Link href="/sobre-mi" className="btn-secondary">
                Conocer más sobre mí
              </Link>
            </ScrollReveal>
          </div>

        </div>
      </div>
    </section>
  );
}
