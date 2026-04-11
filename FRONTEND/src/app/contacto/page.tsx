import Image from 'next/image';

export default function ContactoPage() {
  return (
    <div className="bg-background text-on-surface font-body selection:bg-primary-container selection:text-on-primary-container">
      <main className="pt-32 pb-20 px-6 max-w-screen-xl mx-auto">
        {/* Hero Section */}
        <header className="mb-20 text-center max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-headline italic text-primary mb-6 leading-tight">
            Hablemos
          </h1>
          <p className="text-lg text-secondary leading-relaxed font-light">
            Un espacio de escucha y profesionalidad en el corazón de Madrid.
            Encuentra el acompañamiento clínico que necesitas para tu bienestar.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
          {/* Contact Info Column */}
          <div className="lg:col-span-5 space-y-12 order-2 lg:order-1">
            <section>
              <h2 className="font-headline text-2xl text-primary mb-8 border-l-4 border-primary-container pl-4">
                Información de Contacto
              </h2>
              <div className="space-y-6">
                {/* Sticker Style Items */}
                <div className="ghost-border p-6 bg-surface-container-lowest transition-all hover:bg-surface-container-low flex items-center gap-5">
                  <div className="bg-primary-container p-3 rounded-full flex items-center justify-center">
                    <span
                      className="material-symbols-outlined text-primary"
                      data-icon="phone"
                    >
                      phone
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-label uppercase tracking-widest text-outline mb-1">
                      Teléfono
                    </p>
                    <p className="text-lg font-medium text-on-surface">
                      +34 912 345 678
                    </p>
                  </div>
                </div>

                <div className="ghost-border p-6 bg-surface-container-lowest transition-all hover:bg-surface-container-low flex items-center gap-5">
                  <div className="bg-primary-container p-3 rounded-full flex items-center justify-center">
                    <span
                      className="material-symbols-outlined text-primary"
                      data-icon="mail"
                    >
                      mail
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-label uppercase tracking-widest text-outline mb-1">
                      Correo Electrónico
                    </p>
                    <p className="text-lg font-medium text-on-surface">
                      consulta@almudenamarchesi.com
                    </p>
                  </div>
                </div>

                <div className="ghost-border p-6 bg-surface-container-lowest transition-all hover:bg-surface-container-low flex items-center gap-5">
                  <div className="bg-primary-container p-3 rounded-full flex items-center justify-center">
                    <span
                      className="material-symbols-outlined text-primary"
                      data-icon="location_on"
                    >
                      location_on
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-label uppercase tracking-widest text-outline mb-1">
                      Dirección
                    </p>
                    <p className="text-lg font-medium text-on-surface">
                      Calle de la Princesa, Moncloa, Madrid
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Booking Advisory */}
            <aside className="bg-secondary-container/30 p-8 rounded-xl border border-secondary/10">
              <div className="flex items-start gap-4">
                <span
                  className="material-symbols-outlined text-secondary mt-1"
                  data-icon="calendar_month"
                >
                  calendar_month
                </span>
                <div>
                  <h3 className="font-headline text-lg text-on-secondary-container mb-2">
                    Reserva de Citas
                  </h3>
                  <p className="text-on-secondary-container/80 text-sm leading-relaxed mb-4">
                    Para garantizar la confidencialidad y la gestión eficiente
                    de su historial clínico, todas las reservas deben realizarse
                    a través de nuestro portal seguro.
                  </p>
                  <a
                    className="inline-flex items-center text-primary font-bold group"
                    href="/login"
                  >
                    Ir al Portal del Paciente
                    <span
                      className="material-symbols-outlined ml-2 transition-transform group-hover:translate-x-1"
                      data-icon="arrow_forward"
                    >
                      arrow_forward
                    </span>
                  </a>
                </div>
              </div>
            </aside>
          </div>

          {/* Form Column */}
          <div className="lg:col-span-7 bg-surface-container-lowest p-8 md:p-12 rounded-xl shadow-[0_20px_40px_rgba(75,100,95,0.04)] order-1 lg:order-2">
            <form className="space-y-8">
              <div className="space-y-2">
                <label
                  className="block text-sm font-medium text-outline"
                  htmlFor="name"
                >
                  Nombre completo
                </label>
                <input
                  className="w-full bg-transparent border-0 border-b-2 border-primary-fixed-dim focus:border-primary focus:ring-0 transition-all duration-300 py-3 text-on-surface"
                  id="name"
                  name="name"
                  placeholder="Escriba su nombre..."
                  type="text"
                />
              </div>
              <div className="space-y-2">
                <label
                  className="block text-sm font-medium text-outline"
                  htmlFor="email"
                >
                  Correo electrónico
                </label>
                <input
                  className="w-full bg-transparent border-0 border-b-2 border-primary-fixed-dim focus:border-primary focus:ring-0 transition-all duration-300 py-3 text-on-surface"
                  id="email"
                  name="email"
                  placeholder="su-email@ejemplo.com"
                  type="email"
                />
              </div>
              <div className="space-y-2">
                <label
                  className="block text-sm font-medium text-outline"
                  htmlFor="message"
                >
                  Mensaje o Consulta
                </label>
                <textarea
                  className="w-full bg-transparent border-0 border-b-2 border-primary-fixed-dim focus:border-primary focus:ring-0 transition-all duration-300 py-3 text-on-surface resize-none"
                  id="message"
                  name="message"
                  placeholder="¿En qué puedo ayudarle?"
                  rows={4}
                ></textarea>
              </div>
              <div className="flex items-center gap-3 py-2">
                <input
                  className="rounded border-outline-variant text-primary focus:ring-primary-container"
                  id="privacy"
                  type="checkbox"
                />
                <label
                  className="text-xs text-on-surface-variant"
                  htmlFor="privacy"
                >
                  He leído y acepto la política de privacidad y protección de
                  datos.
                </label>
              </div>
              <button
                className="w-full bg-primary text-on-primary py-4 rounded-lg font-medium hover:bg-primary-dim transition-all duration-300 flex items-center justify-center gap-2 group shadow-md shadow-primary/10"
                type="submit"
              >
                Enviar mensaje
                <span
                  className="material-symbols-outlined text-sm group-hover:translate-x-0.5 transition-transform"
                  data-icon="send"
                >
                  send
                </span>
              </button>
            </form>
          </div>
        </div>

        {/* Map Section */}
        <section className="mt-24">
          <div className="relative w-full h-[450px] rounded-2xl overflow-hidden shadow-sm ghost-border">
            <div className="absolute inset-0 bg-surface-container-high animate-pulse flex items-center justify-center">
              {/* Map Placeholder with custom alt */}
              <Image
                alt="Top-down map view of a clean minimalist urban neighborhood with soft beige and sage green color accents representing Moncloa Madrid"
                className="w-full h-full object-cover mix-blend-multiply opacity-60"
                data-alt="Top-down map view of a clean minimalist urban neighborhood with soft beige and sage green color accents representing Moncloa Madrid"
                data-location="Madrid"
                fill
                sizes="100vw"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCSlZd7S48CXatbQztIdLirVH9dg6DXuxGXqPVbu1uuL7OPT-tp048REzGEtmG0lyP_N04lRU40m-pyR9qjFLc_cmx7RbQAxpy8xI4J93lOp3uUd6Ew6dP5V41I2CiAPa9m3jrmQkV_Z8fMIYoTL1hf-7oQ3HqNOxeambaZBfmcqv0xnADPDCXT3ZFk2VKqmle7Pc6AVKXyhRiQdTXMkgaUpLsHLu7LxBDwckdHnouhA9Cc8nH1yUN0Bqd6HAnkp2g2eGNv8i86dGU"
              />
              <div className="absolute z-10 text-center">
                <div className="bg-surface-container-lowest p-6 rounded-xl shadow-xl max-w-xs mx-auto border border-primary/5">
                  <span
                    className="material-symbols-outlined text-4xl text-primary mb-3"
                    data-icon="location_on"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    location_on
                  </span>
                  <h4 className="font-headline text-lg text-primary mb-1">
                    Psicología Moncloa
                  </h4>
                  <p className="text-sm text-secondary">
                    Calle de la Princesa, 28008 Madrid
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#f4f4ef]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 px-12 py-16 max-w-screen-2xl mx-auto">
          <div className="space-y-4">
            <span className="font-serif text-lg text-[#4b645f]">
              Almudena Marchesi Fernández
            </span>
            <p className="font-['Manrope'] text-sm leading-6 tracking-wide text-stone-500 max-w-xs">
              Psicología Clínica basada en la evidencia y el trato humano.
              Madrid, Moncloa.
            </p>
          </div>
          <div className="flex flex-col space-y-3">
            <h5 className="text-on-surface font-medium text-sm mb-2">
              Navegación
            </h5>
            <a
              className="text-stone-500 hover:text-[#4b645f] transition-transform duration-300 hover:translate-x-1 text-sm"
              href="#"
            >
              Aviso Legal
            </a>
            <a
              className="text-stone-500 hover:text-[#4b645f] transition-transform duration-300 hover:translate-x-1 text-sm"
              href="#"
            >
              Privacidad
            </a>
            <a
              className="text-stone-500 hover:text-[#4b645f] transition-transform duration-300 hover:translate-x-1 text-sm"
              href="#"
            >
              Cookies
            </a>
          </div>
          <div className="space-y-4">
            <h5 className="text-on-surface font-medium text-sm mb-2">
              Ubicación
            </h5>
            <p className="text-stone-500 text-sm">
              Calle de la Princesa, Moncloa
              <br />
              28008 Madrid, España
            </p>
            <div className="flex space-x-4 pt-2">
              <span
                className="material-symbols-outlined text-primary cursor-pointer hover:scale-110 transition-transform"
                data-icon="share"
              >
                share
              </span>
              <span
                className="material-symbols-outlined text-primary cursor-pointer hover:scale-110 transition-transform"
                data-icon="forum"
              >
                forum
              </span>
            </div>
          </div>
        </div>
        <div className="px-12 py-8 text-center">
          <p className="font-['Manrope'] text-xs leading-6 tracking-wide text-stone-400">
            © 2024 Almudena Marchesi Fernández. Psicología Clínica Moncloa,
            Madrid.
          </p>
        </div>
      </footer>
    </div>
  );
}
