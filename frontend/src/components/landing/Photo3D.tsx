'use client';


import Image from 'next/image';

type Photo3DProps = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  /** Propiedad para mantener compatibilidad, aunque ya no rote */
  maxRotation?: number;
  priority?: boolean;
};

/**
 * Tarjeta de Foto con efecto de elevación suave (Pegatina 3D).
 * Emula el comportamiento de las tarjetas del resto de la web.
 */
export default function Photo3D({
  src,
  alt,
  width = 600,
  height = 800,
  className = '',
  priority = false,
}: Photo3DProps) {
  return (
    <div className={`relative group ${className}`}>
      {/* Fondo de Cristal (Sombra y panel de profundidad fijos) */}
      <div
        className="absolute -inset-4 md:-inset-6 lg:-inset-8 rounded-[2rem] -z-10 transition-all duration-600 ease-apple opacity-80 group-hover:opacity-100 group-hover:-translate-y-1 group-hover:scale-[1.01]"
        style={{
          background: 'linear-gradient(135deg, rgba(200,217,207,0.15) 0%, rgba(232,221,208,0.12) 50%, rgba(200,217,207,0.08) 100%)',
          backdropFilter: 'blur(20px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
          border: '1px solid rgba(200,217,207,0.18)',
        }}
      />

      {/* Tarjeta Principal de la Foto que se eleva */}
      <div
        className="relative overflow-hidden rounded-apple shadow-apple-md transition-all duration-600 ease-apple group-hover:-translate-y-2 group-hover:shadow-card-hover group-hover:scale-[1.01]"
      >
        {/* Inner glass reflection base */}
        <div className="absolute inset-0 z-10 pointer-events-none rounded-apple"
          style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(0,0,0,0.05) 100%)' }}
        />
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          className="w-full h-auto object-cover rounded-apple"
          priority={priority}
          unoptimized={true}
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      </div>
    </div>
  );
}
