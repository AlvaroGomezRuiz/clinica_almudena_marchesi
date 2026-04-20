"use client";

import React, { useState, useEffect, useId, useRef } from "react";
import TiltCard from "@/components/landing/TiltCard";
import { BorderBeam } from "border-beam";
import { useTheme } from "next-themes";

interface PremiumCardProps {
  children: React.ReactNode;
  className?: string;
  tilt?: boolean;
  active?: boolean;
  onClick?: () => void;
}

export default function PremiumCard({ children, className = "", tilt = true, active, onClick }: PremiumCardProps) {
  const [internalActive, setInternalActive] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);
  const divRef = useRef<HTMLDivElement>(null);
  
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const cardId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isActive = active !== undefined ? active : internalActive;
  const isVisuallyActive = isActive || isHovered;

  useEffect(() => {
    if (active !== undefined) return;
    const handleCardActivated = (e: CustomEvent) => {
      if (e.detail.cardId !== cardId) {
        setInternalActive(false);
      }
    };
    window.addEventListener("premiumCardActivated", handleCardActivated as EventListener);
    return () => {
      window.removeEventListener("premiumCardActivated", handleCardActivated as EventListener);
    };
  }, [cardId, active]);

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick();
    }
    if (active === undefined) {
      if (!internalActive) {
        setInternalActive(true);
        window.dispatchEvent(new CustomEvent("premiumCardActivated", { detail: { cardId } }));
      } else {
        setInternalActive(false);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const currentTheme = mounted && resolvedTheme === 'light' ? 'light' : 'dark';
  
  const spotlightColor = currentTheme === 'light' 
    ? 'rgba(0, 0, 0, 0.03)' 
    : 'rgba(255, 255, 255, 0.05)';

  const innerContent = (
    <>
      {/* Layer 0: Spotlight flashlight effect */}
      <div
        className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-500 ease-in-out rounded-3xl"
        style={{
          opacity,
          background: `radial-gradient(500px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 60%)`,
        }}
      />

      {/* Layer 1: Liquid Glass Background */}
      <div className="absolute inset-0 rounded-3xl border border-white/10 dark:border-white/5 bg-white/20 dark:bg-black/30 backdrop-blur-2xl pointer-events-none z-0" />

      {/* Layer 2: BorderBeam and Content */}
      {mounted && (
        <BorderBeam 
          colorVariant={isVisuallyActive ? "sunset" : "mono"} 
          size="md" 
          duration={4}
          strength={isVisuallyActive ? 1 : 0.8}
          brightness={resolvedTheme === 'light' ? 1.8 : 1.3}
          theme={currentTheme}
          className="h-full rounded-3xl transition-all duration-500 relative z-10"
        >
          <div className="h-full rounded-3xl bg-transparent relative z-10">
            {children}
          </div>
        </BorderBeam>
      )}
      {!mounted && (
        <div className="h-full rounded-3xl bg-transparent relative z-10">
          {children}
        </div>
      )}
    </>
  );

  return (
    <div 
      ref={divRef}
      className={`relative cursor-pointer group h-full ${className}`}
      onClick={handleClick}
      onMouseEnter={() => { setIsHovered(true); setOpacity(1); }}
      onMouseLeave={() => { setIsHovered(false); setOpacity(0); }}
      onMouseMove={handleMouseMove}
    >
      {tilt ? (
        <TiltCard className="rounded-3xl h-full shadow-editorial transition-transform will-change-transform relative">
          {innerContent}
        </TiltCard>
      ) : (
        <div className="rounded-3xl h-full shadow-editorial relative">
          {innerContent}
        </div>
      )}
    </div>
  );
}
