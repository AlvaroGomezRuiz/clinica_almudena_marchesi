import type { Metadata } from 'next';
import Image from 'next/image';

import {
  CLINIC_ADDRESS_LINE1,
  CLINIC_ADDRESS_LINE2,
  CLINIC_SESSION_DURATION_MIN,
  CLINIC_SESSION_PRICE_LABEL,
} from '@/lib/clinic';

export const metadata: Metadata = {
  title: 'Servicios | Almudena Marchesi',
};

export default function ServiciosPage() {
  return (
    <div className="bg-background font-body text-on-surface">
      <main className="pt-32 pb-24 px-6 md:px-12 max-w-screen-2xl mx-auto">
        {/* Header Hero */}
        <header className="mb-16">
          <h1 className="font-headline text-5xl md:text-7xl text-primary max-w-4xl leading-[1.1] mb-6">
            Un espacio de <span className="italic font-light">escucha</span> y
            transformación en el corazón de Moncloa.
          </h1>
          <p className="text-lg md:text-xl text-on-surface-variant max-w-2xl leading-relaxed">
            Cada proceso es único. Ofrezco diferentes modalidades de terapia
            adaptadas a tus necesidades actuales, con el rigor clínico y la
            calidez que tu bienestar requiere.
          </p>
        </header>

        {/* Services Bento-ish Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-16">
          {/* Individual Therapy */}
          <div className="md:col-span-7 bg-surface-container-low rounded-xl p-8 flex flex-col justify-between overflow-hidden relative">
            <div className="relative z-10">
              <span className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-widest mb-4">
                Adultos
              </span>
              <h2 className="font-headline text-4xl text-on-surface mb-2">
                Terapia Individual
              </h2>
              <p className="text-on-surface-variant max-w-md mb-4 leading-relaxed">
                Un espacio seguro para profundizar en el autoconocimiento,
                gestionar la ansiedad, el duelo o las dificultades relacionales
                desde un enfoque clínico integrador.
              </p>
            </div>
            <div className="sticker-card bg-surface-container-lowest p-6 w-fit rounded-lg self-end mt-2">
              <p className="text-sm font-bold text-primary mb-1">
                SESIÓN CLÍNICA
              </p>
              <p className="text-4xl font-headline text-on-surface">
                {CLINIC_SESSION_PRICE_LABEL}
                <span className="text-lg font-body font-normal text-on-surface-variant">
                  /{CLINIC_SESSION_DURATION_MIN}min
                </span>
              </p>
              <a
                className="mt-4 flex items-center gap-2 text-secondary font-bold group"
                href="/registro-paciente?plan=individual"
              >
                Reservar Cita
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </a>
            </div>
          </div>

          {/* Couple Therapy */}
          <div className="md:col-span-5 bg-secondary-container/30 rounded-xl p-8 flex flex-col justify-between">
            <div>
              <span className="inline-block px-3 py-1 bg-secondary/10 text-secondary rounded-full text-xs font-bold uppercase tracking-widest mb-4">
                Relaciones
              </span>
              <h2 className="font-headline text-4xl text-on-surface mb-2">
                Terapia de Pareja
              </h2>
              <p className="text-on-surface-variant mb-4 leading-relaxed">
                Restaurar la comunicación y el vínculo, navegando los conflictos
                desde la empatía y la responsabilidad compartida.
              </p>
            </div>
            <div className="sticker-card bg-surface-container-lowest p-6 w-full md:w-fit rounded-lg mt-2">
              <p className="text-sm font-bold text-secondary mb-1">
                SESIÓN CONJUNTA
              </p>
              <p className="text-4xl font-headline text-on-surface">
                90€
                <span className="text-lg font-body font-normal text-on-surface-variant">
                  /90min
                </span>
              </p>
              <a
                className="mt-4 flex items-center gap-2 text-primary font-bold group"
                href="/registro-paciente?plan=pareja"
              >
                Consultar disponibilidad
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
                  calendar_month
                </span>
              </a>
            </div>
          </div>

          {/* Child/Youth */}
          <div className="md:col-span-6 border-2 border-surface-container rounded-xl p-8 flex flex-col md:flex-row gap-6 items-start">
            <div className="flex-1">
              <h2 className="font-headline text-3xl text-on-surface mb-2">
                Infanto-Juvenil
              </h2>
              <p className="text-on-surface-variant mb-4 leading-relaxed">
                Acompañamiento en el desarrollo emocional de niños y
                adolescentes. Orientación a padres y trabajo terapéutico
                mediante el juego y la expresión creativa.
              </p>
              <ul className="space-y-2 mb-4">
                <li className="flex items-center gap-2 text-sm text-on-surface-variant">
                  <span
                    className="material-symbols-outlined text-primary text-lg"
                    style={{ fontVariationSettings: '"FILL" 1' }}
                  >
                    check_circle
                  </span>
                  Gestión emocional y conductual
                </li>
                <li className="flex items-center gap-2 text-sm text-on-surface-variant">
                  <span
                    className="material-symbols-outlined text-primary text-lg"
                    style={{ fontVariationSettings: '"FILL" 1' }}
                  >
                    check_circle
                  </span>
                  Dificultades de aprendizaje
                </li>
              </ul>
            </div>
            <div className="sticker-card bg-surface-container p-5 rounded-lg">
              <p className="text-2xl font-headline text-on-surface">
                {CLINIC_SESSION_PRICE_LABEL}
              </p>
              <p className="text-xs text-on-surface-variant italic">
                Sesión de {CLINIC_SESSION_DURATION_MIN} min
              </p>
            </div>
          </div>

          {/* Online Therapy */}
          <div className="md:col-span-6 bg-tertiary-container/20 rounded-xl p-8 flex flex-col justify-between border-2 border-transparent">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="material-symbols-outlined text-tertiary">
                  videocam
                </span>
                <h2 className="font-headline text-3xl text-on-surface">
                  Terapia Online
                </h2>
              </div>
              <p className="text-on-surface-variant mb-4 leading-relaxed">
                La misma calidad clínica desde la comodidad de tu hogar. Ideal
                para personas con movilidad reducida o falta de tiempo.
              </p>
            </div>
            <div className="flex justify-between items-center mt-2">
              <div className="sticker-card bg-surface-container-lowest p-5 rounded-lg">
                <p className="text-2xl font-headline text-on-surface">
                  {CLINIC_SESSION_PRICE_LABEL}
                </p>
                <p className="text-xs text-on-surface-variant uppercase font-bold tracking-tighter">
                  Plataforma Segura
                </p>
              </div>
              <a
                className="bg-tertiary text-on-tertiary px-6 py-3 rounded-xl font-bold transition-all hover:bg-tertiary-dim"
                href="/registro-paciente?plan=individual"
              >
                Agendar Online
              </a>
            </div>
          </div>
        </div>

        {/* Bonos Section */}
        <section className="bg-surface-container-low rounded-[1.5rem] p-10 md:p-16 relative overflow-hidden">
          <div className="relative z-10">
            <div className="text-center mb-10">
              <h2 className="font-headline text-4xl md:text-5xl text-primary mb-3">
                Compromiso con tu Bienestar
              </h2>
              <p className="text-on-surface-variant max-w-xl mx-auto">
                Los procesos terapéuticos requieren constancia. He diseñado
                bonos con tarifas reducidas para facilitar la continuidad.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Bono 5 */}
              <div className="sticker-card bg-surface-container-lowest p-8 rounded-2xl flex flex-col items-center text-center">
                <span className="text-secondary font-bold text-sm tracking-widest uppercase mb-2">
                  Continuidad
                </span>
                <h3 className="font-headline text-3xl mb-1">Bono 5 Sesiones</h3>
                <div className="my-4">
                  <span className="text-5xl font-headline text-on-surface">
                    275€
                  </span>
                  <p className="text-primary font-bold mt-1">Ahorra 25€</p>
                </div>
                <p className="text-on-surface-variant text-sm mb-6 leading-relaxed">
                  Válido durante 4 meses.
                  <br />
                  Aplicable a Terapia Individual y Online.
                </p>
                <a
                  className="w-full py-4 bg-primary text-on-primary rounded-xl font-bold hover:scale-[1.02] transition-transform shadow-lg shadow-primary/10 text-center"
                  href="/registro-paciente?plan=bono5"
                >
                  Adquirir Bono 5
                </a>
              </div>

              {/* Bono 10 */}
              <div className="sticker-card bg-surface-container-lowest p-8 rounded-2xl flex flex-col items-center text-center relative">
                <span className="text-secondary font-bold text-sm tracking-widest uppercase mb-2">
                  Transformación
                </span>
                <h3 className="font-headline text-3xl mb-1">
                  Bono 10 Sesiones
                </h3>
                <div className="my-4">
                  <span className="text-5xl font-headline text-on-surface">
                    530€
                  </span>
                  <p className="text-primary font-bold mt-1">Ahorra 70€</p>
                </div>
                <p className="text-on-surface-variant text-sm mb-6 leading-relaxed">
                  Válido durante 8 meses.
                  <br />
                  Aplicable a Terapia Individual y Online.
                </p>
                <a
                  className="w-full py-4 bg-on-surface text-surface-container-lowest rounded-xl font-bold hover:scale-[1.02] transition-transform shadow-xl text-center"
                  href="/registro-paciente?plan=bono10"
                >
                  Adquirir Bono 10
                </a>
              </div>
            </div>
          </div>

          {/* Aesthetic Decoration */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
        </section>

        {/* CTA Section */}
        <section className="mt-20 text-center">
          <Image
            alt="Retrato de Almudena Marchesi"
            className="w-20 h-20 rounded-full mx-auto mb-6 grayscale hover:grayscale-0 transition-all duration-700 object-cover border-4 border-white shadow-xl"
            height={80}
            sizes="80px"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDGSy0U40RTUNHunMSabFIHkQA1Jx8xBwx_7tD8LVYUBqzdClLmmrjAy1Pd9_kn_wB23zOPZJJvZ2-rirkHU0eDjO8UflhrxXwE2Vu6Nh7tRctfX-hzTs4YV7SppZoVcjhfyjrzSwEwz4Jgow9gONRBfoX_flADdVZvJGFVajlSy6KQtdXNlSQLwS8qMk7VgRNQq7gaewTQ37xzB9QsSSnTDHQjj-kr_CW6MW9dfTSeglHPkjUeSmkLobeSUREC0SCeKKBHmPbEgtE"
            width={80}
          />
          <h2 className="font-headline text-3xl text-on-surface mb-4 italic">
            ¿No sabes qué modalidad es la mejor para ti?
          </h2>
          <p className="text-on-surface-variant mb-8 max-w-lg mx-auto">
            Escríbeme sin compromiso y valoraremos juntos tu caso para encontrar
            el camino que mejor se adapte a tu situación.
          </p>
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <a
              className="px-8 py-3.5 bg-primary text-on-primary rounded-full font-bold flex items-center justify-center gap-2"
              href="/contacto"
            >
              <span className="material-symbols-outlined text-xl">mail</span>
              Contactar ahora
            </a>
            <a
              className="px-8 py-3.5 border-2 border-primary text-primary rounded-full font-bold hover:bg-primary/5 transition-colors"
              href="/agenda"
            >
              Ver agenda disponible
            </a>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#f4f4ef] dark:bg-stone-950 w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 px-12 py-16 max-w-screen-2xl mx-auto font-['Manrope'] text-sm leading-6 tracking-wide dark:text-stone-400">
          <div className="space-y-6">
            <span className="font-serif text-lg text-[#4b645f] dark:text-emerald-500">
              Almudena Marchesi
            </span>
            <p className="text-stone-500 max-w-xs">
              Psicología Clínica basada en la evidencia y el respeto profundo al
              proceso individual.
            </p>
            <div className="flex gap-4">
              <span className="material-symbols-outlined text-primary cursor-pointer hover:scale-110 transition-transform">
                brand_awareness
              </span>
              <span className="material-symbols-outlined text-primary cursor-pointer hover:scale-110 transition-transform">
                psychology
              </span>
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="font-bold text-[#6a5d4e] uppercase tracking-widest text-xs mb-6">
              Información
            </h4>
            <nav className="flex flex-col space-y-3">
              <a
                className="text-stone-500 hover:text-[#4b645f] hover:translate-x-1 transition-transform duration-300"
                href="#"
              >
                Aviso Legal
              </a>
              <a
                className="text-stone-500 hover:text-[#4b645f] hover:translate-x-1 transition-transform duration-300"
                href="#"
              >
                Privacidad
              </a>
              <a
                className="text-stone-500 hover:text-[#4b645f] hover:translate-x-1 transition-transform duration-300"
                href="#"
              >
                Cookies
              </a>
              <a
                className="text-stone-500 hover:text-[#4b645f] hover:translate-x-1 transition-transform duration-300"
                href="#"
              >
                {CLINIC_ADDRESS_LINE1}
              </a>
            </nav>
          </div>
          <div className="space-y-6">
            <h4 className="font-bold text-[#6a5d4e] uppercase tracking-widest text-xs mb-6">
              Contacto Directo
            </h4>
            <p className="text-stone-500">
              {CLINIC_ADDRESS_LINE1}
              <br />
              {CLINIC_ADDRESS_LINE2}
              <br />
              +34 91 000 00 00
              <br />
              hola@almudena-psicologia.com
            </p>
            <p className="text-[10px] text-stone-400 pt-8 italic">
              © 2024 Almudena Marchesi Fernández. Psicología Clínica Moncloa,
              Madrid.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
