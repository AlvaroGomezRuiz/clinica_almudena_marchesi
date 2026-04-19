import Image from 'next/image';
import Link from 'next/link';
import ScrollReveal from '@/components/public/ScrollReveal';
import {
  CLINIC_ADDRESS,
  getClinicGoogleMapsHref,
} from '@/lib/clinic';

export default function MoncloaSection() {
  const mapsHref = getClinicGoogleMapsHref();

  return (
    <section
      className="py-20 md:py-32 px-6 md:px-12 bg-canvas-sage dark:bg-canvas-alt transition-colors duration-500"
      aria-label="Ubicación de la consulta en Moncloa, Madrid"
    >
      <div className="max-w-screen-xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        <ScrollReveal>
          <div className="rounded-apple overflow-hidden shadow-apple-lg">
            <Link
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                alt="Arco de la Victoria en Moncloa, Madrid, monumento neoclásico junto a la consulta de psicología"
                className="w-full h-[350px] lg:h-[420px] object-cover transition-transform duration-700 hover:scale-105"
                height={420}
                sizes="(min-width: 1024px) 50vw, 100vw"
                src="/images/moncloa.jpg"
                width={800}
              />
            </Link>
          </div>
        </ScrollReveal>
        <ScrollReveal delay={0.1}>
          <div className="space-y-6">
            <h2 className="font-display text-display-3 text-ink">
              En el corazón de Moncloa
            </h2>
            <p className="text-body-lg text-ink-soft leading-relaxed text-pretty">
              Un espacio diseñado para la introspección y la calma, en una de
              las zonas más accesibles y tranquilas de Madrid.
            </p>
            <div className="glass-card dark:glass-card-dark p-6 flex items-start gap-4">
              <span className="material-symbols-outlined text-sage dark:text-sage-light text-2xl mt-0.5" aria-hidden="true">location_on</span>
              <div className="select-text">
                <p className="font-body font-medium text-ink text-sm select-text">{CLINIC_ADDRESS}</p>
                <p className="font-mono text-label-sm text-ink-muted mt-1 select-text">Metro Argüelles · Moncloa</p>
              </div>
            </div>
            <Link
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-flex"
            >
              Cómo llegar
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
