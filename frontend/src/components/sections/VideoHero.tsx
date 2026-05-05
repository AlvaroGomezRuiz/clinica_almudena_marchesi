'use client';

import React from 'react';
import Link from 'next/link';
import { BlurVignette, BlurVignetteArticle } from '@/components/ui/blur-vignette';
import ScrollReveal from '@/components/landing/ScrollReveal';

export default function VideoHero() {
  return (
    <section className="h-[100dvh] w-full bg-canvas sticky top-0 overflow-hidden">
      <BlurVignette
        radius="0px"
        inset="20px"
        transitionLength="150px"
        blur="25px"
        classname="h-full w-full"
      >
        <video
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover opacity-80"
        >
          {/* Vídeo proporcionado por el usuario (Pixabay) */}
          <source
            src="https://cdn.pixabay.com/video/2023/10/19/185726-876210695_large.mp4"
            type="video/mp4"
          />
        </video>
        
        <BlurVignetteArticle>
          <div className="flex flex-col items-center justify-center h-full px-6 md:px-12 text-center relative z-10">
            <ScrollReveal>
              <span className="inline-block font-mono text-label-sm uppercase tracking-[0.14em] text-white/80 px-4 py-1.5 rounded-pill border border-white/20 bg-black/20 backdrop-blur-sm mb-8">
                Psicología Clínica · Moncloa
              </span>
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <h1 className="font-display text-display-1 text-white text-balance mb-6 drop-shadow-lg">
                Un espacio para acompañarte{' '}
                <span className="italic">en tu proceso</span>.
              </h1>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <p className="text-body-lg text-white/90 max-w-2xl mx-auto mb-10 leading-relaxed text-pretty drop-shadow-md">
                Acompaño a personas en sus procesos de cambio y crecimiento personal. Soy psicóloga y en mi consulta de Moncloa encontrarás un espacio seguro, tranquilo y confidencial, donde poder parar, escucharte y trabajar en tu bienestar.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.3}>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/contacto" className="bg-white text-ink font-body font-medium px-7 py-3.5 rounded-pill hover:bg-white/90 transition-colors shadow-lg">
                  Contactar
                </Link>
                <Link href="/enfoque" className="bg-black/30 backdrop-blur-md text-white font-body font-medium px-7 py-3.5 rounded-pill border border-white/30 hover:bg-black/40 transition-colors">
                  Conoce mi enfoque
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </BlurVignetteArticle>
      </BlurVignette>
    </section>
  );
}
