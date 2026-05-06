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
    <section className="relative h-[100dvh] w-full bg-transparent">
      {/* 
        Vídeo fijo en el fondo de la pantalla.
        Al no tener clip-path y estar en un contenedor transparente,
        actuará como fondo para toda la web.
      */}
      <div className="fixed inset-0 w-full h-[100dvh] -z-10">
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
              <source src="/videos/hero-nature.mp4" type="video/mp4" />
            </video>
            {/* Overlay oscuro para legibilidad */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/5 to-black/20 md:from-black/30 md:via-transparent md:to-black/40 z-[5]" />
          </BlurVignette>
        </div>
      
      {/* Contenido (Letras) que sí hace scroll de forma natural */}
      <div className="relative h-full w-full z-10 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center justify-center h-full px-6 md:px-12 text-center w-full pt-32 md:pt-0">
            {/* Elementos del hero con CSS animation (portal-rise) — NO ScrollReveal */}
            <span className="portal-rise inline-block font-mono text-label-sm uppercase tracking-[0.14em] text-white/90 px-4 py-1.5 rounded-pill border border-white/20 bg-white/10 backdrop-blur-md mb-8 shadow-sm">
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
              <Link href="/contacto" className="bg-white/10 backdrop-blur-md text-white font-body font-medium px-8 py-3.5 rounded-pill border border-white/20 hover:bg-white/20 transition-all shadow-lg hover:shadow-xl">
                Contactar
              </Link>
              <Link href="/enfoque" className="bg-black/30 backdrop-blur-md text-white font-body font-medium px-8 py-3.5 rounded-pill border border-white/20 hover:bg-black/50 transition-all shadow-lg hover:shadow-xl">
                Conoce mi enfoque
              </Link>
            </div>

            <div className="portal-rise portal-rise-delay-4">
              <StatsRow variant="light" autoStart={true} />
            </div>
          </div>
        </div>
    </section>
  );
}
