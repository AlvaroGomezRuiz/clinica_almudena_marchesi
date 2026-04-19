'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import Image from 'next/image';

type Photo3DProps = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  /** Maximum rotation angle in degrees. Default 12 */
  maxRotation?: number;
  priority?: boolean;
};

/**
 * Apple-style 3D rotating photo with depth background.
 * The image gently rotates around the Y-axis as you scroll,
 * with a frosted depth panel behind it for enhanced 3D perception.
 */
export default function Photo3D({
  src,
  alt,
  width = 600,
  height = 800,
  className = '',
  maxRotation = 12,
  priority = false,
}: Photo3DProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  /* Desktop: smooth Y-axis rotation mapped to scroll progress */
  const rotateY = useTransform(
    scrollYProgress,
    [0, 0.3, 0.5, 0.7, 1],
    [maxRotation, maxRotation * 0.4, 0, -maxRotation * 0.4, -maxRotation]
  );

  /* Subtle scale for depth feeling */
  const scale = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    [0.92, 1, 0.92]
  );

  /* Parallax Y offset */
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    [30, -30]
  );

  /* Background depth panel moves slower for parallax effect */
  const bgY = useTransform(
    scrollYProgress,
    [0, 1],
    [15, -15]
  );

  const bgRotateY = useTransform(
    scrollYProgress,
    [0, 0.3, 0.5, 0.7, 1],
    [maxRotation * 0.6, maxRotation * 0.25, 0, -maxRotation * 0.25, -maxRotation * 0.6]
  );

  if (reduceMotion) {
    return (
      <div className={`relative ${className}`}>
        {/* Depth background */}
        <div
          className="absolute -inset-4 md:-inset-6 rounded-[2rem] -z-10"
          style={{
            background: 'linear-gradient(135deg, rgba(200,217,207,0.15) 0%, rgba(232,221,208,0.12) 50%, rgba(200,217,207,0.08) 100%)',
            border: '1px solid rgba(200,217,207,0.15)',
          }}
        />
        <div className="overflow-hidden rounded-apple">
          <Image
            src={src}
            alt={alt}
            width={width}
            height={height}
            className="w-full h-full object-cover"
            priority={priority}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={`relative ${className}`}
      style={{ perspective: '1200px' }}
    >
      {/* Depth Background Panel — sits behind the photo, moves slower */}
      <motion.div
        className="absolute -inset-4 md:-inset-6 lg:-inset-8 rounded-[2rem] -z-10"
        style={{
          rotateY: bgRotateY,
          y: bgY,
          transformStyle: 'preserve-3d',
          background: 'linear-gradient(135deg, rgba(200,217,207,0.15) 0%, rgba(232,221,208,0.12) 50%, rgba(200,217,207,0.08) 100%)',
          backdropFilter: 'blur(20px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
          border: '1px solid rgba(200,217,207,0.18)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.2)',
        }}
      />

      {/* Main Photo Card */}
      <motion.div
        className="relative overflow-hidden rounded-apple shadow-apple-lg"
        style={{
          rotateY,
          scale,
          y,
          transformStyle: 'preserve-3d',
          willChange: 'transform',
        }}
      >
        {/* Inner glass reflection */}
        <div className="absolute inset-0 z-10 pointer-events-none rounded-apple"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 50%, rgba(0,0,0,0.04) 100%)',
          }}
        />
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          className="w-full h-auto object-cover rounded-apple"
          priority={priority}
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      </motion.div>
    </div>
  );
}
