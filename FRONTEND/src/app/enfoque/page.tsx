import type { Metadata } from 'next';
import Image from 'next/image';

import { CLINIC_ADDRESS } from '@/lib/clinic';

export const metadata: Metadata = {
  title: 'Enfoque | Almudena Marchesi',
};

export default function EnfoquePage() {
  return (
    <div className="bg-background text-on-background">
      <main className="pt-24 pb-16 overflow-x-hidden">
        {/* Hero Section: Editorial Minimalism */}
        <section className="max-w-screen-2xl mx-auto px-12 mb-16">
          <div className="flex flex-col lg:flex-row gap-12 items-center">
            <div className="lg:w-2/3">
              <span className="text-sm font-label uppercase tracking-[0.2em] text-secondary mb-4 block">
                Metodología
              </span>
              <h1 className="text-5xl md:text-7xl font-serif leading-[1.1] text-primary tracking-tighter mb-8">
                La calidez de lo <span className="italic">humano</span> y el
                rigor de la <span className="italic">clínica</span>.
              </h1>
              <p className="text-lg md:text-xl font-body text-on-surface-variant max-w-2xl leading-relaxed">
                Un espacio donde la excelencia profesional se encuentra con la
                sensibilidad empática, creando un entorno seguro para la
                transformación personal.
              </p>
            </div>
            <div className="lg:w-1/3 w-full">
              <div className="sticker-border p-2 bg-white shadow-lg">
                <Image
                  alt="Close-up portrait of a professional woman with a warm, empathetic expression in a bright, sunlit modern clinical office"
                  className="w-full h-[450px] object-cover grayscale hover:grayscale-0 transition-all duration-700"
                  data-alt="Close-up portrait of a professional woman with a warm, empathetic expression in a bright, sunlit modern clinical office"
                  height={450}
                  priority
                  sizes="(min-width: 1024px) 33vw, 100vw"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBTMiQHYUoJ-Kr219V3gQgXCrui4FcoHVzBnxNzWNny7U9YjuFAqocVRdTZM-tYRYXKAATzR0L_agPUd7jGyLl0PrYh21fl_Ge1jaTFTJJwTNbXFwA6QlPf6_IraA1FWWJYfB10IC9PRxcYiRij2scA0by3Yp8tGFn6QV1xwlDcvZqTdU3AcbHcCSL7UQE0-PhKO7SB2uvufqSA3WciQId99EVVr5F61H4eYzty04BJD2589jJ7zKUlhyexaIXnwQkxdvjoei7mvT8"
                  width={600}
                />
              </div>
            </div>
          </div>
        </section>

        {/* The "Sticker" Bento Section: Methodology */}
        <section className="max-w-screen-2xl mx-auto px-12 mb-16">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Large Feature Card */}
            <div className="md:col-span-7 sticker-border p-10 bg-white flex flex-col justify-between transition-transform duration-500">
              <div>
                <h2 className="text-3xl font-serif text-primary mb-6">
                  Escucha Activa
                </h2>
                <p className="text-lg text-on-surface-variant leading-relaxed mb-6">
                  No es solo oír, es comprender el silencio entre las palabras.
                  Mi enfoque se centra en una presencia plena donde cada síntoma
                  y cada vivencia son validados como parte fundamental de tu
                  historia única.
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-4xl text-primary">
                  hearing
                </span>
                <div className="h-px flex-grow bg-primary/20"></div>
              </div>
            </div>

            {/* Secondary Card */}
            <div className="md:col-span-5 sticker-border-secondary p-10 bg-secondary-container/30 transition-transform duration-500">
              <h3 className="text-2xl font-serif text-secondary mb-4">
                Ausencia de Juicio
              </h3>
              <p className="text-md text-on-secondary-container leading-relaxed">
                La terapia es el único lugar donde no necesitas ser
                &quot;adecuado&quot;. Aquí, la neutralidad clínica se traduce en
                una aceptación incondicional que permite explorar lo más
                profundo sin miedo a la crítica.
              </p>
              <div className="mt-8 opacity-40">
                <span className="material-symbols-outlined text-7xl text-secondary">
                  verified_user
                </span>
              </div>
            </div>

            {/* Small Editorial Card */}
            <div className="md:col-span-4 sticker-border p-8 bg-primary/5 transition-transform duration-500">
              <div className="font-serif italic text-xl text-primary mb-3">
                &quot;El rigor es el respeto al paciente.&quot;
              </div>
              <p className="text-sm font-label text-on-primary-container">
                Especialización en Psicología Clínica para garantizar
                intervenciones basadas en la evidencia.
              </p>
            </div>

            {/* Abstract Visual Card */}
            <div className="md:col-span-8 sticker-border-secondary overflow-hidden h-64 md:h-80">
              <Image
                alt="Minimalist interior design detail with soft natural shadows on a warm off-white wall and a simple green plant"
                className="w-full h-full object-cover"
                data-alt="Minimalist interior design detail with soft natural shadows on a warm off-white wall and a simple green plant"
                height={800}
                sizes="100vw"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCNfaKKhKiw7ByTO9xw2eJXx1gh3ZMYa3UqP-3xMt93nMjNI_w8YX3kkSCVfsaC-MHBJMS9kejGnvGHA2ga9_fgPTmZP2iHa6ziT_n_2ZrDL8lEUmIK6ZbmV5Z7ja9XAvxZ9oQyElBLdfldWNhA_5jj_VwXfhQf9aO3i7sIsCt1Mm_DrO55eEAwnwHOkKIii_Kd1ScbJnQ1ARLc6gecW4f36LCYjl9mbwg9KOKTLAeVs5JYdxut_Kqq2EP5O1xau31MBS6fpQu1hoQ"
                width={1200}
              />
            </div>
          </div>
        </section>

        {/* Narrative Section: The Philosophy */}
        <section className="bg-surface-container-low py-20">
          <div className="max-w-4xl mx-auto px-12 text-center">
            <h2 className="text-4xl font-serif text-primary mb-10 italic leading-tight">
              Un puente entre la ciencia y la sensibilidad
            </h2>
            <div className="space-y-6 text-lg text-on-surface-variant font-body leading-relaxed text-left md:text-justify">
              <p>
                Mi metodología no se limita a la aplicación de técnicas; es un
                proceso artesanal de acompañamiento. Entiendo la clínica no como
                un frío diagnóstico, sino como la herramienta que nos permite
                dar estructura y solución al sufrimiento humano.
              </p>
              <p>
                Ubicada en el corazón de Moncloa, mi consulta está diseñada para
                ser ese refugio urbano donde el ruido exterior cesa, permitiendo
                que emerja tu propia voz. Un enfoque integrador donde el rigor
                académico de la Psicología Clínica se pone al servicio de tu
                bienestar emocional.
              </p>
            </div>
            <div className="mt-12 flex justify-center gap-12">
              <div className="flex flex-col items-center">
                <span className="text-3xl font-serif text-primary mb-1">
                  15+
                </span>
                <span className="text-[10px] uppercase tracking-widest text-secondary font-bold">
                  Años de Experiencia
                </span>
              </div>
              <div className="w-px h-10 bg-outline-variant/30"></div>
              <div className="flex flex-col items-center">
                <span className="text-3xl font-serif text-primary mb-1">∞</span>
                <span className="text-[10px] uppercase tracking-widest text-secondary font-bold">
                  Compromiso Ético
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="max-w-screen-2xl mx-auto px-12 mt-16">
          <div className="bg-primary p-12 sticker-border flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-white max-w-xl text-center md:text-left">
              <h2 className="text-3xl font-serif mb-4">
                Comienza tu proceso hoy mismo
              </h2>
              <p className="text-on-primary/80 text-lg">
                Reserva una sesión inicial para explorar cómo este enfoque puede
                ayudarte en tu momento actual.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              <a
                className="bg-surface-bright text-primary px-8 py-3.5 rounded-sticker font-bold text-lg hover:bg-primary-fixed transition-colors text-center"
                href="/registro-paciente"
              >
                Pedir Cita
              </a>
              <a
                className="border-2 border-white/30 text-white px-8 py-3.5 rounded-sticker font-bold text-lg hover:bg-white/10 transition-colors text-center"
                href="/sobre-mi"
              >
                Saber más
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#f4f4ef] w-full rounded-t-[5px]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 px-12 py-12 max-w-screen-2xl mx-auto">
          <div className="space-y-4">
            <span className="font-serif text-lg text-[#4b645f]">
              Almudena Marchesi Fernández
            </span>
            <p className="font-['Manrope'] text-sm leading-6 tracking-wide text-stone-500">
              Psicología Clínica de alta especialización en un entorno de máxima
              confidencialidad y calma.
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="font-bold text-xs uppercase tracking-widest text-primary">
              Contacto
            </h4>
            <div className="flex flex-col gap-2">
              <a
                className="text-stone-500 hover:text-[#4b645f] transition-transform hover:translate-x-1 duration-300 text-sm"
                href="#"
              >
                {CLINIC_ADDRESS}
              </a>
              <a
                className="text-stone-500 hover:text-[#4b645f] transition-transform hover:translate-x-1 duration-300 text-sm"
                href="mailto:info@almudenamarchesi.es"
              >
                info@almudenamarchesi.es
              </a>
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="font-bold text-xs uppercase tracking-widest text-primary">
              Legal
            </h4>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <a
                className="text-stone-500 hover:text-[#4b645f] transition-transform hover:translate-x-1 duration-300 text-sm"
                href="#"
              >
                Aviso Legal
              </a>
              <a
                className="text-stone-500 hover:text-[#4b645f] transition-transform hover:translate-x-1 duration-300 text-sm"
                href="#"
              >
                Privacidad
              </a>
              <a
                className="text-stone-500 hover:text-[#4b645f] transition-transform hover:translate-x-1 duration-300 text-sm"
                href="#"
              >
                Cookies
              </a>
            </div>
          </div>
        </div>
        <div className="px-12 py-6 max-w-screen-2xl mx-auto text-center md:text-left">
          <p className="font-['Manrope'] text-xs text-stone-400">
            © 2024 Almudena Marchesi Fernández. Psicología Clínica Moncloa,
            Madrid.
          </p>
        </div>
      </footer>
    </div>
  );
}
