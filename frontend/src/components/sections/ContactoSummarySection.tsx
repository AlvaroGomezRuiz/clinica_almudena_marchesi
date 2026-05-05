'use client';

import React from 'react';
import TextAnimation from '@/components/ui/scroll-text';
import Link from 'next/link';

export default function ContactoSummarySection() {
  return (
    <section className="min-h-[100dvh] w-full bg-sage text-white sticky top-0 rounded-t-3xl overflow-hidden flex flex-col justify-center px-6 md:px-12 z-40">
      <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#ffffff1a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff1a_1px,transparent_1px)] bg-[size:54px_54px] pointer-events-none" />
      
      <div className="max-w-4xl mx-auto w-full relative z-10 text-center">
        <TextAnimation
          as="h2"
          text="Tu bienestar empieza aquí."
          classname="font-display text-5xl md:text-7xl leading-tight mb-8"
        />
        <p className="text-white/80 text-lg mb-12 max-w-2xl mx-auto">
          Reserva una primera sesión para explorar cómo este enfoque puede ayudarte en tu momento actual.
        </p>

        <div className="flex flex-col sm:flex-row gap-6 justify-center">
          <Link href="/contacto" className="bg-white text-sage font-body font-medium px-8 py-4 rounded-pill hover:scale-105 transition-transform shadow-xl">
            Contactar ahora
          </Link>
          <a href="https://maps.google.com/?q=Meléndez+Valdés" target="_blank" rel="noreferrer" className="bg-sage-mid/30 backdrop-blur-sm border border-white/20 text-white font-body font-medium px-8 py-4 rounded-pill hover:bg-sage-mid/50 transition-colors">
            Ver ubicación en mapa
          </a>
        </div>
      </div>
    </section>
  );
}
