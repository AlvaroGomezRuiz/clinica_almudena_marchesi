"use client";

import { useMemo, useRef } from "react";

type TiltCardProps = {
  className?: string;
  children: React.ReactNode;
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function canHoverFinePointer(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover:hover) and (pointer:fine)").matches;
}

export default function TiltCard({ className, children }: TiltCardProps): JSX.Element {
  const ref = useRef<HTMLDivElement | null>(null);
  const enabled = useMemo(() => canHoverFinePointer(), []);

  return (
    <div
      ref={ref}
      className={className}
      onMouseMove={(e) => {
        if (!enabled) return;
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
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
      {children}
    </div>
  );
}

