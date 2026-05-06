'use client';

import React from 'react';
import Link from 'next/link';
import { BlurVignette, BlurVignetteArticle } from '@/components/ui/blur-vignette';
import StatsRow from '@/components/landing/StatsRow';

/**
 * VideoHero — Hero principal con vídeo de fondo.
 * NO usa ScrollReveal en los textos iniciales porque es el first-fold
 * y los elementos son visibles inmediatamente. Usar ScrollReveal aquí
 * causa problemas con IntersectionObserver en secciones sticky (opacity:0 stuck).
 * Se usan animaciones CSS nativas con portal-rise para la entrada.
 */
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
          preload="metadata"
          className="w-full h-full object-cover"
        >
          {/* Vídeo de naturaleza serena — Pexels License (libre de derechos), self-hosted */}
          <source
            src="/videos/hero-nature.mp4"
            type="video/mp4"
          />
        </video>

        {/* Overlay oscuro para garantizar contraste WCAG sobre el vídeo */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/35 to-black/55 z-[5]" />
        
        <BlurVignetteArticle>
          <div className="flex flex-col items-center justify-center h-full px-6 md:px-12 text-center relative z-10">
            {/* Elementos del hero con CSS animation (portal-rise) — NO ScrollReveal */}
            <span className="portal-rise inline-block font-mono text-label-sm uppercase tracking-[0.14em] text-white/80 px-4 py-1.5 rounded-pill border border-white/20 bg-black/20 backdrop-blur-sm mb-8">
              Psicología Clínica · Moncloa
            </span>

            <h1 className="portal-rise portal-rise-delay-1 font-display text-display-1 text-white text-balance mb-6 drop-shadow-lg">
              Un espacio para acompañarte{' '}
              <span className="italic">en tu proceso</span>.
            </h1>

            <p className="portal-rise portal-rise-delay-2 text-body-lg text-white/90 max-w-2xl mx-auto mb-10 leading-relaxed text-pretty drop-shadow-md">
              Acompaño a personas en sus procesos de cambio y crecimiento personal. Soy psicóloga y en mi consulta de Moncloa encontrarás un espacio seguro, tranquilo y confidencial, donde poder parar, escucharte y trabajar en tu bienestar.
            </p>

            <div className="portal-rise portal-rise-delay-3 flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="/contacto" className="bg-white text-ink font-body font-medium px-7 py-3.5 rounded-pill hover:bg-white/90 transition-colors shadow-lg">
                Contactar
              </Link>
              <Link href="/enfoque" className="bg-black/30 backdrop-blur-md text-white font-body font-medium px-7 py-3.5 rounded-pill border border-white/30 hover:bg-black/40 transition-colors">
                Conoce mi enfoque
              </Link>
            </div>

            <div className="portal-rise portal-rise-delay-4">
              <StatsRow variant="light" autoStart={true} />
            </div>
          </div>
        </BlurVignetteArticle>
      </BlurVignette>
    </section>
  );
}
