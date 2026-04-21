"use client";
import React, { useRef, useState, MouseEvent } from "react";

interface SpotlightProps {
  children: React.ReactNode;
  className?: string;
  size?: number;
  color?: string;
}

export function Spotlight({
  children,
  className = "",
  size = 400,
  color = "rgba(255, 255, 255, 0.03)",
}: SpotlightProps) {
  return (
    <div className={`group/spotlight relative ${className}`}>
      {children}
    </div>
  );
}

interface SpotLightItemProps {
  children: React.ReactNode;
  className?: string;
  size?: number;
  color?: string;
}

export function SpotLightItem({
  children,
  className = "",
  size = 400,
  color = "rgba(255, 255, 255, 0.05)",
}: SpotLightItemProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={`relative overflow-hidden ${className}`}
    >
      <div
        className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-500 ease-in-out"
        style={{
          opacity,
          background: `radial-gradient(${size}px circle at ${position.x}px ${position.y}px, ${color}, transparent 100%)`,
        }}
      />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}
