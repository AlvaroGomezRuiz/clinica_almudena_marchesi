'use client';

import React from 'react';
import TextAnimation from '@/components/ui/scroll-text';
import Link from 'next/link';

export default function ContactoSummarySection() {
  return (
    <section className="w-full bg-transparent text-white overflow-hidden flex flex-col justify-center px-6 md:px-12 py-16 md:py-24 z-40">
      
      <div className="max-w-4xl mx-auto w-full relative z-10 text-center">
        <TextAnimation
          as="h2"
          text="Tu bienestar empieza aquí."
          classname="font-display text-5xl md:text-7xl leading-tight mb-8 text-white"
        />
        <p className="text-white/80 text-lg mb-12 max-w-2xl mx-auto">
          Reserva una primera sesión para explorar cómo este enfoque puede ayudarte en tu momento actual.
        </p>

        <div className="flex flex-col sm:flex-row gap-6 justify-center">
          <Link 
            href="/contacto" 
            className="bg-white text-sage font-body font-medium px-8 py-4 rounded-pill hover:scale-105 transition-transform shadow-xl"
          >
            Contactar ahora
          </Link>
          <a 
            href="https://maps.google.com/?q=Meléndez+Valdés" 
            target="_blank" 
            rel="noreferrer" 
            className="bg-sage-mid/30 backdrop-blur-sm border border-white/20 text-white font-body font-medium px-8 py-4 rounded-pill hover:bg-sage-mid/50 transition-colors"
          >
            Ver ubicación en mapa
          </a>
        </div>
      </div>
    </section>
  );
}
