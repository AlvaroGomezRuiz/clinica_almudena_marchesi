import {
  CLINIC_ADDRESS_LINE1,
  CLINIC_ADDRESS_LINE2,
  CLINIC_CONTACT_EMAIL,
  getClinicGoogleMapsHref,
} from '@/lib/clinic';
import Link from 'next/link';

const FOOTER_LINKS = [
  { href: '/enfoque', label: 'Enfoque' },
  { href: '/servicios', label: 'Servicios' },
  { href: '/sobre-mi', label: 'Sobre Mí' },
  { href: '/contacto', label: 'Contacto' },
] as const;

const LEGAL_LINKS = [
  { href: '/aviso-legal', label: 'Aviso Legal' },
  { href: '/privacidad', label: 'Privacidad' },
  { href: '/cookies', label: 'Cookies' },
] as const;

export default function PublicFooter() {
  const mapsHref = getClinicGoogleMapsHref();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#141413] dark:bg-[#0A0A0A] text-white/80 w-full transition-colors duration-500">
      {/* Main Grid */}
      <div className="max-w-screen-xl mx-auto px-6 md:px-12 pt-20 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8">

          {/* Brand Column */}
          <div className="md:col-span-5 space-y-5">
            <Link href="/" className="block group active:opacity-50 hover:opacity-70 transition-opacity">
              <h3 className="font-display text-2xl text-white font-light tracking-tight group-hover:text-sage-light transition-colors">
                Almudena Marchesi
              </h3>
              <p className="font-mono text-label-sm uppercase text-white/40 mt-1">
                Psicología Clínica
              </p>
            </Link>
            <p className="font-body text-[0.9rem] text-white/50 leading-relaxed max-w-xs">
              Acompañamiento profesional basado en la evidencia y el trato humano,
              en el corazón de Moncloa, Madrid.
            </p>
          </div>

          {/* Navigation */}
          <div className="md:col-span-3">
            <h4 className="font-mono text-label-sm uppercase text-white/35 mb-5 tracking-wider">
              Navegación
            </h4>
            <nav className="flex flex-col gap-3">
              {FOOTER_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="font-body text-[0.9rem] text-white/55 hover:text-white transition-colors duration-300"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Contact */}
          <div className="md:col-span-4">
            <h4 className="font-mono text-label-sm uppercase text-white/35 mb-5 tracking-wider">
              Contacto
            </h4>
            <div className="space-y-3 font-body text-[0.9rem] text-white/55">
              <a
                href={mapsHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${CLINIC_ADDRESS_LINE1} ${CLINIC_ADDRESS_LINE2}. Ver dirección de la consulta en Google Maps.`}
                className="block hover:text-white transition-colors duration-300"
              >
                {CLINIC_ADDRESS_LINE1}
                <br />
                {CLINIC_ADDRESS_LINE2}
              </a>
              <a
                href={`mailto:${CLINIC_CONTACT_EMAIL}`}
                className="block hover:text-white transition-colors duration-300"
              >
                {CLINIC_CONTACT_EMAIL}
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-6 border-t border-white/8 flex flex-col items-center gap-4">
          <div className="flex flex-col md:flex-row justify-between items-center w-full gap-4">
            <div className="relative">
              <p aria-hidden="true" className="font-mono text-[0.65rem] text-white/30 uppercase tracking-wider">
                &copy; {currentYear} Almudena Marchesi Fernández. Psicología Clínica Moncloa, Madrid.
              </p>
              <span className="sr-only">
                &copy; {currentYear} Almudena Marchesi Fernández. Psicología Clínica Moncloa, Madrid.
              </span>
            </div>
            <div className="flex gap-6">
              {LEGAL_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="font-mono text-[0.65rem] text-white/30 uppercase tracking-wider hover:text-white/60 transition-colors duration-300 relative"
                >
                  <span aria-hidden="true">{link.label}</span>
                  <span className="sr-only">{link.label}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Developer Credit */}
          <div className="flex flex-col items-center gap-1 mt-2">
            <p className="text-[0.7rem] text-white/25 italic">
              Web Design by{' '}
              <a
                href="https://github.com/AlvaroGomezRuiz?tab=repositories"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/35 hover:text-white/60 transition-colors duration-300"
              >
                Álvaro Gómez Ruiz
              </a>
            </p>
            <p className="text-[0.6rem] text-white/20 italic">
              cont:{' '}
              <a
                href="mailto:alvarogomezz5370@gmail.com"
                className="hover:text-white/40 transition-colors duration-300"
              >
                alvarogomezz5370@gmail.com
              </a>
            </p>
          </div>

          <p className="font-mono text-[0.6rem] text-white/15 uppercase tracking-wider mt-1">
            {currentYear} | Clínica Almudena Marchesi | All Rights Reserved
          </p>
        </div>
      </div>
    </footer>
  );
}
