'use client';

import { useRef, useState, useEffect, useMemo, useId } from 'react';

type LiquidGlassProps = {
  children?: React.ReactNode;
  className?: string;
  /** Border radius in px. Default 999 (pill) */
  radius?: number;
  /** Displacement scale — controls refraction intensity. Default 120 */
  scale?: number;
  /** Chromatic dispersion amount. Default 30 */
  dispersion?: number;
  /** Inner lightness 0–100. Default 53 */
  lightness?: number;
  /** Alpha of inner fill. Default 0.9 */
  alpha?: number;
  /** Gaussian blur on displacement. Default 0.38 */
  displace?: number;
  /** SVG blur on inner rect. Default 5 */
  blur?: number;
  /** Border width ratio 0–0.5. Default 0.05 */
  border?: number;
  /** Frost opacity 0–1. Default 0.1 */
  frost?: number;
  /** Border gradient color. Default rgba(120,120,120,0.7) */
  borderColor?: string;
  style?: React.CSSProperties;
};

/**
 * Apple-style Liquid Glass component using SVG feDisplacementMap filters.
 * Creates a true chromatic aberration glass refraction effect behind the element.
 * Ported from the Framer LiquidGlass component.
 */
export default function LiquidGlass({
  children,
  className = '',
  radius = 999,
  scale = 120,
  dispersion = 30,
  lightness = 53,
  alpha = 0.9,
  displace = 0.38,
  blur = 5,
  border = 0.05,
  frost = 0.1,
  borderColor = 'rgba(120, 120, 120, 0.7)',
  style,
}: LiquidGlassProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 200 });
  const uniqueFilterId = useId();
  const filterId = `liquid-glass-${uniqueFilterId}`;

  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (!containerRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      setDimensions({ width, height });
    };

    updateDimensions();
    const observer = new ResizeObserver(updateDimensions);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const displacementDataUri = useMemo(() => {
    const { width, height } = dimensions;
    const halfW = width / 2;
    const halfH = height / 2;
    const borderPx = Math.min(halfW, halfH) * (border * 0.5);
    const effectiveRadius = Math.min(radius, width / 2, height / 2);

    const svg = `
      <svg viewBox="0 0 ${halfW} ${halfH}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="red" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stop-color="#0000"/>
            <stop offset="100%" stop-color="red"/>
          </linearGradient>
          <linearGradient id="blue" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#0000"/>
            <stop offset="100%" stop-color="blue"/>
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="${halfW}" height="${halfH}" fill="black"/>
        <rect x="0" y="0" width="${halfW}" height="${halfH}" rx="${effectiveRadius}" fill="url(#red)" />
        <rect x="0" y="0" width="${halfW}" height="${halfH}" rx="${effectiveRadius}" fill="url(#blue)" style="mix-blend-mode: difference" />
        <rect x="${borderPx}" y="${borderPx}" width="${halfW - borderPx * 2}" height="${halfH - borderPx * 2}" rx="${effectiveRadius}" fill="hsl(0 0% ${lightness}% / ${alpha})" style="filter:blur(${blur}px)" />
      </svg>
    `;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }, [dimensions, radius, border, lightness, alpha, blur]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: 'relative', ...style }}
    >
      {/* SVG Filter Glass Layer */}
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: radius,
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          background: `hsl(0 0% 100% / ${frost})`,
          backdropFilter: `url(#${filterId})`,
          WebkitBackdropFilter: `url(#${filterId})`,
        }}
      >
        <svg
          style={{
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            position: 'absolute',
            inset: 0,
          }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id={filterId} colorInterpolationFilters="sRGB">
              <feImage
                href={displacementDataUri}
                x="0"
                y="0"
                width="100%"
                height="100%"
                result="map"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="map"
                scale={scale + dispersion}
                xChannelSelector="R"
                yChannelSelector="B"
                result="dispRed"
              />
              <feColorMatrix
                in="dispRed"
                type="matrix"
                values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0"
                result="red"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="map"
                scale={scale + dispersion}
                xChannelSelector="R"
                yChannelSelector="B"
                result="dispGreen"
              />
              <feColorMatrix
                in="dispGreen"
                type="matrix"
                values="0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0"
                result="green"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="map"
                scale={scale + dispersion}
                xChannelSelector="R"
                yChannelSelector="B"
                result="dispBlue"
              />
              <feColorMatrix
                in="dispBlue"
                type="matrix"
                values="0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0"
                result="blue"
              />
              <feBlend in="red" in2="green" mode="screen" result="rg" />
              <feBlend in="rg" in2="blue" mode="screen" result="output" />
              <feGaussianBlur in="output" stdDeviation={displace} />
            </filter>
          </defs>
        </svg>
      </div>

      {/* Gradient Border (Apple edge light refraction) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: radius,
          zIndex: 1,
          pointerEvents: 'none',
          background: `linear-gradient(315deg, ${borderColor} 0%, rgba(120,120,120,0) 30%, rgba(120,120,120,0) 70%, ${borderColor} 100%) border-box`,
          mask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
          maskComposite: 'exclude',
          WebkitMaskComposite: 'xor',
          border: '1px solid transparent',
        }}
      />

      {/* Content sits above the glass */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        {children}
      </div>
    </div>
  );
}
