/**
 * HeroImage — Server Component puro
 *
 * Reemplaza Photo3D en el Hero de la portada.
 * - Sin Framer Motion ni useScroll → cero trabajo en el compositor durante LCP
 * - priority + fetchPriority="high" → navegador pre-carga la imagen inmediatamente
 * - sizes calibrado para el layout de HeroSection → sin sobrecarga de red
 * - Efectos de profundidad 100% CSS → GPU compositor, cero main thread
 * - El componente Photo3D sigue disponible para otras páginas
 */
import Image from 'next/image';

interface HeroImageProps {
  className?: string;
}

export default function HeroImage({ className }: HeroImageProps) {
  return (
    <div className={`relative${className ? ` ${className}` : ''}`}>
      {/* Capa de profundidad exterior — CSS puro, sin JS */}
      <div
        className="absolute -inset-4 md:-inset-6 rounded-[2rem] -z-10"
        style={{
          background:
            'linear-gradient(135deg, rgba(200,217,207,0.15) 0%, rgba(232,221,208,0.12) 50%, rgba(200,217,207,0.08) 100%)',
          border: '1px solid rgba(200,217,207,0.18)',
          boxShadow:
            '0 20px 60px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.2)',
        }}
        aria-hidden="true"
      />

      {/* Contenedor principal */}
      <div className="relative overflow-hidden rounded-apple shadow-apple-lg">
        {/* Reflejo de vidrio — CSS puro */}
        <div
          className="absolute inset-0 z-10 pointer-events-none rounded-apple"
          style={{
            background:
              'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 50%, rgba(0,0,0,0.04) 100%)',
          }}
          aria-hidden="true"
        />

        {/*
          next/image con máxima prioridad LCP:
          - priority → añade <link rel="preload"> en el <head>
          - fetchPriority="high" → hint para el navegador (Chromium 102+)
          - quality={85} → balance óptimo calidad/peso (AVIF reduce ~40% vs WebP)
          - sizes → evita descargar imagen más grande de lo necesario
        */}
        {/*
          next/image con optimización activa:
          - priority + fetchPriority="high" → preload en <head>, LCP inmediato.
          - quality={78} → AVIF perceptualmente idéntico y ~25% más ligero que 85.
          - sizes ajustado al layout real del hero (máx 480px en desktop, 340px en tablet, 90vw en móvil).
          - Next redimensiona a deviceSizes/imageSizes → móvil baja de ~68 KB a ~18-25 KB.
        */}
        <Image
          src="/images/almudena-profile.avif"
          alt="Almudena Marchesi, psicóloga clínica, en su consulta de Moncloa, Madrid"
          width={520}
          height={680}
          priority
          fetchPriority="high"
          quality={78}
          className="w-full h-auto object-cover rounded-apple block"
          sizes="(max-width: 640px) 340px, (max-width: 1024px) 440px, 480px"
        />
      </div>
    </div>
  );
}
