'use client';

import React from 'react';
import TextAnimation from '@/components/ui/scroll-text';
import Image from 'next/image';
import PremiumCard from '@/components/ui/PremiumCard';
import Link from 'next/link';

export default function SobreMiSummarySection() {
  return (
    <section className="w-full bg-transparent overflow-hidden flex flex-col justify-center px-6 md:px-12 py-16 md:py-24 z-20">

      <div className="max-w-7xl mx-auto w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          
          {/* Foto — primera en móvil para dar contexto visual */}
          <div className="flex justify-center lg:justify-start order-2 lg:order-1">
             <div className="rounded-apple overflow-hidden shadow-apple-lg max-w-sm w-full">
                <Image
                  src="/images/almudena-profile.avif"
                  alt="Almudena Marchesi, psicóloga clínica en su consulta de Moncloa, Madrid"
                  width={500}
                  height={650}
                  className="w-full object-cover aspect-[3/4] object-top"
                  loading="lazy"
                  sizes="(min-width: 1024px) 30vw, 80vw"
                />
             </div>
          </div>

          {/* Texto */}
          <div className="order-1 lg:order-2">
            <span className="font-mono text-label-sm uppercase tracking-[0.14em] text-sage mb-4 block">
              Sobre Mí
            </span>
            <TextAnimation
              as="h2"
              text="Metodología integradora adaptada a tu historia."
              classname="font-display text-4xl md:text-5xl text-ink leading-tight mb-8"
              variants={{
                hidden: { filter: 'blur(8px)', opacity: 0, y: 20 },
                visible: { filter: 'blur(0px)', opacity: 1, y: 0, transition: { duration: 0.5 } }
              }}
            />
            <p className="text-body-lg text-ink-soft mb-8 leading-relaxed">
              Enfoque integrador y sistémico: una terapia adaptada a ti, que tiene en cuenta tanto tu mundo interno como tus relaciones y tu contexto.
            </p>

            <PremiumCard tilt={false} className="mb-6">
              <div className="p-6 md:p-8">
                <h3 className="font-display text-xl text-ink mb-4 text-center">Formación Académica</h3>
                <ul className="space-y-3 text-ink-soft font-body text-sm">
                  <li className="flex items-start gap-3"><span className="text-sage mt-1 shrink-0">•</span> Licenciada en Psicología. Universidad Francisco de Vitoria</li>
                  <li className="flex items-start gap-3"><span className="text-sage mt-1 shrink-0">•</span> Máster En Psicologia General Sanitaria. Universidad Francisco de Vitoria</li>
                  <li className="flex items-start gap-3"><span className="text-sage mt-1 shrink-0">•</span> Experta en Terapia Sistémica. Terapia familiar y de pareja. Universidad Francisco de Vitoria</li>
                  <li className="flex items-start gap-3"><span className="text-sage mt-1 shrink-0">•</span> Experta en Psicoterapia Integradora. Trauma, Apego y EMDR. Instituto Español de Psicoterapia Integradora</li>
                  <li className="flex items-start gap-3"><span className="text-sage mt-1 shrink-0">•</span> Formación en Terapia Basada en la Mentalización</li>
                </ul>
              </div>
            </PremiumCard>

            <PremiumCard tilt={false}>
              <div className="p-6 md:p-8">
                <h3 className="font-display text-xl text-ink mb-4 text-center">Recorrido Clínico</h3>
                <ul className="space-y-3 text-ink-soft font-body text-sm">
                  <li className="flex items-start gap-3"><span className="text-warm mt-1 shrink-0">•</span> Práctica privada en Moncloa</li>
                  <li className="flex items-start gap-3"><span className="text-warm mt-1 shrink-0">•</span> Colaboración en centros de salud mental</li>
                  <li className="flex items-start gap-3"><span className="text-warm mt-1 shrink-0">•</span> Colaboración en recursos sociales de atención a la salud mental</li>
                </ul>
              </div>
            </PremiumCard>

            <div className="mt-8">
              <Link href="/sobre-mi" className="btn-secondary">
                Conocer más sobre mí
              </Link>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
