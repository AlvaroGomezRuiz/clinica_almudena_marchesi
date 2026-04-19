import Link from 'next/link';
import {
  CLINIC_ADDRESS_LINE1,
  CLINIC_ADDRESS_LINE2,
  getClinicGoogleMapsHref,
} from '@/lib/clinic';

const FOOTER_LINKS = [
  { href: '/enfoque', label: 'Enfoque' },
  { href: '/servicios', label: 'Servicios' },
  { href: '/sobre-mi', label: 'Sobre Mí' },
  { href: '/contacto', label: 'Contacto' },
] as const;

const LEGAL_LINKS = [
  { href: '#', label: 'Aviso Legal' },
  { href: '#', label: 'Privacidad' },
  { href: '#', label: 'Cookies' },
] as const;

export default function PublicFooter() {
  const mapsHref = getClinicGoogleMapsHref();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-ink text-white/80 w-full">
      {/* Main Grid */}
      <div className="max-w-screen-xl mx-auto px-6 md:px-12 pt-20 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8">

          {/* Brand Column */}
          <div className="md:col-span-5 space-y-5">
            <div>
              <h3 className="font-display text-2xl text-white font-light tracking-tight">
                Almudena Marchesi
              </h3>
              <p className="font-mono text-label-sm uppercase text-white/40 mt-1">
                Psicología Clínica
              </p>
            </div>
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
                className="block hover:text-white transition-colors duration-300"
              >
                {CLINIC_ADDRESS_LINE1}
                <br />
                {CLINIC_ADDRESS_LINE2}
              </a>
              <a
                href="mailto:info@almudenamarchesi.es"
                className="block hover:text-white transition-colors duration-300"
              >
                info@almudenamarchesi.es
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-6 border-t border-white/8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="font-mono text-[0.65rem] text-white/30 uppercase tracking-wider">
            &copy; {currentYear} Almudena Marchesi Fernández. Psicología Clínica Moncloa, Madrid.
          </p>
          <div className="flex gap-6">
            {LEGAL_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="font-mono text-[0.65rem] text-white/30 uppercase tracking-wider hover:text-white/60 transition-colors duration-300"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
