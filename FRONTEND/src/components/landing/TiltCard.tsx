"use client";

import { useMemo, useRef } from "react";

type TiltCardProps = {
  className?: string;
  children: React.ReactNode;
  spotlightColor?: string;
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function canHoverFinePointer(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover:hover) and (pointer:fine)").matches;
}

export default function TiltCard({ 
  className, 
  children, 
  spotlightColor = "rgba(255, 255, 255, 0.06)" 
}: TiltCardProps): JSX.Element {
  const ref = useRef<HTMLDivElement | null>(null);
  const spotlightRef = useRef<HTMLDivElement | null>(null);
  const enabled = useMemo(() => canHoverFinePointer(), []);

  return (
    <div
      ref={ref}
      className={`group relative overflow-hidden ${className || ""}`}
      onMouseMove={(e) => {
        if (!enabled) return;
        const el = ref.current;
        if (!el) return;
        
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Optimized Spotlight (No React State)
        if (spotlightRef.current) {
          spotlightRef.current.style.background = `radial-gradient(400px circle at ${x}px ${y}px, ${spotlightColor}, transparent 80%)`;
        }

        // Optimized Tilt (No React State)
        const px = x / rect.width;
        const py = y / rect.height;
        const rotY = clamp((px - 0.5) * 10, -5, 5);
        const rotX = clamp((0.5 - py) * 10, -5, 5);
        el.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-2px)`;
      }}
      onMouseLeave={() => {
        const el = ref.current;
        if (!el) return;
        el.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0px)";
      }}
      style={{ transform: "perspective(900px) rotateX(0deg) rotateY(0deg)" }}
    >
      <div
        ref={spotlightRef}
        className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        aria-hidden="true"
      />
      <div className="relative z-10 h-full w-full">
        {children}
      </div>
    </div>
  );
}

