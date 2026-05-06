'use client';

import { cn } from '@/lib/utils';
import React from 'react';

interface BlurVignetteProps {
  children: React.ReactNode;
  classname?: string;
  radius?: string;
  inset?: string;
  transitionLength?: string;
  blur?: string;
}

export function BlurVignette({
  children,
  classname,
  radius = '24px',
}: BlurVignetteProps) {
  return (
    <div
      className={cn('relative', classname)}
      style={{
        borderRadius: radius,
        // Difuminado ovalado (no cuadrado), que se desvanece hasta un 20% de opacidad (no totalmente transparente) 
        // para que no quede un borde blanco puro, sino más translúcido dejando ver algo de vídeo.
        maskImage: `radial-gradient(ellipse 100% 100% at 50% 50%, black 45%, rgba(0,0,0, 0.15) 100%)`,
      }}
    >
      {/* Eliminamos el div del shadow blanco duro para que sólo actúe el fade natural de la máscara */}
      {children}
    </div>
  );
}

export function BlurVignetteArticle({ children }: { children?: React.ReactNode }) {
  return <div className="absolute inset-0 z-20 flex flex-col">{children}</div>;
}
