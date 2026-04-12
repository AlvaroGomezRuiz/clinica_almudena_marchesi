import type { Metadata } from 'next';
import Image from 'next/image';

import {
  CLINIC_ADDRESS_LINE1,
  CLINIC_ADDRESS_LINE2,
  getClinicGoogleMapsHref,
} from '@/lib/clinic';

export const metadata: Metadata = {
  title: 'Almudena Marchesi | Psicología Clínica Madrid',
};

export default function HomePage() {
  return (
    <div className="bg-background text-on-background font-body selection:bg-primary-container selection:text-on-primary-container">
      {/* Hero Section */}
      <header className="relative min-h-screen flex items-center pt-24 px-6 md:px-12 overflow-hidden bg-surface">
        <div className="max-w-screen-2xl mx-auto w-full grid md:grid-cols-2 gap-12 items-center">
          <div className="z-10 order-2 md:order-1">
            <span className="inline-block px-4 py-1 border border-primary/20 rounded-full text-xs font-label uppercase tracking-widest text-primary mb-6">
              Psicología Clínica
            </span>
            <h1 className="font-headline text-5xl md:text-7xl lg:text-8xl text-on-background leading-[1.1] mb-8 tracking-tighter italic">
              Un espacio donde <span className="font-bold not-italic">ser</span>
              , sin ser juzgado.
            </h1>
            <p className="text-lg md:text-xl text-on-surface-variant max-w-lg mb-10 leading-relaxed">
              Acompañamiento profesional en el corazón de Moncloa. Una
              invitación a la pausa, al entendimiento y a la reconstrucción
              propia.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                className="bg-primary text-on-primary px-8 py-4 rounded-xl font-label font-bold text-center hover:shadow-lg transition-all transform hover:-translate-y-1"
                href="/registro-paciente"
              >
                Reserva tu primera cita
              </a>
              <a
                className="border border-outline-variant text-on-background px-8 py-4 rounded-xl font-label font-bold text-center hover:bg-surface-container transition-all"
                href="/enfoque"
              >
                Conoce mi enfoque
              </a>
            </div>
          </div>
          <div className="relative order-1 md:order-2">
            <div className="aspect-[4/5] rounded-[2rem] overflow-hidden shadow-2xl relative z-10 transform md:rotate-2">
              <Image
                alt="Professional psychologist in a warm minimalist office with soft natural light, linen textures, and calm atmosphere, high-end editorial style"
                className="w-full h-full object-cover"
                data-alt="Professional psychologist in a warm minimalist office with soft natural light, linen textures, and calm atmosphere, high-end editorial style"
                fill
                priority
                sizes="(min-width: 768px) 50vw, 100vw"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAEqpbz4F4ShrQ-O9Ie_Vu79dqBPtWMR_1NmWTFmctitMXVBEuFp8ByIQASPhkkEuZQKXLEBZUHrXMiBE4DY2D6ot8mp8SbG2UNj0X-_t425Jvw0JWQR4CrcxmxdBfaGIDJb6R3mySXmv-CP-uXqEpFJbcKpU761uAjBo-kthIfwjy2qebosacxtG68xPwGor_xrlMYyrHNkoQ-lgJZwVbyz-6gnm4OkLH0BEIZ2hOfWw2v_d4yOIUi2xvY3qnmp_CoVne2nXWF_jg"
              />
            </div>
            {/* Decorative element */}
            <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-primary-container/30 rounded-full blur-3xl -z-0"></div>
            <div className="absolute -top-10 -right-10 w-48 h-48 bg-secondary-container/20 rounded-full blur-2xl -z-0"></div>
          </div>
        </div>
      </header>

      {/* Propuesta de Valor (Stickers Section) */}
      <section
        className="py-24 md:py-32 px-6 md:px-12 bg-surface-container-low relative overflow-hidden"
        id="enfoque"
      >
        <div className="max-w-screen-2xl mx-auto">
          <div className="mb-20">
            <h2 className="font-headline text-3xl md:text-5xl text-on-background mb-4">
              El rigor de la clínica,
              <br />
              la calidez de lo humano.
            </h2>
            <div className="w-24 h-1 bg-primary/30"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {/* Sticker 1 */}
            <div className="sticker-card bg-surface-container-lowest p-10 rounded-lg flex flex-col gap-6 transform hover:-rotate-1 transition-transform">
              <div className="w-14 h-14 bg-primary-container rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-on-primary-container text-3xl">
                  psychology
                </span>
              </div>
              <h3 className="font-headline text-2xl font-bold">
                Escucha Activa
              </h3>
              <p className="text-on-surface-variant leading-relaxed">
                Más allá de las palabras. Un silencio fértil donde cada matiz de
                tu historia encuentra su lugar y significado.
              </p>
            </div>
            {/* Sticker 2 */}
            <div className="sticker-card bg-surface-container-lowest p-10 rounded-lg flex flex-col gap-6 transform hover:rotate-2 transition-transform">
              <div className="w-14 h-14 bg-secondary-container rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-on-secondary-container text-3xl">
                  volunteer_activism
                </span>
              </div>
              <h3 className="font-headline text-2xl font-bold">Sin Juicio</h3>
              <p className="text-on-surface-variant leading-relaxed">
                Un búnker de seguridad emocional. Tu vulnerabilidad es respetada
                como la herramienta más potente de cambio.
              </p>
            </div>
            {/* Sticker 3 */}
            <div className="sticker-card bg-surface-container-lowest p-10 rounded-lg flex flex-col gap-6 transform hover:-rotate-2 transition-transform">
              <div className="w-14 h-14 bg-tertiary-container rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-on-tertiary-container text-3xl">
                  auto_awesome
                </span>
              </div>
              <h3 className="font-headline text-2xl font-bold">Ayuda Real</h3>
              <p className="text-on-surface-variant leading-relaxed">
                Estrategias clínicas basadas en evidencia. No solo entender el
                porqué, sino construir el cómo hacia tu bienestar.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Moncloa Section (Presencialidad) */}
      <section className="py-24 md:py-32 px-6 md:px-12 bg-surface">
        <div className="max-w-screen-2xl mx-auto grid md:grid-cols-12 gap-12 items-center">
          <a
            className="md:col-span-7 rounded-[2rem] overflow-hidden h-[400px] md:h-[600px] group relative"
            href={getClinicGoogleMapsHref()}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              alt="Modern minimalist building exterior in Madrid Moncloa area, dusk light, editorial architecture photography style"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              data-alt="Modern minimalist building exterior in Madrid Moncloa area, dusk light, editorial architecture photography style"
              fill
              sizes="(min-width: 768px) 60vw, 100vw"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuB7jr9o_hflr4s2VnNGw6dWSqhqByTuXakJyXkMVyaU9rFYkTcO9cDERZIwZe5axAzGfD9cbyxmLjUVSp1UQJGGweoFEtMYkFd8GN9n2hU7rX-Q1USGSWya4hyW7aml5E3-I_mpvWrRqrGJE0TLDpCmU33rS3E8KlWCp5cWgFDyX4QeBcAuUW-AhTJEVABTpG2V9C5TOjGNmLapfxl4UvXeCkqbPI1FIlLeCOOOytVrGj8vxTFNU5zrS6To4Jm70QQu2OEN_G4KxTA"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-on-background/40 to-transparent"></div>
            <div className="absolute bottom-8 left-8 text-white">
              <p className="font-label text-sm uppercase tracking-widest opacity-80">
                Ubicación Premium
              </p>
              <p className="font-headline text-2xl">{CLINIC_ADDRESS_LINE1}</p>
            </div>
          </a>
          <div className="md:col-span-5 md:pl-8">
            <h2 className="font-headline text-4xl md:text-5xl text-on-background mb-8 leading-tight">
              Presencialidad en el centro de Madrid.
            </h2>
            <p className="text-lg text-on-surface-variant mb-8 leading-relaxed">
              El entorno influye en el proceso. Mi despacho en Moncloa está
              diseñado como un santuario urbano: techos altos, luz natural y un
              silencio absoluto en medio del bullicio de la capital.
            </p>
            <ul className="space-y-4 mb-10">
              <li className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">
                  check_circle
                </span>
                <span className="text-on-surface">
                  Excelente comunicación (Metro Moncloa/Argüelles)
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">
                  check_circle
                </span>
                <span className="text-on-surface">
                  Entorno discreto y profesional
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">
                  check_circle
                </span>
                <span className="text-on-surface">
                  Flexibilidad horaria presencial
                </span>
              </li>
            </ul>
            <a
              className="inline-flex items-center gap-2 font-label font-bold text-primary group"
              href={getClinicGoogleMapsHref()}
              target="_blank"
              rel="noopener noreferrer"
            >
              Ver en Google Maps
              <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* Portal del Paciente (The Bunker) */}
      <section
        className="py-24 md:py-32 px-6 md:px-12 bg-secondary/5 relative"
        id="portal"
      >
        <div className="max-w-4xl mx-auto text-center">
          <span
            className="material-symbols-outlined text-6xl text-primary mb-8"
            data-weight="fill"
          >
            verified_user
          </span>
          <h2 className="font-headline text-4xl md:text-6xl text-on-background mb-8 italic">
            Tu búnker digital seguro.
          </h2>
          <p className="text-xl text-on-surface-variant mb-8 leading-relaxed">
            Para garantizar la máxima confidencialidad y una gestión eficiente
            de tu proceso, utilizamos un **Portal del Paciente** cifrado. El
            registro es el primer paso obligatorio para acceder a mi agenda y
            gestionar tus sesiones.
          </p>
          {/* Image 150 content: Military Grade Encryption and Exclusive Access markers */}
          <div className="flex flex-col items-center gap-4 mb-12">
            <div className="flex items-center gap-4 text-on-surface-variant">
              <span className="material-symbols-outlined text-primary">
                verified
              </span>
              <p className="text-left font-body">
                Encriptación de grado militar simplificada para tu paz mental.
              </p>
            </div>
            <div className="flex items-center gap-4 text-on-surface-variant">
              <span className="material-symbols-outlined text-primary">
                lock
              </span>
              <p className="text-left font-body">
                Acceso exclusivo y privado a tu historial personal.
              </p>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-6 mb-12 text-left">
            <div className="bg-surface p-6 rounded-xl border border-outline-variant/20">
              <div className="text-primary font-bold text-3xl mb-2">01.</div>
              <p className="font-bold mb-1">Registro Inicial</p>
              <p className="text-sm text-on-surface-variant">
                Crea tu perfil con tus datos básicos de contacto.
              </p>
            </div>
            <div className="bg-surface p-6 rounded-xl border border-outline-variant/20">
              <div className="text-primary font-bold text-3xl mb-2">02.</div>
              <p className="font-bold mb-1">Reserva Directa</p>
              <p className="text-sm text-on-surface-variant">
                Accede a las horas disponibles y elige la que mejor te encaje.
              </p>
            </div>
            <div className="bg-surface p-6 rounded-xl border border-outline-variant/20">
              <div className="text-primary font-bold text-3xl mb-2">03.</div>
              <p className="font-bold mb-1">Control Total</p>
              <p className="text-sm text-on-surface-variant">
                Facturas, recordatorios y gestión de citas en un solo lugar.
              </p>
            </div>
          </div>
          {/* Image 151 content: Registro Obligatorio Info Box */}
          <div className="max-w-2xl mx-auto mb-12 p-6 bg-surface-container-high rounded-xl flex gap-4 text-left border-l-4 border-primary">
            <span className="material-symbols-outlined text-primary text-3xl shrink-0">
              info
            </span>
            <div>
              <p className="font-bold text-on-surface mb-1">
                Registro Obligatorio
              </p>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Para garantizar la confidencialidad y gestionar tus citas, es
                necesario crear una cuenta de acceso privada antes de cualquier
                reserva.
              </p>
            </div>
          </div>
          <a
            className="bg-on-background text-surface px-12 py-5 rounded-full font-label font-bold text-lg hover:bg-primary transition-all flex items-center gap-3 mx-auto"
            href="/login"
          >
            Acceder al Portal del Paciente
            <span className="material-symbols-outlined">login</span>
          </a>
          <p className="mt-6 text-sm text-on-surface-variant italic">
            Cumplimiento estricto de RGPD y LOPD.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-6 md:px-12 bg-primary text-on-primary text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-headline text-5xl md:text-7xl mb-10 leading-tight">
            Inicia tu camino.
          </h2>
          <p className="text-xl opacity-90 mb-12">
            <span
              style={{
                color: 'rgb(205, 232, 226)',
                fontFamily: 'Manrope, sans-serif',
              }}
            >
              Dar el primer paso es el acto de valentía más grande que puedes
              hacer por ti mismo, n
            </span>
            o tienes que hacerlo solo. Estoy aquí para acompañarte en cada paso
            hacia tu equilibrio.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <a
              className="bg-on-primary text-primary px-10 py-5 rounded-xl font-label font-extrabold text-xl hover:scale-105 transition-transform"
              href="/contacto"
            >
              Solicitar información
            </a>
            <a
              className="border-2 border-on-primary text-on-primary px-10 py-5 rounded-xl font-label font-bold text-xl hover:bg-on-primary/10 transition-all"
              href="/contacto"
            >
              Enviar un correo
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full bg-[#f4f4ef] dark:bg-stone-900">
        {/* Image 152 content: Location and Direct Contact */}
        <div className="max-w-screen-2xl mx-auto px-6 md:px-12 pt-16 pb-8 grid md:grid-cols-2 gap-12">
          <div className="flex flex-col gap-4">
            <p className="font-label text-xs uppercase tracking-widest text-on-surface-variant opacity-70">
              Ubicación
            </p>
            <p className="font-headline text-xl text-on-surface italic">
              {CLINIC_ADDRESS_LINE1}
              <br />
              {CLINIC_ADDRESS_LINE2}
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <p className="font-label text-xs uppercase tracking-widest text-on-surface-variant opacity-70">
              Contacto Directo
            </p>
            <p className="font-headline text-xl text-on-surface italic">
              info@almudenamarchesi.es
              <br />
              +34 912 345 678
            </p>
          </div>
        </div>
        <div className="flex flex-col md:flex-row justify-between items-center px-6 md:px-12 py-12 gap-8 max-w-screen-2xl mx-auto font-['Manrope'] text-sm leading-relaxed text-[#4b645f] dark:text-emerald-200">
          <div className="flex flex-col gap-4 text-center md:text-left">
            <div className="font-serif text-lg text-[#4b645f] dark:text-emerald-100">
              Almudena Marchesi
            </div>
            <p className="max-w-xs text-[#6a5d4e]/80 dark:text-stone-500">
              © 2024 Almudena Marchesi Fernández. Licenciada en Psicología.
              Psicología Clínica. Madrid.
            </p>
          </div>
          <div className="flex gap-8 flex-wrap justify-center">
            <a
              className="text-[#6a5d4e]/80 dark:text-stone-500 hover:text-[#4b645f] dark:hover:text-emerald-100 transition-all"
              href="#"
            >
              Aviso Legal
            </a>
            <a
              className="text-[#6a5d4e]/80 dark:text-stone-500 hover:text-[#4b645f] dark:hover:text-emerald-100 transition-all"
              href="#"
            >
              Privacidad
            </a>
            <a
              className="text-[#6a5d4e]/80 dark:text-stone-500 hover:text-[#4b645f] dark:hover:text-emerald-100 transition-all"
              href="#"
            >
              Cookies
            </a>
            <span className="text-[#6a5d4e]/80 dark:text-stone-500 border border-primary/20 px-3 py-1 rounded-full">
              Colegiada M-XXXXX
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
