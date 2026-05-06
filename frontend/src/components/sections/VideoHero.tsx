'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import TextAnimation from '@/components/ui/scroll-text';
import { BlurVignette, BlurVignetteArticle } from '@/components/ui/blur-vignette';
import StatsRow from '@/components/landing/StatsRow';

const BASE_URL = 'https://koxsikkobjlycqqfstye.supabase.co/storage/v1/object/public/videos/bg-';
const VIDEOS = Array.from({ length: 20 }, (_, i) => i + 1)
  .filter(num => num !== 9)
  .map(num => `${BASE_URL}${String(num).padStart(2, '0')}.mp4`);

/**
 * VideoHero — Hero principal con vídeo de fondo rotatorio.
 * NO usa ScrollReveal en los textos iniciales porque es el first-fold
 * y los elementos son visibles inmediatamente.
 */
export default function VideoHero() {
  const [videoSrc, setVideoSrc] = useState<string>('');

  useEffect(() => {
    // Escoger vídeo aleatorio sin repetir el de la última carga
    const lastVideo = sessionStorage.getItem('lastBgVideo');
    let available = VIDEOS;
    if (lastVideo && VIDEOS.includes(lastVideo)) {
      available = VIDEOS.filter(v => v !== lastVideo);
    }
    const randomIndex = Math.floor(Math.random() * available.length);
    const selected = available[randomIndex];
    
    sessionStorage.setItem('lastBgVideo', selected);
    setVideoSrc(selected);
  }, []);

  return (
    <section className="relative h-[100dvh] w-full bg-transparent">
      {/* 
        Vídeo fijo en el fondo de la pantalla.
        Al no tener clip-path y estar en un contenedor transparente,
        actuará como fondo para toda la web.
      */}
      <div className="fixed inset-0 w-full h-[100dvh] -z-10 bg-[#131514]">
        {videoSrc && (
          <video
            key={videoSrc}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className="w-full h-full object-cover opacity-80"
            src={videoSrc}
          />
        )}
        {/* Overlay oscuro para legibilidad (GPU friendly) */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/5 to-black/20 md:from-black/30 md:via-transparent md:to-black/40 z-[5]" />
      </div>
      
      {/* Contenido (Letras) que sí hace scroll de forma natural */}
      <div className="relative h-full w-full z-10 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center justify-center h-full px-6 md:px-12 text-center w-full mt-28 md:mt-0">
            {/* Elementos del hero con CSS animation (portal-rise) para la píldora, pero TextAnimation para los textos */}
            <span className="portal-rise inline-block font-mono text-label-sm uppercase tracking-[0.14em] text-white/90 px-4 py-1.5 rounded-pill border border-white/20 bg-white/10 backdrop-blur-md mb-8 shadow-sm">
              Psicología Clínica · Moncloa
            </span>

            <TextAnimation
              as="h1"
              text="Un espacio para acompañarte en tu proceso."
              classname="font-display text-display-1 text-white text-balance mb-6 drop-shadow-lg"
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
              text="Acompaño a personas en sus procesos de cambio y crecimiento personal. Soy psicóloga y en mi consulta de Moncloa encontrarás un espacio seguro, tranquilo y confidencial, donde poder parar, escucharte y trabajar en tu bienestar."
              classname="text-body-lg text-white/90 max-w-2xl mx-auto mb-10 leading-relaxed text-pretty drop-shadow-md"
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.2 },
                },
              }}
            />

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
