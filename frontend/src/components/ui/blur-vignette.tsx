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
  inset = '10px',
  transitionLength = '100px',
  blur = '15px',
}: BlurVignetteProps) {
  return (
    <div
      className={cn('relative', classname)}
      style={{
        borderRadius: radius,
        maskImage: `linear-gradient(to bottom, transparent, black ${transitionLength}, black calc(100% - ${transitionLength}), transparent), linear-gradient(to right, transparent, black ${transitionLength}, black calc(100% - ${transitionLength}), transparent)`,
        maskComposite: 'intersect',
      }}
    >
      <div
        className="absolute inset-0 z-10 pointer-events-none opacity-15 shadow-[inset_0_0_15px_0px_var(--color-canvas)] md:shadow-[inset_0_0_var(--bv-blur)_var(--bv-inset)_var(--color-canvas)]"
        style={{
          '--bv-blur': blur,
          '--bv-inset': inset,
        } as React.CSSProperties}
      />
      {children}
    </div>
  );
}

export function BlurVignetteArticle({ children }: { children?: React.ReactNode }) {
  return <div className="absolute inset-0 z-20 flex flex-col">{children}</div>;
}
